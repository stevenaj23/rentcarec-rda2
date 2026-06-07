import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createOrchestratorRouter } from './modules/orchestrator/orchestrator.routes.js';
import { isSenderConnected, publishEvent } from './shared/bus/rabbitmq-bus.js';
import { addSseClient, removeSseClient, getSseClientCount, broadcastSse } from './shared/sse-hub.js';
import pinoHttp from 'pino-http';
import { logger } from './shared/logger.js';
import { correlationMiddleware } from './shared/middlewares/correlation.middleware.js';
import type { EventType } from './shared/bus/event-types.js';

const app = express();

app.set('trust proxy', 1);
app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }));
app.use(express.json());
app.use(correlationMiddleware);
app.use(pinoHttp({
  logger,
  customProps: (_req, res) => ({ correlationId: res.locals['correlationId'] }),
  autoLogging: { ignore: (req) => req.url === '/health' },
}));

app.get('/health', (_req, res) => {
  res.json({
    service: 'bus-service',
    status: 'ok',
    rabbitmq: isSenderConnected(),
    sseClients: getSseClientCount(),
    timestamp: new Date().toISOString(),
  });
});

// ── SSE: stream de eventos en tiempo real ──────────────────────────────────────
// GET /api/v1/stevenariel/bus/stream → navegador o app se suscribe
app.get('/api/v1/stevenariel/bus/stream', (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // desactiva buffering en nginx
  res.flushHeaders();

  // Primer evento: confirmar conexión
  res.write(`event: connected\ndata: ${JSON.stringify({ ts: new Date().toISOString() })}\n\n`);

  addSseClient(res);

  // Heartbeat cada 25s para mantener la conexión viva a través de proxies
  const heartbeat = setInterval(() => { try { res.write(':ping\n\n'); } catch { /* cerrada */ } }, 25_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeSseClient(res);
  });
});

// ── Emit interno: llamado por otros servicios (operaciones, inventario) ────────
// POST /api/v1/stevenariel/bus/stream/emit → body: { tipo, entidadId, payload, usuarioId? }
app.post('/api/v1/stevenariel/bus/stream/emit', async (req, res) => {
  try {
    const { tipo, entidadId, payload, usuarioId = 'system' } = req.body as {
      tipo: EventType; entidadId: string; payload: Record<string, unknown>; usuarioId?: string;
    };
    if (!tipo || !entidadId) { res.status(400).json({ error: 'tipo y entidadId requeridos' }); return; }
    // Publica en RabbitMQ (que a su vez hace broadcastSse vía rabbitmq-bus)
    await publishEvent(tipo, usuarioId, entidadId, payload ?? {});
    res.json({ ok: true });
  } catch (err: any) {
    logger.error({ err: err?.message }, 'Error en /stream/emit');
    // Fallback: broadcast directo por SSE aunque RabbitMQ falle
    try {
      const { tipo, entidadId, payload } = req.body as any;
      broadcastSse(tipo, { entidadId, payload, occurredAt: new Date().toISOString() });
    } catch { /* nada */ }
    res.json({ ok: true, rabbitmq: false });
  }
});

app.use('/api/v1/stevenariel/bus', createOrchestratorRouter());

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'Error no controlado');
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message ?? 'Error interno' } });
});

export default app;
