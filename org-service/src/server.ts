import 'dotenv/config';
import app from './app.js';
import { startOrgGrpcServer } from './grpc/org.grpc-server.js';
import { OrganizacionRepository } from './modules/organizaciones/organizacion.repository.js';
import prisma from './shared/database/prisma.js';

const HTTP_PORT = Number(process.env.PORT ?? 3003);
const GRPC_PORT = Number(process.env.GRPC_PORT ?? 5003);

const orgRepository = new OrganizacionRepository(prisma);

app.listen(HTTP_PORT, () => {
  console.log(`🏢 org-service HTTP en http://localhost:${HTTP_PORT}`);
  console.log(`   → http://localhost:${HTTP_PORT}/api/v1/stevenariel/agencias`);
  console.log(`   → http://localhost:${HTTP_PORT}/api/v1/stevenariel/empresas`);
});

startOrgGrpcServer(orgRepository, GRPC_PORT);
