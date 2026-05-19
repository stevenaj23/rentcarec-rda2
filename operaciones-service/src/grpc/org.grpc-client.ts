import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

const PROTO_LOCAL = path.join(process.cwd(), 'src', 'grpc', 'org.proto');

function loadPackage(host: string) {
  const def = protoLoader.loadSync(PROTO_LOCAL, {
    keepCase: true,
    longs:    String,
    enums:    String,
    defaults: true,
    oneofs:   true,
  });
  const pkg = (grpc.loadPackageDefinition(def) as any).org;
  return new pkg.OrgService(host, grpc.credentials.createInsecure());
}

function call<T>(stub: any, method: string, req: object): Promise<T> {
  return new Promise((resolve, reject) => {
    stub[method](req, (err: any, res: T) => {
      if (err) return reject(err);
      resolve(res);
    });
  });
}

export class OrgGrpcClient {
  private stub: any;

  constructor(host: string) {
    this.stub = loadPackage(host);
  }

  async getAgencia(id: string): Promise<{
    found: boolean; id: string; nombre: string;
    ciudad_id: string; direccion: string; empresa: string;
  }> {
    return call(this.stub, 'GetAgencia', { id });
  }
}

let _client: OrgGrpcClient | null = null;

export function getOrgClient(): OrgGrpcClient {
  if (!_client) {
    const host = process.env['ORG_GRPC_HOST'] ?? 'localhost:5003';
    _client = new OrgGrpcClient(host);
  }
  return _client;
}
