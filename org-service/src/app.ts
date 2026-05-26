import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { createOrganizacionRouter } from './modules/organizaciones/organizacion.routes.js';
import { createUbicacionRouter }   from './modules/ubicaciones/ubicacion.routes.js';
import { organizacionController, ubicacionController } from './shared/container.js';
import { errorHandler } from './shared/errors/error.middleware.js';
import { swaggerSpec } from './shared/swagger.js';
import pinoHttp from 'pino-http';
import { logger } from './shared/logger.js';

const app = express();

app.set('trust proxy', 1);
app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }));
app.use(express.json());
app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));

app.get('/health', (_req, res) => {
  res.json({ service: 'org-service', status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/v1/stevenariel', createOrganizacionRouter(organizacionController));
app.use('/api/v1/stevenariel', createUbicacionRouter(ubicacionController));

app.use(errorHandler);

export default app;
