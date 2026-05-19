import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { PagoRepository } from '../modules/pagos/pago.repository.js';

const PROTO_PATH = path.join(process.cwd(), 'src', 'grpc', 'financiero.proto');

function loadPackage() {
  const def = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs:    String,
    enums:    String,
    defaults: true,
    oneofs:   true,
  });
  return (grpc.loadPackageDefinition(def) as any).financiero;
}

export function createFinancieroGrpcServer(pagoRepo: PagoRepository): grpc.Server {
  const pkg    = loadPackage();
  const server = new grpc.Server();

  server.addService(pkg.FinancieroService.service, {

    async GetPagosByReserva(call: any, callback: any) {
      try {
        const pagos = await pagoRepo.findByReservaId(call.request.reserva_id);
        callback(null, {
          pagos: pagos.map((p: any) => ({
            id:          p.id,
            monto:       Number(p.monto),
            metodo_pago: p.metodoPago,
            referencia:  p.referencia ?? '',
            status:      p.status,
            created_at:  p.createdAt?.toISOString() ?? '',
          })),
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

export function startFinancieroGrpcServer(pagoRepo: PagoRepository, port: number) {
  const server = createFinancieroGrpcServer(pagoRepo);
  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (err, boundPort) => {
      if (err) {
        console.error('[financiero-grpc] Error al iniciar:', err.message);
        return;
      }
      console.log(`[financiero-grpc] corriendo en puerto ${boundPort}`);
    },
  );
  return server;
}
