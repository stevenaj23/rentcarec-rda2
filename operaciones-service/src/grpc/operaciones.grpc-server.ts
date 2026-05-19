import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import prisma from '../shared/database/prisma.js';
import { ReservaRepository } from '../modules/reservas/reserva.repository.js';
import { AlquilerRepository } from '../modules/alquileres/alquiler.repository.js';
import { getInventarioClient } from './inventario.grpc-client.js';

const PROTO_PATH = path.join(process.cwd(), 'src', 'grpc', 'operaciones.proto');

function loadPackage() {
  const def = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs:    String,
    enums:    String,
    defaults: true,
    oneofs:   true,
  });
  return (grpc.loadPackageDefinition(def) as any).operaciones;
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

function ok(data: any): object {
  return { success: true, data_json: JSON.stringify(data), error_message: '', error_code: 0 };
}

function fail(message: string, code = 400): object {
  return { success: false, data_json: '', error_message: message, error_code: code };
}

export function createOperacionesGrpcServer(
  reservaRepo:  ReservaRepository,
  alquilerRepo: AlquilerRepository,
): grpc.Server {
  const pkg    = loadPackage();
  const server = new grpc.Server();
  const invClient = getInventarioClient();

  server.addService(pkg.OperacionesService.service, {

    // ── CrearReserva ────────────────────────────────────────────────────────
    async CrearReserva(call: any, callback: any) {
      try {
        const {
          usuario_id, vehiculo_id, agencia_id, fecha_inicio, fecha_fin,
          seguro_id, canal_venta_id, notas, extras = [],
        } = call.request;

        const vehiculo = await invClient.getVehiculo(vehiculo_id);
        if (!vehiculo.found) {
          return callback(null, fail(`Vehículo ${vehiculo_id} no encontrado`, 404));
        }
        if (vehiculo.status !== 'DISPONIBLE') {
          return callback(null, fail('El vehículo no está disponible', 400));
        }

        const dias       = calcularDias(fecha_inicio, fecha_fin);
        const precioBase = vehiculo.precio_dia * dias;

        let precioSeguro = 0;
        if (seguro_id) {
          const seguro = await reservaRepo.findSeguroById(seguro_id);
          if (seguro) precioSeguro = Number(seguro.precioDia) * dias;
        }

        let precioExtras = 0;
        const extrasData: any[] = [];
        for (const e of extras) {
          const extra = await invClient.getExtra(e.extra_id);
          if (!extra.found) {
            return callback(null, fail(`Extra ${e.extra_id} no encontrado`, 404));
          }
          const subtotal = extra.precio_dia * e.cantidad * dias;
          precioExtras += subtotal;
          extrasData.push({
            extraId:   e.extra_id,
            cantidad:  e.cantidad,
            precioDia: extra.precio_dia,
            subtotal,
          });
        }

        const reserva = await reservaRepo.create({
          usuarioId:    usuario_id,
          vehiculoId:   vehiculo_id,
          agenciaId:    agencia_id,
          seguroId:     seguro_id || undefined,
          canalVentaId: canal_venta_id || undefined,
          fechaInicio:  fecha_inicio,
          fechaFin:     fecha_fin,
          diasTotal:    dias,
          precioBase,
          precioExtras,
          precioSeguro,
          totalAmount:  precioBase + precioExtras + precioSeguro,
          codigoReserva: generarCodigo(),
          notas:         notas || undefined,
          extras:        extrasData,
        });

        // Fire-and-forget: actualizar vehículo a RESERVADO
        invClient.updateVehiculoStatus(vehiculo_id, 'RESERVADO').catch(() => {});

        callback(null, ok(reserva));
      } catch (err: any) {
        callback(null, fail(err.message ?? 'Error interno', 500));
      }
    },

    // ── CancelarReserva ─────────────────────────────────────────────────────
    async CancelarReserva(call: any, callback: any) {
      try {
        const { reserva_id } = call.request;
        const reserva = await reservaRepo.findById(reserva_id);
        if (!reserva) {
          return callback(null, fail(`Reserva ${reserva_id} no encontrada`, 404));
        }
        if (reserva.status === 'COMPLETADA' || reserva.status === 'CANCELADA') {
          return callback(null, fail(`No se puede cancelar una reserva en estado ${reserva.status}`, 400));
        }
        const updated = await reservaRepo.update(reserva_id, { status: 'CANCELADA' });
        if (reserva.vehiculoId && (reserva.status === 'PENDIENTE' || reserva.status === 'CONFIRMADA')) {
          invClient.updateVehiculoStatus(reserva.vehiculoId, 'DISPONIBLE').catch(() => {});
        }
        callback(null, ok(updated));
      } catch (err: any) {
        callback(null, fail(err.message ?? 'Error interno', 500));
      }
    },

    // ── IniciarAlquiler ─────────────────────────────────────────────────────
    async IniciarAlquiler(call: any, callback: any) {
      try {
        const { reserva_id, km_salida, observaciones } = call.request;

        const reserva = await prisma.reserva.findUnique({ where: { id: reserva_id } });
        if (!reserva) {
          return callback(null, fail(`Reserva ${reserva_id} no encontrada`, 404));
        }
        if (reserva.status !== 'CONFIRMADA') {
          return callback(null, fail('Solo se puede iniciar un alquiler de una reserva CONFIRMADA', 400));
        }

        const existente = await alquilerRepo.findByReservaId(reserva_id);
        if (existente) {
          return callback(null, fail('Ya existe un alquiler para esta reserva', 400));
        }

        const alquiler = await prisma.$transaction(async (tx) => {
          const a = await tx.alquiler.create({
            data: {
              reservaId:    reserva_id,
              kmSalida:     km_salida,
              fechaInicio:  new Date(),
              observaciones: observaciones || undefined,
              status:       'ACTIVO',
            },
          });
          await tx.reserva.update({ where: { id: reserva_id }, data: { status: 'ACTIVA' } });
          return a;
        });

        if (reserva.vehiculoId) {
          invClient.updateVehiculoStatus(reserva.vehiculoId, 'EN_USO').catch(() => {});
        }

        const result = await alquilerRepo.findById(alquiler.id);
        callback(null, ok(result));
      } catch (err: any) {
        callback(null, fail(err.message ?? 'Error interno', 500));
      }
    },

    // ── RegistrarDevolucion ─────────────────────────────────────────────────
    async RegistrarDevolucion(call: any, callback: any) {
      try {
        const { alquiler_id, km_entrada, estado_vehiculo, cargo_extra = 0, observaciones } = call.request;

        const alquiler = await alquilerRepo.findById(alquiler_id);
        if (!alquiler) {
          return callback(null, fail(`Alquiler ${alquiler_id} no encontrado`, 404));
        }
        if (alquiler.status !== 'ACTIVO') {
          return callback(null, fail('El alquiler no está activo', 400));
        }

        const existente = await alquilerRepo.findDevolucion(alquiler_id);
        if (existente) {
          return callback(null, fail('Este alquiler ya tiene una devolución registrada', 400));
        }

        const reservaObj = await prisma.reserva.findUnique({ where: { id: alquiler.reservaId! } });

        const devolucion = await prisma.$transaction(async (tx) => {
          const d = await tx.devolucion.create({
            data: { alquilerId: alquiler_id, kmEntrada: km_entrada, estadoVehiculo: estado_vehiculo, cargoExtra: cargo_extra, observaciones },
          });
          await tx.alquiler.update({
            where: { id: alquiler_id },
            data:  { status: 'FINALIZADO', kmEntrada: km_entrada, fechaFin: new Date(), cargoAdicional: cargo_extra },
          });
          await tx.reserva.update({ where: { id: alquiler.reservaId! }, data: { status: 'COMPLETADA' } });
          return d;
        });

        if (reservaObj?.vehiculoId) {
          invClient.updateVehiculoStatus(reservaObj.vehiculoId, 'DISPONIBLE', km_entrada).catch(() => {});
        }

        callback(null, ok(devolucion));
      } catch (err: any) {
        callback(null, fail(err.message ?? 'Error interno', 500));
      }
    },
  });

  return server;
}

export function startOperacionesGrpcServer(
  reservaRepo:  ReservaRepository,
  alquilerRepo: AlquilerRepository,
  port:         number,
) {
  const server = createOperacionesGrpcServer(reservaRepo, alquilerRepo);
  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (err, boundPort) => {
      if (err) {
        console.error('[operaciones-grpc] Error al iniciar:', err.message);
        return;
      }
      console.log(`[operaciones-grpc] corriendo en puerto ${boundPort}`);
    },
  );
  return server;
}
