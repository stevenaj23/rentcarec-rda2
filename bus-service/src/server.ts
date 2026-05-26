import 'dotenv/config';
import app from './app.js';
import { logger } from './shared/logger.js';

const PORT = Number(process.env.PORT ?? 3007);

app.listen(PORT, () => {
  logger.info({
    port: PORT,
    azureServiceBus: process.env.AZURE_SERVICEBUS_CONNECTION_STRING ? 'conectado' : 'modo local',
  }, 'bus-service iniciado');
});
