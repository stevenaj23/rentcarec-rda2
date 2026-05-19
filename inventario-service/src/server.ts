import 'dotenv/config';
import app from './app.js';
import { startInventarioGrpcServer } from './grpc/inventario.grpc-server.js';
import { vehiculoRepository } from './shared/container.js';
import { ExtraRepository } from './modules/extras/extra.repository.js';
import prisma from './shared/database/prisma.js';

const HTTP_PORT = Number(process.env.PORT ?? 3002);
const GRPC_PORT = Number(process.env.GRPC_PORT ?? 5002);

// Repositorio de extras para el servidor gRPC
const extraRepository = new ExtraRepository(prisma);

app.listen(HTTP_PORT, () => {
  console.log(`🚗 inventario-service HTTP en http://localhost:${HTTP_PORT}`);
  console.log(`   → http://localhost:${HTTP_PORT}/api/v1/stevenariel/vehiculos`);
  console.log(`   → http://localhost:${HTTP_PORT}/api/v1/stevenariel/extras`);
});

startInventarioGrpcServer(vehiculoRepository, extraRepository, GRPC_PORT);
