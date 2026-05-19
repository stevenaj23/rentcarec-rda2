import 'dotenv/config';
import app from './app.js';
import { startFinancieroGrpcServer } from './grpc/financiero.grpc-server.js';
import { pagoRepository } from './shared/container.js';

const HTTP_PORT = Number(process.env.PORT ?? 3005);
const GRPC_PORT = Number(process.env.GRPC_PORT ?? 5005);

app.listen(HTTP_PORT, () => {
  console.log(`💳 financiero-service HTTP en http://localhost:${HTTP_PORT}`);
  console.log(`   → http://localhost:${HTTP_PORT}/api/v1/stevenariel/pagos`);
  console.log(`   → http://localhost:${HTTP_PORT}/api/v1/stevenariel/facturas`);
});

startFinancieroGrpcServer(pagoRepository, GRPC_PORT);
