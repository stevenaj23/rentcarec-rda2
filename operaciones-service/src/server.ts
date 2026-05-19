import 'dotenv/config';
import app from './app.js';
import { startOperacionesGrpcServer } from './grpc/operaciones.grpc-server.js';
import { reservaRepository, alquilerRepository } from './shared/container.js';

const HTTP_PORT = Number(process.env.PORT ?? 3004);
const GRPC_PORT = Number(process.env.GRPC_PORT ?? 5004);

app.listen(HTTP_PORT, () => {
  console.log(`📋 operaciones-service HTTP en http://localhost:${HTTP_PORT}`);
  console.log(`   → http://localhost:${HTTP_PORT}/api/v1/stevenariel/reservas`);
  console.log(`   → http://localhost:${HTTP_PORT}/api/v1/stevenariel/alquileres`);
  console.log(`   → http://localhost:${HTTP_PORT}/api/v1/stevenariel/devoluciones`);
});

startOperacionesGrpcServer(reservaRepository, alquilerRepository, GRPC_PORT);
