import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { createAuthRouter }    from './modules/auth/auth.routes.js';
import { createUsuarioRouter } from './modules/usuarios/usuario.routes.js';
import { authController, usuarioController } from './shared/container.js';
import { errorHandler } from './shared/errors/error.middleware.js';
import { swaggerSpec } from './shared/swagger.js';
import pinoHttp from 'pino-http';
import { logger } from './shared/logger.js';
import { correlationMiddleware } from './shared/middlewares/correlation.middleware.js';

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
  res.json({ service: 'auth-service', status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/v1/stevenariel/auth',     createAuthRouter(authController));
app.use('/api/v1/stevenariel/usuarios', createUsuarioRouter(usuarioController));

app.use(errorHandler);

export default app;
