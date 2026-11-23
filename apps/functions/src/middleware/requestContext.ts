/**
 * Request context: correlation id + latency, emitted to Cloud Logging on
 * completion. The id is echoed to clients for support traceability.
 */
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { logInfo } from '../lib/logger';

declare module 'express-serve-static-core' {
  interface Request {
    requestId: string;
    /** Verified Firebase uid, when present. */
    uid?: string;
  }
}

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  req.requestId = randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    logInfo('request.completed', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Math.round(durationMs),
    });
  });

  next();
}
