import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createOrchestratorRouter } from './modules/orchestrator/orchestrator.routes.js';
import { isSenderConnected } from './shared/bus/service-bus.js';
import pinoHttp from 'pino-http';
import { logger } from './shared/logger.js';

const app = express();

app.set('trust proxy', 1);
app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }));
app.use(express.json());
app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));

app.get('/health', (_req, res) => {
  res.json({
    service: 'bus-service',
    status: 'ok',
    azureServiceBus: isSenderConnected(),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/v1/stevenariel/bus', createOrchestratorRouter());

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'Error no controlado');
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message ?? 'Error interno' } });
});

export default app;
