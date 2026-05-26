import 'dotenv/config';
import app from './app.js';
import { logger } from './shared/logger.js';

const PORT = process.env.PORT ?? 3006;

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'mantenimiento-service iniciado');
});
