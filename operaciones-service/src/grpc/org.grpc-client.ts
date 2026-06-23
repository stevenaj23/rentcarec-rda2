import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { makeBreaker } from '../shared/circuit-breaker/grpc.breaker.js';

const PROTO_LOCAL = path.join(process.cwd(), 'src', 'grpc', 'org.proto');

function loadPackage(host: string) {
  const def = protoLoader.loadSync(PROTO_LOCAL, {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
  });
  const pkg = (grpc.loadPackageDefinition(def) as any).org;
  return new pkg.OrgService(host, grpc.credentials.createInsecure());
}

function call<T>(stub: any, method: string, req: object): Promise<T> {
  return new Promise((resolve, reject) => {
    stub[method](req, { deadline: new Date(Date.now() + 5_000) }, (err: any, res: T) => {
      if (err) return reject(err);
      resolve(res);
    });
  });
}

type AgenciaResult = {
  found: boolean; id: string; nombre: string;
  ciudad_id: string; direccion: string; empresa: string;
};

export class OrgGrpcClient {
  private stub: any;
  private getAgenciaWithBreaker: (id: string) => Promise<AgenciaResult>;

  constructor(host: string) {
    this.stub = loadPackage(host);

    this.getAgenciaWithBreaker = makeBreaker(
      (id: string) => call<AgenciaResult>(this.stub, 'GetAgencia', { id }),
      (id: string) => ({ found: false, id, nombre: 'Agencia desconocida', ciudad_id: '', direccion: '', empresa: '' }),
      'org.GetAgencia',
    );
  }

  getAgencia(id: string): Promise<AgenciaResult> {
    return this.getAgenciaWithBreaker(id);
  }
}

let _client: OrgGrpcClient | null = null;

export function getOrgClient(): OrgGrpcClient {
  if (!_client) {
    _client = new OrgGrpcClient(process.env['ORG_GRPC_HOST'] ?? 'localhost:5003');
  }
  return _client;
}
