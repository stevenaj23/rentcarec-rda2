import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { makeBreaker } from '../shared/circuit-breaker/grpc.breaker.js';

const PROTO_LOCAL = path.join(process.cwd(), 'src', 'grpc', 'inventario.proto');

export class InventarioUnavailableError extends Error {
  constructor() {
    super('inventario-service gRPC no disponible (circuit breaker abierto)');
    this.name = 'InventarioUnavailableError';
  }
}

function loadPackage(host: string) {
  const def = protoLoader.loadSync(PROTO_LOCAL, {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
  });
  const pkg = (grpc.loadPackageDefinition(def) as any).inventario;
  return new pkg.InventarioService(host, grpc.credentials.createInsecure(), {
    // Mantiene la conexión viva en Azure Container Apps / proxies intermedios
    'grpc.keepalive_time_ms':                10_000,
    'grpc.keepalive_timeout_ms':              5_000,
    'grpc.keepalive_permit_without_calls':        1,
    'grpc.http2.max_pings_without_data':          0,
    'grpc.http2.min_time_between_pings_ms': 10_000,
    // Reconectar automáticamente sin esperar al primer RPC
    'grpc.enable_retries':                        1,
    'grpc.initial_reconnect_backoff_ms':        500,
    'grpc.max_reconnect_backoff_ms':          10_000,
  });
}

function call<T>(stub: any, method: string, req: object): Promise<T> {
  return new Promise((resolve, reject) => {
    stub[method](req, { deadline: new Date(Date.now() + 5_000) }, (err: any, res: T) => {
      if (err) return reject(err);
      resolve(res);
    });
  });
}

type VehiculoResult = {
  found: boolean; id: string; status: string; precio_dia: number;
  is_active: boolean; nombre: string; imagen_url: string;
  agencia_id: string; categoria: string; placa: string;
};

type ExtraResult = {
  found: boolean; id: string; precio_dia: number; is_active: boolean; nombre: string;
};

export class InventarioGrpcClient {
  private stub: any;

  // Circuit breakers — uno por operación para aislamiento independiente
  private getVehiculoWithBreaker: (id: string) => Promise<VehiculoResult>;
  private updateStatusWithBreaker: (id: string, status: string, km: number) => Promise<{ success: boolean }>;
  private getExtraWithBreaker: (id: string) => Promise<ExtraResult>;

  constructor(host: string) {
    this.stub = loadPackage(host);

    this.getVehiculoWithBreaker = makeBreaker(
      (id: string) => call<VehiculoResult>(this.stub, 'GetVehiculo', { id }),
      // Fallback: el circuito está abierto → el servicio no está disponible.
      // Lanzar error (no devolver found:false) para que el caller distinga
      // "vehículo no existe" de "inventario-service caído".
      (_id: string) => { throw new InventarioUnavailableError(); },
      'inventario.GetVehiculo',
    );

    this.updateStatusWithBreaker = makeBreaker(
      (id: string, status: string, km: number) => call<{ success: boolean }>(this.stub, 'UpdateVehiculoStatus', { id, status, kilometraje: km }),
      () => ({ success: false }),
      'inventario.UpdateVehiculoStatus',
    );

    this.getExtraWithBreaker = makeBreaker(
      (id: string) => call<ExtraResult>(this.stub, 'GetExtra', { id }),
      (id: string) => ({ found: false, id, precio_dia: 0, is_active: false, nombre: '' }),
      'inventario.GetExtra',
    );
  }

  getVehiculo(id: string): Promise<VehiculoResult> {
    return this.getVehiculoWithBreaker(id);
  }

  updateVehiculoStatus(id: string, status: string, kilometraje = 0): Promise<{ success: boolean }> {
    return this.updateStatusWithBreaker(id, status, kilometraje);
  }

  getExtra(id: string): Promise<ExtraResult> {
    return this.getExtraWithBreaker(id);
  }
}

let _client: InventarioGrpcClient | null = null;

export function getInventarioClient(): InventarioGrpcClient {
  if (!_client) {
    _client = new InventarioGrpcClient(process.env['INVENTARIO_GRPC_HOST'] ?? 'localhost:5002');
  }
  return _client;
}
