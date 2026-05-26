import { Request, Response, NextFunction } from 'express';
import { ReservaRepository } from './reserva.repository.js';
import { NotFoundException, ValidationException } from '../../shared/errors/BusinessException.js';
import { getInventarioClient } from '../../grpc/inventario.grpc-client.js';
import { getOrgClient }        from '../../grpc/org.grpc-client.js';
import { getFinancieroClient } from '../../grpc/financiero.grpc-client.js';
import { logger }              from '../../shared/logger.js';

const AUTH_SERVICE_URL = process.env['AUTH_SERVICE_URL'] ?? 'http://auth-service:3001';

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

async function enrichReservas(reservas: any[]): Promise<any[]> {
  const invClient = getInventarioClient();
  const orgClient = getOrgClient();
  return Promise.all(reservas.map(async (r) => {
    const [vehiculoRes, agenciaRes] = await Promise.all([
      r.vehiculoId
        ? invClient.getVehiculo(r.vehiculoId).catch((err: any) => {
            logger.warn({ vehiculoId: r.vehiculoId, err: err?.message }, 'gRPC getVehiculo fallido');
            return null;
          })
        : null,
      r.agenciaId
        ? orgClient.getAgencia(r.agenciaId).catch((err: any) => {
            logger.warn({ agenciaId: r.agenciaId, err: err?.message }, 'gRPC getAgencia fallido');
            return null;
          })
        : null,
    ]);
    const vehiculo = vehiculoRes?.found
      ? vehiculoRes
      : r.vehiculoId
        ? { nombre: `Vehículo #${r.vehiculoId.slice(0, 8)}`, placa: '', precio_dia: 0 }
        : null;
    if (r.vehiculoId && !vehiculoRes?.found) {
      logger.warn({ vehiculoId: r.vehiculoId, found: vehiculoRes?.found ?? 'sin-respuesta' }, 'vehiculo no encontrado en inventario');
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
          ?? (r.usuarioId ? { id: r.usuarioId, nombres: 'Cliente', apellidos: r.usuarioId.slice(0, 8), email: '' } : null),
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

      const vehiculo = await invClient.getVehiculo(vehiculoId);
      if (!vehiculo.found) throw new NotFoundException('Vehiculo', vehiculoId);
      if (vehiculo.status !== 'DISPONIBLE') throw new ValidationException('El vehículo no está disponible');

      const dias       = calcularDias(fechaInicio, fechaFin);
      const precioBase = vehiculo.precio_dia * dias;

      let precioSeguro = 0;
      if (seguroId) {
        const seguro = await this.reservaRepository.findSeguroById(seguroId);
        if (seguro) precioSeguro = Number(seguro.precioDia) * dias;
      }

      let precioExtras = 0;
      const extrasData: any[] = [];
      if (extras?.length) {
        for (const e of extras) {
          const extra = await invClient.getExtra(e.extraId);
          if (!extra.found) throw new NotFoundException('Extra', e.extraId);
          const subtotal = extra.precio_dia * e.cantidad * dias;
          precioExtras += subtotal;
          extrasData.push({ extraId: e.extraId, cantidad: e.cantidad, precioDia: extra.precio_dia, subtotal });
        }
      }

      const reserva = await this.reservaRepository.create({
        usuarioId, vehiculoId, agenciaId, seguroId, canalVentaId,
        fechaInicio, fechaFin, diasTotal: dias,
        precioBase, precioExtras, precioSeguro,
        totalAmount: precioBase + precioExtras + precioSeguro,
        codigoReserva: generarCodigo(),
        notas,
        extras: extrasData,
      });

      // Fire-and-forget: marcar vehículo como RESERVADO
      invClient.updateVehiculoStatus(vehiculoId, 'RESERVADO').catch(() => {});

      res.status(201).json({ success: true, data: reserva });
    } catch (err) { next(err); }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const reserva = await this.reservaRepository.findById(req.params['id'] as string);
      if (!reserva) throw new NotFoundException('Reserva', req.params['id'] as string);
      res.json({ success: true, data: await this.reservaRepository.update(req.params['id'] as string, req.body) });
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
      if (reserva.vehiculoId && (reserva.status === 'PENDIENTE' || reserva.status === 'CONFIRMADA')) {
        getInventarioClient().updateVehiculoStatus(reserva.vehiculoId, 'DISPONIBLE').catch(() => {});
      }
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
