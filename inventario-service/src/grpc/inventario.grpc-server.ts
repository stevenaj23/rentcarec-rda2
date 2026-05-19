import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { VehiculoRepository } from '../modules/vehiculos/vehiculo.repository.js';
import { ExtraRepository }    from '../modules/extras/extra.repository.js';

const PROTO_PATH = path.join(process.cwd(), 'src', 'grpc', 'inventario.proto');

function loadPackage() {
  const def = protoLoader.loadSync(PROTO_PATH, {
    keepCase:     true,
    longs:        String,
    enums:        String,
    defaults:     true,
    oneofs:       true,
  });
  return (grpc.loadPackageDefinition(def) as any).inventario;
}

export function createInventarioGrpcServer(
  vehiculoRepo: VehiculoRepository,
  extraRepo:    ExtraRepository,
): grpc.Server {
  const pkg    = loadPackage();
  const server = new grpc.Server();

  server.addService(pkg.InventarioService.service, {

    async GetVehiculo(call: any, callback: any) {
      try {
        const vehiculo = await vehiculoRepo.findById(call.request.id);
        if (!vehiculo) {
          return callback(null, { found: false });
        }
        const nombre = [
          vehiculo.modelo?.marca?.nombre ?? '',
          vehiculo.modelo?.nombre       ?? '',
          vehiculo.anio,
        ].filter(Boolean).join(' ').trim();

        callback(null, {
          found:      true,
          id:         vehiculo.id,
          status:     vehiculo.status,
          precio_dia: Number(vehiculo.precioDia),
          is_active:  vehiculo.isActive,
          nombre,
          imagen_url: vehiculo.imagenUrl  ?? '',
          agencia_id: vehiculo.agenciaId  ?? '',
          categoria:  vehiculo.categoria?.nombre ?? '',
        });
      } catch (err: any) {
        callback({
          code:    grpc.status.INTERNAL,
          message: err.message ?? 'Error interno',
        });
      }
    },

    async UpdateVehiculoStatus(call: any, callback: any) {
      try {
        const { id, status, kilometraje } = call.request;
        const data: any = {};
        if (status)      data.status      = status;
        if (kilometraje) data.kilometraje = kilometraje;
        await vehiculoRepo.update(id, data);
        callback(null, { success: true });
      } catch (err: any) {
        callback({
          code:    grpc.status.INTERNAL,
          message: err.message ?? 'Error actualizando vehículo',
        });
      }
    },

    async GetExtra(call: any, callback: any) {
      try {
        const extra = await extraRepo.findById(call.request.id);
        if (!extra) {
          return callback(null, { found: false });
        }
        callback(null, {
          found:     true,
          id:        extra.id,
          precio_dia: Number(extra.precioDia),
          is_active: extra.isActive,
          nombre:    extra.nombre,
        });
      } catch (err: any) {
        callback({
          code:    grpc.status.INTERNAL,
          message: err.message ?? 'Error interno',
        });
      }
    },
  });

  return server;
}

export function startInventarioGrpcServer(
  vehiculoRepo: VehiculoRepository,
  extraRepo:    ExtraRepository,
  port:         number,
) {
  const server = createInventarioGrpcServer(vehiculoRepo, extraRepo);
  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (err, boundPort) => {
      if (err) {
        console.error('[inventario-grpc] Error al iniciar:', err.message);
        return;
      }
      console.log(`[inventario-grpc] corriendo en puerto ${boundPort}`);
    },
  );
  return server;
}
