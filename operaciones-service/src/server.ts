import 'dotenv/config';
import app from './app.js';
import { startOperacionesGrpcServer } from './grpc/operaciones.grpc-server.js';
import { reservaRepository, alquilerRepository } from './shared/container.js';
import { logger } from './shared/logger.js';
import { startOutboxProcessor } from './jobs/outbox-processor.js';

const HTTP_PORT = Number(process.env.PORT ?? 3004);
const GRPC_PORT = Number(process.env.GRPC_PORT ?? 5004);

app.listen(HTTP_PORT, () => {
  logger.info({ httpPort: HTTP_PORT, grpcPort: GRPC_PORT }, 'operaciones-service iniciado');
});

startOperacionesGrpcServer(reservaRepository, alquilerRepository, GRPC_PORT);
startOutboxProcessor();
