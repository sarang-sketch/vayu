/**
 * Central error handler. Converts Zod failures, ApiErrors and unexpected
 * exceptions into a consistent JSON envelope; logs 5xx to Cloud Logging.
 */
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../lib/errors';
import { logError } from '../lib/logger';

export interface ErrorEnvelope {
  error: { code: string; message: string; requestId: string };
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  let status = 500;
  let code = 'INTERNAL';
  let message = 'An unexpected error occurred';

  if (err instanceof ZodError) {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
  } else if (err instanceof ApiError) {
    status = err.status;
    code = err.code;
    message = err.message;
  }
  // Unexpected errors keep the generic message client-side; details go to logs only.

  if (status >= 500) {
    logError('service.error', err, { requestId: req.requestId, path: req.path });
  }

  const envelope: ErrorEnvelope = {
    error: { code, message, requestId: req.requestId ?? 'unknown' },
  };
  res.status(status).json(envelope);
}
