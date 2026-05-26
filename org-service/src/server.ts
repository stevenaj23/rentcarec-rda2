import 'dotenv/config';
import app from './app.js';
import { startOrgGrpcServer } from './grpc/org.grpc-server.js';
import { OrganizacionRepository } from './modules/organizaciones/organizacion.repository.js';
import prisma from './shared/database/prisma.js';
import { logger } from './shared/logger.js';

const HTTP_PORT = Number(process.env.PORT ?? 3003);
const GRPC_PORT = Number(process.env.GRPC_PORT ?? 5003);

const orgRepository = new OrganizacionRepository(prisma);

app.listen(HTTP_PORT, () => {
  logger.info({ httpPort: HTTP_PORT, grpcPort: GRPC_PORT }, 'org-service iniciado');
});

startOrgGrpcServer(orgRepository, GRPC_PORT);
