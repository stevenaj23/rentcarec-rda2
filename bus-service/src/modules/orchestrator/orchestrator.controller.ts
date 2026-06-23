import { Request, Response, NextFunction } from 'express';
import { publishEvent, getEventLog } from '../../shared/bus/rabbitmq-bus.js';
import { getOperacionesClient } from '../../grpc/operaciones.grpc-client.js';

function handleGrpcResponse(res: Response, result: { success: boolean; data_json: string; error_message: string; error_code: number }) {
  if (!result.success) {
    const code = result.error_code >= 400 ? result.error_code : 500;
    res.status(code).json({ success: false, error: { message: result.error_message } });
    return null;
  }
  try {
    return JSON.parse(result.data_json);
  } catch {
    return {};
  }
}

export async function crearReserva(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { vehiculoId, agenciaId, fechaInicio, fechaFin, seguroId, canalVentaId, notas, extras } = req.body;
    const usuarioId = req.user!.id;

    const result = await getOperacionesClient().crearReserva({
      usuario_id:     usuarioId,
      vehiculo_id:    vehiculoId,
      agencia_id:     agenciaId,
      fecha_inicio:   fechaInicio,
      fecha_fin:      fechaFin,
      seguro_id:      seguroId,
      canal_venta_id: canalVentaId,
      notas,
      extras: (extras ?? []).map((e: any) => ({ extra_id: e.extraId, cantidad: e.cantidad ?? 1 })),
    });

    const data = handleGrpcResponse(res, result);
    if (data === null) return;

    const reservaId = data?.id ?? 'unknown';
    const event = await publishEvent('RESERVA_CREADA', usuarioId, reservaId, req.body as any);
    res.status(201).json({ success: true, data, event });
  } catch (err) { next(err); }
}

export async function cancelarReserva(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const reservaId = req.params['id'] as string;
    const usuarioId = req.user!.id;

    const result = await getOperacionesClient().cancelarReserva(reservaId, usuarioId);
    const data   = handleGrpcResponse(res, result);
    if (data === null) return;

    const event = await publishEvent('RESERVA_CANCELADA', usuarioId, reservaId, {});
    res.json({ success: true, data, event });
  } catch (err) { next(err); }
}

export async function iniciarAlquiler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { reservaId, kmSalida, observaciones } = req.body;
    const usuarioId = req.user!.id;

    const result = await getOperacionesClient().iniciarAlquiler({
      reserva_id:    reservaId,
      km_salida:     kmSalida,
      observaciones,
      usuario_id:    usuarioId,
    });

    const data = handleGrpcResponse(res, result);
    if (data === null) return;

    const alquilerId = data?.id ?? 'unknown';
    const event = await publishEvent('ALQUILER_INICIADO', usuarioId, alquilerId, req.body as any);
    res.status(201).json({ success: true, data, event });
  } catch (err) { next(err); }
}

export async function registrarDevolucion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { alquilerId, kmEntrada, estadoVehiculo, cargoExtra, observaciones } = req.body;
    const usuarioId = req.user!.id;

    const result = await getOperacionesClient().registrarDevolucion({
      alquiler_id:     alquilerId,
      km_entrada:      kmEntrada,
      estado_vehiculo: estadoVehiculo,
      cargo_extra:     cargoExtra,
      observaciones,
    });

    const data = handleGrpcResponse(res, result);
    if (data === null) return;

    const event = await publishEvent('DEVOLUCION_REGISTRADA', usuarioId, alquilerId ?? 'unknown', req.body as any);
    res.status(201).json({ success: true, data, event });
  } catch (err) { next(err); }
}

export function listarEventos(req: Request, res: Response): void {
  const page  = Number(req.query.page)  || 1;
  const limit = Number(req.query.limit) || 50;
  res.json({ success: true, data: getEventLog(page, limit) });
}
