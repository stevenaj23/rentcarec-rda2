import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

const PROTO_LOCAL = path.join(process.cwd(), 'src', 'grpc', 'inventario.proto');

function loadPackage(host: string) {
  const def = protoLoader.loadSync(PROTO_LOCAL, {
    keepCase: true,
    longs:    String,
    enums:    String,
    defaults: true,
    oneofs:   true,
  });
  const pkg = (grpc.loadPackageDefinition(def) as any).inventario;
  return new pkg.InventarioService(host, grpc.credentials.createInsecure());
}

function call<T>(stub: any, method: string, req: object): Promise<T> {
  return new Promise((resolve, reject) => {
    const deadline = new Date(Date.now() + 5_000);
    stub[method](req, { deadline }, (err: any, res: T) => {
      if (err) return reject(err);
      resolve(res);
    });
  });
}

export class InventarioGrpcClient {
  private stub: any;

  constructor(host: string) {
    this.stub = loadPackage(host);
  }

  async getVehiculo(id: string): Promise<{
    found: boolean; id: string; status: string;
    precio_dia: number; is_active: boolean; nombre: string;
    imagen_url: string; agencia_id: string; categoria: string; placa: string;
  }> {
    return call(this.stub, 'GetVehiculo', { id });
  }

  async updateVehiculoStatus(id: string, status: string, kilometraje = 0): Promise<{ success: boolean }> {
    return call(this.stub, 'UpdateVehiculoStatus', { id, status, kilometraje });
  }

  async getExtra(id: string): Promise<{
    found: boolean; id: string; precio_dia: number; is_active: boolean; nombre: string;
  }> {
    return call(this.stub, 'GetExtra', { id });
  }
}

let _client: InventarioGrpcClient | null = null;

export function getInventarioClient(): InventarioGrpcClient {
  if (!_client) {
    const host = process.env['INVENTARIO_GRPC_HOST'] ?? 'localhost:5002';
    _client = new InventarioGrpcClient(host);
  }
  return _client;
}
