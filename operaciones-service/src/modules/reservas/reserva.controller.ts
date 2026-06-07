import { Request, Response, NextFunction } from 'express';
import { ReservaRepository } from './reserva.repository.js';
import { NotFoundException, ValidationException } from '../../shared/errors/BusinessException.js';
import { getInventarioClient } from '../../grpc/inventario.grpc-client.js';
import { getOrgClient }        from '../../grpc/org.grpc-client.js';
import { getFinancieroClient } from '../../grpc/financiero.grpc-client.js';
import { logger }              from '../../shared/logger.js';

const AUTH_SERVICE_URL      = process.env['AUTH_SERVICE_URL']      ?? 'http://auth-service';
const INVENTARIO_SERVICE_URL = process.env['INVENTARIO_SERVICE_URL'] ?? 'http://localhost:3002';
const BUS_SERVICE_URL        = process.env['BUS_SERVICE_URL']        ?? 'http://bus-service:3007';

async function emitBusEvent(tipo: string, entidadId: string, payload: Record<string, unknown>): Promise<void> {
  try {
    await fetch(`${BUS_SERVICE_URL}/api/v1/stevenariel/bus/stream/emit`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ tipo, entidadId, payload }),
    });
  } catch (err: any) {
    logger.warn({ tipo, entidadId, err: err?.message }, 'emitBusEvent fallido');
  }
}

async function fetchUsuario(usuarioId: string, token: string): Promise<{ id: string; nombres: string; apellidos: string; email: string } | null> {
  try {
    const res = await fetch(`${AUTH_SERVICE_URL}/api/v1/stevenariel/usuarios/${usuarioId}`, {
      headers: { Authorization: token },
    });
    if (!res.ok) return null;
    const json = await res.json() as any;
    const u = json?.data;
    if (!u) return null;
    return { id: usuarioId, nombres: u.nombres ?? '', apellidos: u.apellidos ?? '', email: u.email ?? '' };
  } catch (err: any) {
    logger.warn({ usuarioId, err: err?.message }, 'HTTP fetchUsuario fallido');
    return null;
  }
}

function generarCodigo(): string {
  const ts  = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `RES-${ts}-${rnd}`;
}

function calcularDias(inicio: string, fin: string): number {
  const ms = new Date(fin).getTime() - new Date(inicio).getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

async function fetchVehiculoHttp(vehiculoId: string): Promise<{ nombre: string; placa: string; precio_dia: number; status: string } | null> {
  try {
    const res = await fetch(`${INVENTARIO_SERVICE_URL}/api/v1/stevenariel/vehiculos/${vehiculoId}`);
    if (!res.ok) return null;
    const json = await res.json() as any;
    const v = json?.data;
    if (!v) return null;
    const nombre = [
      v.modelo?.marca?.nombre ?? '',
      v.modelo?.nombre       ?? '',
      v.anio,
    ].filter(Boolean).join(' ').trim() || v.placa || `Vehículo #${vehiculoId.slice(0, 8)}`;
    return { nombre, placa: v.placa ?? '', precio_dia: Number(v.precioDia ?? v.precio_dia ?? 0), status: v.status ?? 'DISPONIBLE' };
  } catch {
    return null;
  }
}

async function updateVehiculoStatusHttp(vehiculoId: string, status: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${INVENTARIO_SERVICE_URL}/api/v1/stevenariel/vehiculos/booking/${vehiculoId}/status`,
      {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status }),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

async function fetchExtraHttp(extraId: string): Promise<{ id: string; precio_dia: number; nombre: string } | null> {
  try {
    const res = await fetch(`${INVENTARIO_SERVICE_URL}/api/v1/stevenariel/extras/${extraId}`);
    if (!res.ok) return null;
    const json = await res.json() as any;
    const e = json?.data;
    if (!e) return null;
    return { id: extraId, precio_dia: Number(e.precioDia ?? e.precio_dia ?? 0), nombre: e.nombre ?? '' };
  } catch {
    return null;
  }
}

async function enrichReservas(reservas: any[]): Promise<any[]> {
  const invClient = getInventarioClient();
  const orgClient = getOrgClient();
  return Promise.all(reservas.map(async (r) => {
    const [vehiculoGrpc, agenciaRes] = await Promise.all([
      r.vehiculoId ? invClient.getVehiculo(r.vehiculoId).catch((err: any) => {
        logger.warn({ vehiculoId: r.vehiculoId, err: err?.message }, 'gRPC getVehiculo fallido');
        return null;
      }) : null,
      r.agenciaId ? orgClient.getAgencia(r.agenciaId).catch((err: any) => {
        logger.warn({ agenciaId: r.agenciaId, err: err?.message }, 'gRPC getAgencia fallido');
        return null;
      }) : null,
    ]);

    let vehiculo: any = null;
    if (vehiculoGrpc?.found) {
      vehiculo = vehiculoGrpc;
    } else if (r.vehiculoId) {
      const http = await fetchVehiculoHttp(r.vehiculoId);
      vehiculo = http ?? { nombre: `Vehículo #${r.vehiculoId.slice(0, 8)}`, placa: '', precio_dia: 0 };
      if (http) logger.debug({ vehiculoId: r.vehiculoId }, 'vehiculo obtenido por HTTP (fallback)');
    }

    const agencia = agenciaRes?.found ? agenciaRes : null;
    return { ...r, vehiculo, agencia };
  }));
}

export class ReservaController {
  constructor(private readonly reservaRepository: ReservaRepository) {}

  listMy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const usuarioId = req.user!.id;
      const result    = await this.reservaRepository.findAll(1, 500, { usuarioId });
      const enriched  = await enrichReservas(result.data);
      res.json({ success: true, data: enriched });
    } catch (err) { next(err); }
  };

  listAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page    = Number(req.query.page)  || 1;
      const limit   = Number(req.query.limit) || 20;
      const filters = {
        usuarioId:  req.query['usuarioId']  as string | undefined,
        vehiculoId: req.query['vehiculoId'] as string | undefined,
        agenciaId:  req.query['agenciaId']  as string | undefined,
        status:     req.query['status']     as string | undefined,
      };
      const result   = await this.reservaRepository.findAll(page, limit, filters);
      const enriched = await enrichReservas(result.data);

      // Obtener datos reales de usuarios desde auth-service usando el JWT del admin
      const token = req.headers.authorization ?? '';
      const uniqueUserIds = [...new Set(enriched.map((r: any) => r.usuarioId).filter(Boolean))] as string[];
      const usuariosMap = new Map<string, any>();
      await Promise.all(uniqueUserIds.map(async (uid) => {
        const u = await fetchUsuario(uid, token);
        if (u) usuariosMap.set(uid, u);
      }));

      const withUser = enriched.map((r: any) => ({
        ...r,
        usuario: usuariosMap.get(r.usuarioId)
          ?? (r.clienteNombre
            ? { id: r.usuarioId, nombres: r.clienteNombre, apellidos: '', email: r.clienteEmail ?? '' }
            : r.usuarioId ? { id: r.usuarioId, nombres: 'Cliente', apellidos: r.usuarioId.slice(0, 8), email: '' } : null),
      }));
      res.json({ success: true, data: { ...result, data: withUser } });
    } catch (err) { next(err); }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const reserva = await this.reservaRepository.findById(req.params['id'] as string);
      if (!reserva) throw new NotFoundException('Reserva', req.params['id'] as string);

      const finClient = getFinancieroClient();
      const [enriched, pagosRes] = await Promise.all([
        enrichReservas([reserva]).then(r => r[0]),
        finClient.getPagosByReserva(reserva.id).catch(() => ({ pagos: [] })),
      ]);
      const pagos = (pagosRes.pagos ?? []).map((p: any) => ({
        id:         p.id,
        monto:      p.monto,
        metodoPago: p.metodo_pago,
        referencia: p.referencia,
        status:     p.status,
        createdAt:  p.created_at,
      }));
      res.json({ success: true, data: { ...enriched, pagos } });
    } catch (err) { next(err); }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { vehiculoId, agenciaId, seguroId, canalVentaId, fechaInicio, fechaFin, notas, extras } = req.body;
      const usuarioId = req.user?.id ?? req.body.usuarioId ?? req.body.clienteId;
      if (!usuarioId) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'usuarioId o clienteId es requerido' } });
        return;
      }

      const invClient = getInventarioClient();

      // Obtener vehículo: intenta gRPC primero, cae a HTTP si falla
      let vehiculoPrecioDia: number;
      let vehiculoStatus:    string;

      try {
        const vGrpc = await invClient.getVehiculo(vehiculoId);
        if (vGrpc.found) {
          vehiculoPrecioDia = vGrpc.precio_dia;
          vehiculoStatus    = vGrpc.status;
        } else {
          throw new Error('not_found');
        }
      } catch {
        logger.warn({ vehiculoId }, 'gRPC getVehiculo falló — usando fallback HTTP');
        const vHttp = await fetchVehiculoHttp(vehiculoId);
        if (!vHttp) throw new NotFoundException('Vehiculo', vehiculoId);
        vehiculoPrecioDia = vHttp.precio_dia;
        vehiculoStatus    = vHttp.status;
      }

      if (vehiculoStatus !== 'DISPONIBLE') throw new ValidationException('El vehículo no está disponible');

      const dias       = calcularDias(fechaInicio, fechaFin);
      const precioBase = vehiculoPrecioDia * dias;

      let precioSeguro = 0;
      if (seguroId) {
        const seguro = await this.reservaRepository.findSeguroById(seguroId);
        if (seguro) precioSeguro = Number(seguro.precioDia) * dias;
      }

      let precioExtras = 0;
      const extrasData: any[] = [];
      if (extras?.length) {
        for (const e of extras) {
          let precioDiaExtra: number;
          try {
            const eGrpc = await invClient.getExtra(e.extraId);
            if (eGrpc.found) {
              precioDiaExtra = eGrpc.precio_dia;
            } else {
              throw new Error('not_found');
            }
          } catch {
            logger.warn({ extraId: e.extraId }, 'gRPC getExtra falló — usando fallback HTTP');
            const eHttp = await fetchExtraHttp(e.extraId);
            if (!eHttp) throw new NotFoundException('Extra', e.extraId);
            precioDiaExtra = eHttp.precio_dia;
          }
          const subtotal = precioDiaExtra * e.cantidad * dias;
          precioExtras += subtotal;
          extrasData.push({ extraId: e.extraId, cantidad: e.cantidad, precioDia: precioDiaExtra, subtotal });
        }
      }

      const reserva = await this.reservaRepository.create({
        usuarioId, vehiculoId, agenciaId, seguroId, canalVentaId,
        fechaInicio, fechaFin, diasTotal: dias,
        precioBase, precioExtras, precioSeguro,
        totalAmount: precioBase + precioExtras + precioSeguro,
        codigoReserva: generarCodigo(),
        status: 'CONFIRMADA',
        notas,
        extras: extrasData,
      });

      // Marcar vehículo RESERVADO — si gRPC resuelve con success:false o lanza, cae a HTTP
      const grpcReservar = await invClient.updateVehiculoStatus(vehiculoId, 'RESERVADO').catch(() => ({ success: false }));
      if (!grpcReservar.success) {
        const ok = await updateVehiculoStatusHttp(vehiculoId, 'RESERVADO');
        if (!ok) logger.warn({ vehiculoId }, 'No se pudo actualizar status del vehículo a RESERVADO');
      }

      // Notificar tiempo real: reserva creada + vehículo cambió a RESERVADO
      emitBusEvent('RESERVA_CREADA', reserva.id, { status: 'CONFIRMADA', vehiculoId }).catch(() => {});
      emitBusEvent('VEHICULO_ACTUALIZADO', vehiculoId, { status: 'RESERVADO' }).catch(() => {});

      // Fire-and-forget: guardar nombre del cliente para futuras consultas del panel
      const authHeader = req.headers.authorization ?? '';
      fetchUsuario(usuarioId, authHeader).then(u => {
        if (u) {
          this.reservaRepository.update(reserva.id, {
            clienteNombre: `${u.nombres} ${u.apellidos}`.trim(),
            clienteEmail:  u.email,
          }).catch(() => {});
        }
      }).catch(() => {});

      res.status(201).json({ success: true, data: reserva });
    } catch (err) { next(err); }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const reserva = await this.reservaRepository.findById(req.params['id'] as string);
      if (!reserva) throw new NotFoundException('Reserva', req.params['id'] as string);
      const updated = await this.reservaRepository.update(req.params['id'] as string, req.body);

      // Sincronizar estado del vehículo cuando cambia el status de la reserva
      const nuevoStatus: string | undefined = req.body.status;
      if (nuevoStatus && reserva.vehiculoId && nuevoStatus !== reserva.status) {
        let vehiculoStatus: string | null = null;
        if (nuevoStatus === 'CONFIRMADA')                          vehiculoStatus = 'RESERVADO';
        else if (nuevoStatus === 'ACTIVA')                         vehiculoStatus = 'EN_USO';
        else if (nuevoStatus === 'CANCELADA' || nuevoStatus === 'COMPLETADA') vehiculoStatus = 'DISPONIBLE';

        if (vehiculoStatus) {
          const vid = reserva.vehiculoId!;
          const grpcUpd = await getInventarioClient().updateVehiculoStatus(vid, vehiculoStatus).catch(() => ({ success: false }));
          if (!grpcUpd.success) await updateVehiculoStatusHttp(vid, vehiculoStatus);
          emitBusEvent('VEHICULO_ACTUALIZADO', vid, { status: vehiculoStatus }).catch(() => {});
        }
      }

      // Notificar tiempo real: reserva actualizada
      emitBusEvent('RESERVA_ACTUALIZADA', req.params['id'] as string, { status: nuevoStatus ?? updated.status }).catch(() => {});

      res.json({ success: true, data: updated });
    } catch (err) { next(err); }
  };

  cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const reserva = await this.reservaRepository.findById(req.params['id'] as string);
      if (!reserva) throw new NotFoundException('Reserva', req.params['id'] as string);
      if (reserva.status === 'COMPLETADA' || reserva.status === 'CANCELADA') {
        throw new ValidationException(`No se puede cancelar una reserva en estado ${reserva.status}`);
      }
      const updated = await this.reservaRepository.update(req.params['id'] as string, { status: 'CANCELADA' });
      if (reserva.vehiculoId) {
        const vid = reserva.vehiculoId;
        const grpcCancel = await getInventarioClient().updateVehiculoStatus(vid, 'DISPONIBLE').catch(() => ({ success: false }));
        if (!grpcCancel.success) await updateVehiculoStatusHttp(vid, 'DISPONIBLE');
        emitBusEvent('VEHICULO_ACTUALIZADO', vid, { status: 'DISPONIBLE' }).catch(() => {});
      }
      emitBusEvent('RESERVA_CANCELADA', req.params['id'] as string, { status: 'CANCELADA' }).catch(() => {});
      res.json({ success: true, data: updated });
    } catch (err) { next(err); }
  };

  listExtras = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ success: true, data: await this.reservaRepository.findExtras(req.params['id'] as string) });
    } catch (err) { next(err); }
  };

  addExtra = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { extraId, cantidad = 1 } = req.body;
      const reserva = await this.reservaRepository.findById(req.params['id'] as string);
      if (!reserva) throw new NotFoundException('Reserva', req.params['id'] as string);
      const extra = await getInventarioClient().getExtra(extraId);
      if (!extra.found) throw new NotFoundException('Extra', extraId);
      res.status(201).json({
        success: true,
        data: await this.reservaRepository.addExtra(req.params['id'] as string, extraId, extra.precio_dia, cantidad),
      });
    } catch (err) { next(err); }
  };

  removeExtra = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.reservaRepository.removeExtra(req.params['id'] as string, req.params['extraId'] as string);
      res.json({ success: true, data: { deleted: true } });
    } catch (err) { next(err); }
  };
}
