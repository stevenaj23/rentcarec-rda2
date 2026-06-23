import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export function correlationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const correlationId =
    (req.headers['x-correlation-id'] as string | undefined) ?? randomUUID();

  res.locals['correlationId'] = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
}
