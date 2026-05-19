import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

const PROTO_LOCAL = path.join(process.cwd(), 'src', 'grpc', 'financiero.proto');

function loadPackage(host: string) {
  const def = protoLoader.loadSync(PROTO_LOCAL, {
    keepCase: true,
    longs:    String,
    enums:    String,
    defaults: true,
    oneofs:   true,
  });
  const pkg = (grpc.loadPackageDefinition(def) as any).financiero;
  return new pkg.FinancieroService(host, grpc.credentials.createInsecure());
}

function call<T>(stub: any, method: string, req: object): Promise<T> {
  return new Promise((resolve, reject) => {
    stub[method](req, (err: any, res: T) => {
      if (err) return reject(err);
      resolve(res);
    });
  });
}

export class FinancieroGrpcClient {
  private stub: any;

  constructor(host: string) {
    this.stub = loadPackage(host);
  }

  async getPagosByReserva(reservaId: string): Promise<{
    pagos: Array<{
      id: string; monto: number; metodo_pago: string;
      referencia: string; status: string; created_at: string;
    }>;
  }> {
    return call(this.stub, 'GetPagosByReserva', { reserva_id: reservaId });
  }
}

let _client: FinancieroGrpcClient | null = null;

export function getFinancieroClient(): FinancieroGrpcClient {
  if (!_client) {
    const host = process.env['FINANCIERO_GRPC_HOST'] ?? 'localhost:5005';
    _client = new FinancieroGrpcClient(host);
  }
  return _client;
}
