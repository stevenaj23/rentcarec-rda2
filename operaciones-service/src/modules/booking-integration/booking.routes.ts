import { Router, Request, Response, NextFunction } from 'express';
import { ReservaRepository }  from '../reservas/reserva.repository.js';
import { AlquilerRepository } from '../alquileres/alquiler.repository.js';
import prisma from '../../shared/database/prisma.js';
import { getInventarioClient, InventarioUnavailableError } from '../../grpc/inventario.grpc-client.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

type VehiculoData = { id: string; status: string; precio_dia: number; agencia_id: string; placa: string };

// Retorna null si el vehículo no existe.
// Intenta primero gRPC; si el circuit breaker está abierto cae a HTTP.
async function fetchVehiculo(vehiculoId: string): Promise<VehiculoData | null> {
  // ── Intento 1: gRPC ───────────────────────────────────────────────────────
  try {
    const result = await getInventarioClient().getVehiculo(vehiculoId);
    if (!result.found) return null;
    return result;
  } catch (err) {
    if (!(err instanceof InventarioUnavailableError)) throw err;
    // gRPC no disponible — continuar con fallback HTTP
  }

  // ── Intento 2: HTTP fallback (cuando gRPC está caído) ────────────────────
  const base = process.env['INVENTARIO_SERVICE_URL'] ?? 'http://rentcar-inventario';
  try {
    const res = await fetch(`${base}/api/v1/stevenariel/vehiculos/${vehiculoId}`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return null;
    const body = await res.json() as any;
    if (!body?.success || !body?.data) return null;
    const v = body.data;
    return {
      id:         v.id         as string,
      status:     v.status     as string,
      precio_dia: Number(v.precioDia ?? v.precio_dia ?? 0),
      agencia_id: (v.agenciaId ?? '') as string,
      placa:      (v.placa     ?? '') as string,
    };
  } catch {
    throw new InventarioUnavailableError();
  }
}

function patchVehiculoStatus(vehiculoId: string, status: string, kilometraje = 0): void {
  getInventarioClient().updateVehiculoStatus(vehiculoId, status, kilometraje).catch(() => {});
}

function generarCodigo(): string {
  const ts  = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `RES-${ts}-${rnd}`;
}

interface FechaError { error: string }
interface FechaOk   { dInicio: Date; dFin: Date; dias: number }
type FechaValidation = FechaError | FechaOk;

function validateFechas(rawInicio: unknown, rawFin: unknown): FechaValidation {
  if (typeof rawInicio !== 'string' || !rawInicio.trim())
    return { error: 'fechaInicio debe ser un string ISO 8601 válido' };
  if (typeof rawFin !== 'string' || !rawFin.trim())
    return { error: 'fechaFin debe ser un string ISO 8601 válido' };

  const dInicio = new Date(rawInicio);
  const dFin    = new Date(rawFin);

  if (!Number.isFinite(dInicio.getTime()))
    return { error: 'fechaInicio no es una fecha ISO 8601 válida' };
  if (!Number.isFinite(dFin.getTime()))
    return { error: 'fechaFin no es una fecha ISO 8601 válida' };

  const hoy = new Date();
  hoy.setUTCHours(0, 0, 0, 0);
  if (dInicio < hoy)
    return { error: 'fechaInicio no puede ser una fecha pasada' };
  if (dFin <= dInicio)
    return { error: 'fechaFin debe ser estrictamente posterior a fechaInicio' };

  const dias = Math.ceil((dFin.getTime() - dInicio.getTime()) / 86_400_000);
  return { dInicio, dFin, dias };
}

function toReservaBookingDto(reserva: any) {
  return {
    id:            reserva.id,
    codigoReserva: reserva.codigoReserva,
    vehiculoId:    reserva.vehiculoId,
    clienteId:     reserva.usuarioId,
    agenciaId:     reserva.agenciaId,
    fechaInicio:   reserva.fechaInicio,
    fechaFin:      reserva.fechaFin,
    diasTotal:     reserva.diasTotal,
    totalAmount:   Number(reserva.totalAmount),
    status:        reserva.status,
  };
}

// ── State machine (Fix C-4) ───────────────────────────────────────────────────
//
// NOTE (Fix C-1): The definitive fix for the vehicle race condition requires a
// unique partial index in PostgreSQL to be atomic at the DB level:
//
//   CREATE UNIQUE INDEX idx_one_active_per_vehicle ON reservas(vehiculo_id)
//   WHERE status NOT IN ('CANCELADA', 'COMPLETADA');
//
// The application-level check below (paso 5) reduces the window but does not
// eliminate it under high concurrency. Apply the index when possible.

const ALLOWED_TRANSITIONS: Record<string, readonly string[]> = {
  PENDIENTE:  ['CONFIRMADA', 'CANCELADA'],
  CONFIRMADA: ['ACTIVA',     'CANCELADA'],
  ACTIVA:     ['COMPLETADA', 'CANCELADA'],
  COMPLETADA: [],
  CANCELADA:  [],
} as const;

const VALID_STATUSES = Object.keys(ALLOWED_TRANSITIONS);

// ── /reservas/booking ─────────────────────────────────────────────────────────
export function createReservaBookingRouter(reservaRepo: ReservaRepository): Router {
  const router = Router();

  // GET /api/v1/stevenariel/reservas/booking/:id
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reserva = await reservaRepo.findById(req.params['id'] as string);
      if (!reserva) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Reserva ${req.params['id']} no encontrada` } });
        return;
      }
      res.json({ success: true, data: toReservaBookingDto(reserva) });
    } catch (err) { next(err); }
  });

  // POST /api/v1/stevenariel/reservas/booking
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { vehiculoId, clienteId, agenciaId: bodyAgenciaId, fechaInicio, fechaFin, clienteNombre, clienteEmail } = req.body;

      // 1. Presence check
      if (!vehiculoId || !clienteId || !fechaInicio || !fechaFin) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'vehiculoId, clienteId, fechaInicio y fechaFin son requeridos' } });
        return;
      }

      // 2. Date validation — Fix C-2
      const fechaResult = validateFechas(fechaInicio, fechaFin);
      if ('error' in fechaResult) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: fechaResult.error } });
        return;
      }
      const { dias } = fechaResult;

      // 3. Vehicle fetch + availability
      let vehiculo;
      try {
        vehiculo = await fetchVehiculo(vehiculoId);
      } catch (err) {
        if (err instanceof InventarioUnavailableError) {
          res.status(503).json({ success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'Servicio de inventario no disponible, intente más tarde' } });
          return;
        }
        throw err;
      }
      if (!vehiculo) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Vehiculo ${vehiculoId} no encontrado` } });
        return;
      }
      if (vehiculo.status !== 'DISPONIBLE') {
        res.status(422).json({ success: false, error: { code: 'VEHICLE_NOT_AVAILABLE', message: 'El vehículo no está disponible' } });
        return;
      }

      // 4. Price validation — Fix W-4
      const precioDia = vehiculo.precio_dia;
      if (!Number.isFinite(precioDia) || precioDia <= 0) {
        res.status(422).json({ success: false, error: { code: 'VEHICLE_PRICE_MISSING', message: 'El vehículo no tiene precio por día configurado' } });
        return;
      }

      // 5. Active-reservation conflict — application-level Fix C-1
      const conflicto = await prisma.reserva.findFirst({
        where: { vehiculoId, status: { notIn: ['CANCELADA', 'COMPLETADA'] } },
      });
      if (conflicto) {
        res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'El vehículo ya tiene una reserva activa' } });
        return;
      }

      const agenciaId = bodyAgenciaId ?? vehiculo.agencia_id;
      if (!agenciaId) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No se pudo determinar agenciaId del vehículo' } });
        return;
      }

      const precioBase = precioDia * dias;

      // Pass date-only strings so the repository's template literal stays valid
      const fechaInicioDate = (fechaInicio as string).split('T')[0]!;
      const fechaFinDate    = (fechaFin    as string).split('T')[0]!;

      const reserva = await reservaRepo.create({
        usuarioId:     clienteId,
        vehiculoId,
        agenciaId,
        fechaInicio:   fechaInicioDate,
        fechaFin:      fechaFinDate,
        diasTotal:     dias,
        precioBase,
        precioExtras:  0,
        precioSeguro:  0,
        totalAmount:   precioBase,
        codigoReserva: generarCodigo(),
        status:        'CONFIRMADA',
        ...(clienteNombre && { clienteNombre: String(clienteNombre) }),
        ...(clienteEmail  && { clienteEmail:  String(clienteEmail)  }),
      });

      // Fire-and-forget: marcar vehículo como RESERVADO
      patchVehiculoStatus(vehiculoId, 'RESERVADO');

      res.status(201).json({ success: true, data: toReservaBookingDto(reserva) });
    } catch (err) { next(err); }
  });

  // PATCH /api/v1/stevenariel/reservas/booking/:id — Fix C-4
  router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const nuevoStatus: unknown = req.body.status;

      if (typeof nuevoStatus !== 'string' || !VALID_STATUSES.includes(nuevoStatus)) {
        res.status(400).json({
          success: false,
          error: {
            code:    'INVALID_STATUS',
            message: `status inválido. Valores permitidos: ${VALID_STATUSES.join(', ')}`,
          },
        });
        return;
      }

      const reserva = await reservaRepo.findById(req.params['id'] as string);
      if (!reserva) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Reserva ${req.params['id']} no encontrada` } });
        return;
      }

      const currentStatus = reserva.status as string;

      // Idempotente: si ya está en el estado deseado, retornar éxito sin error
      if (currentStatus === nuevoStatus) {
        res.json({ success: true, data: toReservaBookingDto(reserva) });
        return;
      }

      const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? [];
      if (!allowed.includes(nuevoStatus)) {
        res.status(422).json({
          success: false,
          error: {
            code:    'INVALID_TRANSITION',
            message: `No se puede cambiar de ${currentStatus} a ${nuevoStatus}`,
          },
        });
        return;
      }

      const updated = await reservaRepo.update(req.params['id'] as string, { status: nuevoStatus });

      // Sincronizar estado del vehículo según la transición
      if (reserva.vehiculoId) {
        if (nuevoStatus === 'CANCELADA') {
          patchVehiculoStatus(reserva.vehiculoId, 'DISPONIBLE');
        } else if (nuevoStatus === 'CONFIRMADA') {
          patchVehiculoStatus(reserva.vehiculoId, 'RESERVADO');
        }
      }

      res.json({ success: true, data: toReservaBookingDto(updated) });
    } catch (err) { next(err); }
  });

  return router;
}

// ── /alquileres/booking ───────────────────────────────────────────────────────
export function createAlquilerBookingRouter(alquilerRepo: AlquilerRepository): Router {
  const router = Router();

  // POST /api/v1/stevenariel/alquileres/booking
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reservaId, kmSalida, fechaInicio, observaciones } = req.body;

      if (!reservaId) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'reservaId es requerido' } });
        return;
      }

      const reserva = await prisma.reserva.findUnique({ where: { id: reservaId } });
      if (!reserva) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Reserva ${reservaId} no encontrada` } });
        return;
      }
      if (reserva.status !== 'CONFIRMADA') {
        res.status(422).json({ success: false, error: { code: 'INVALID_STATUS', message: 'Solo se puede iniciar un alquiler de una reserva CONFIRMADA' } });
        return;
      }

      const existente = await alquilerRepo.findByReservaId(reservaId);
      if (existente) {
        res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Ya existe un alquiler para esta reserva' } });
        return;
      }

      const alquiler = await prisma.$transaction(async (tx) => {
        const a = await tx.alquiler.create({
          data: {
            reservaId,
            kmSalida,
            fechaInicio: fechaInicio ? new Date(fechaInicio) : new Date(),
            observaciones,
            status: 'ACTIVO',
          },
        });
        await tx.reserva.update({ where: { id: reservaId }, data: { status: 'ACTIVA' } });
        return a;
      });

      if (reserva.vehiculoId) {
        patchVehiculoStatus(reserva.vehiculoId, 'EN_USO');
      }

      const result = await alquilerRepo.findById(alquiler.id);
      res.status(201).json({ success: true, data: result });
    } catch (err) { next(err); }
  });

  return router;
}

// ── /devoluciones/booking ─────────────────────────────────────────────────────
export function createDevolucionBookingRouter(alquilerRepo: AlquilerRepository): Router {
  const router = Router();

  // POST /api/v1/stevenariel/devoluciones/booking
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { alquilerId, kmEntrada, estadoVehiculo, cargoExtra = 0, observaciones } = req.body;

      if (!alquilerId) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'alquilerId es requerido' } });
        return;
      }

      const alquiler = await alquilerRepo.findById(alquilerId);
      if (!alquiler) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Alquiler ${alquilerId} no encontrado` } });
        return;
      }
      if (alquiler.status !== 'ACTIVO') {
        res.status(422).json({ success: false, error: { code: 'INVALID_STATUS', message: 'El alquiler no está activo' } });
        return;
      }

      const existente = await alquilerRepo.findDevolucion(alquilerId);
      if (existente) {
        res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Este alquiler ya tiene una devolución registrada' } });
        return;
      }

      const reservaObj = await prisma.reserva.findUnique({ where: { id: alquiler.reservaId! } });

      const devolucion = await prisma.$transaction(async (tx) => {
        const d = await tx.devolucion.create({
          data: { alquilerId, kmEntrada, estadoVehiculo, cargoExtra, observaciones },
        });
        await tx.alquiler.update({
          where: { id: alquilerId },
          data:  { status: 'FINALIZADO', kmEntrada, fechaFin: new Date(), cargoAdicional: cargoExtra },
        });
        await tx.reserva.update({ where: { id: alquiler.reservaId! }, data: { status: 'COMPLETADA' } });
        return d;
      });

      if (reservaObj?.vehiculoId) {
        patchVehiculoStatus(reservaObj.vehiculoId, 'DISPONIBLE', kmEntrada ?? 0);
      }

      res.status(201).json({ success: true, data: devolucion });
    } catch (err) { next(err); }
  });

  return router;
}
