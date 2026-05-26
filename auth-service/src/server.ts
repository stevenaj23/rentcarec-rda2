import 'dotenv/config';
import app from './app.js';
import { logger } from './shared/logger.js';

const PORT = process.env.PORT ?? 3001;

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'auth-service iniciado');
});
