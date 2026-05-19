import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

const PROTO_PATH = path.join(process.cwd(), 'src', 'grpc', 'operaciones.proto');

interface ExtraInput {
  extra_id: string;
  cantidad: number;
}

interface OperacionResponse {
  success:       boolean;
  data_json:     string;
  error_message: string;
  error_code:    number;
}

function loadPackage(host: string) {
  const def = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs:    String,
    enums:    String,
    defaults: true,
    oneofs:   true,
  });
  const pkg = (grpc.loadPackageDefinition(def) as any).operaciones;
  return new pkg.OperacionesService(host, grpc.credentials.createInsecure());
}

function call(stub: any, method: string, req: object): Promise<OperacionResponse> {
  return new Promise((resolve, reject) => {
    stub[method](req, (err: any, res: OperacionResponse) => {
      if (err) return reject(err);
      resolve(res);
    });
  });
}

export class OperacionesGrpcClient {
  private stub: any;

  constructor(host: string) {
    this.stub = loadPackage(host);
  }

  async crearReserva(params: {
    usuario_id:     string;
    vehiculo_id:    string;
    agencia_id:     string;
    fecha_inicio:   string;
    fecha_fin:      string;
    seguro_id?:     string;
    canal_venta_id?: string;
    notas?:         string;
    extras?:        ExtraInput[];
  }): Promise<OperacionResponse> {
    return call(this.stub, 'CrearReserva', {
      ...params,
      seguro_id:      params.seguro_id      ?? '',
      canal_venta_id: params.canal_venta_id ?? '',
      notas:          params.notas          ?? '',
      extras:         params.extras         ?? [],
    });
  }

  async cancelarReserva(reservaId: string, usuarioId: string): Promise<OperacionResponse> {
    return call(this.stub, 'CancelarReserva', {
      reserva_id: reservaId,
      usuario_id: usuarioId,
    });
  }

  async iniciarAlquiler(params: {
    reserva_id:    string;
    km_salida:     number;
    observaciones?: string;
    usuario_id:    string;
  }): Promise<OperacionResponse> {
    return call(this.stub, 'IniciarAlquiler', {
      ...params,
      observaciones: params.observaciones ?? '',
    });
  }

  async registrarDevolucion(params: {
    alquiler_id:     string;
    km_entrada:      number;
    estado_vehiculo?: string;
    cargo_extra?:    number;
    observaciones?:  string;
  }): Promise<OperacionResponse> {
    return call(this.stub, 'RegistrarDevolucion', {
      ...params,
      estado_vehiculo: params.estado_vehiculo ?? '',
      cargo_extra:     params.cargo_extra     ?? 0,
      observaciones:   params.observaciones   ?? '',
    });
  }
}

let _client: OperacionesGrpcClient | null = null;

export function getOperacionesClient(): OperacionesGrpcClient {
  if (!_client) {
    const host = process.env['OPERACIONES_GRPC_HOST'] ?? 'localhost:5004';
    _client = new OperacionesGrpcClient(host);
  }
  return _client;
}
