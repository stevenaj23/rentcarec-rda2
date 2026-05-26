import 'dotenv/config';
import app from './app.js';
import { startFinancieroGrpcServer } from './grpc/financiero.grpc-server.js';
import { pagoRepository } from './shared/container.js';
import { logger } from './shared/logger.js';

const HTTP_PORT = Number(process.env.PORT ?? 3005);
const GRPC_PORT = Number(process.env.GRPC_PORT ?? 5005);

app.listen(HTTP_PORT, () => {
  logger.info({ httpPort: HTTP_PORT, grpcPort: GRPC_PORT }, 'financiero-service iniciado');
});

startFinancieroGrpcServer(pagoRepository, GRPC_PORT);
