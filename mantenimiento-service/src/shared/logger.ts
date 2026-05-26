import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: { service: 'mantenimiento-service' },
  timestamp: pino.stdTimeFunctions.isoTime,
});
