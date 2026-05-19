import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { OrganizacionRepository } from '../modules/organizaciones/organizacion.repository.js';

const PROTO_PATH = path.join(process.cwd(), 'src', 'grpc', 'org.proto');

function loadPackage() {
  const def = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs:    String,
    enums:    String,
    defaults: true,
    oneofs:   true,
  });
  return (grpc.loadPackageDefinition(def) as any).org;
}

export function createOrgGrpcServer(orgRepo: OrganizacionRepository): grpc.Server {
  const pkg    = loadPackage();
  const server = new grpc.Server();

  server.addService(pkg.OrgService.service, {

    async GetAgencia(call: any, callback: any) {
      try {
        const agencia = await orgRepo.findAgenciaById(call.request.id);
        if (!agencia) {
          return callback(null, { found: false });
        }
        callback(null, {
          found:     true,
          id:        agencia.id,
          nombre:    agencia.nombre,
          ciudad_id: agencia.ciudadId ?? '',
          direccion: (agencia as any).direccion ?? '',
          empresa:   (agencia as any).empresa?.nombre ?? '',
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

export function startOrgGrpcServer(orgRepo: OrganizacionRepository, port: number) {
  const server = createOrgGrpcServer(orgRepo);
  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (err, boundPort) => {
      if (err) {
        console.error('[org-grpc] Error al iniciar:', err.message);
        return;
      }
      console.log(`[org-grpc] corriendo en puerto ${boundPort}`);
    },
  );
  return server;
}
