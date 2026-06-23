import 'dotenv/config';
import app from './app.js';
import { startInventarioGrpcServer } from './grpc/inventario.grpc-server.js';
import { vehiculoRepository } from './shared/container.js';
import { ExtraRepository } from './modules/extras/extra.repository.js';
import prisma from './shared/database/prisma.js';
import { logger } from './shared/logger.js';
import { startInventarioConsumer } from './events/inventario.consumer.js';

const HTTP_PORT = Number(process.env.PORT ?? 3002);
const GRPC_PORT = Number(process.env.GRPC_PORT ?? 5002);

const extraRepository = new ExtraRepository(prisma);

app.listen(HTTP_PORT, () => {
  logger.info({ httpPort: HTTP_PORT, grpcPort: GRPC_PORT }, 'inventario-service iniciado');
});

startInventarioGrpcServer(vehiculoRepository, extraRepository, GRPC_PORT);
startInventarioConsumer();
