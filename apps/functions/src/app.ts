/**
 * Express application assembly.
 * Security posture: Helmet headers, CORS allowlist, body-size cap, IP rate
 * limiting, App Check attestation, Firebase Auth, Zod validation, structured
 * errors. The same app runs on Firebase Functions (2nd gen) and Cloud Run.
 */
import cors from 'cors';
import express, { type Express } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { notFound } from './lib/errors';
import { errorHandler } from './middleware/errorHandler';
import { requestContext } from './middleware/requestContext';
import { attachAuth, verifyAppCheck } from './middleware/security';
import { airQualityRouter } from './routes/airQuality';
import { assistantRouter } from './routes/assistant';
import { communityRouter } from './routes/community';
import { healthRouter } from './routes/health';
import { routineRouter } from './routes/routine';
import { swapsRouter } from './routes/swaps';
import { translateRouter } from './routes/translate';

const CORS_ORIGINS = [
  /^http:\/\/localhost:\d+$/,
  /^https:\/\/[a-z0-9-]+\.(web\.app|firebaseapp\.com)$/,
];

export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  // Behind exactly one Google frontend proxy (Cloud Run / Functions 2nd gen):
  // trust the first X-Forwarded-For hop so rate limits key on the real client.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: CORS_ORIGINS }));
  app.use(express.json({ limit: '64kb' }));
  app.use(requestContext);

  // Health probe stays outside auth/rate-limit for orchestration reliability.
  app.use('/api/health', healthRouter);

  app.use('/api', verifyAppCheck, attachAuth);
  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { error: { code: 'RATE_LIMITED', message: 'Too many requests; slow down.' } },
    }),
  );

  // GenAI endpoints get a tighter budget (cost + abuse control).
  const aiLimiter = rateLimit({
    windowMs: 60_000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Assistant budget reached; try shortly.' } },
  });

  app.use('/api/assistant', aiLimiter, assistantRouter);
  app.use('/api/routine', aiLimiter, routineRouter);
  app.use('/api/air-quality', airQualityRouter);
  app.use('/api/swaps', swapsRouter);
  app.use('/api/community', communityRouter);
  app.use('/api/translate', translateRouter);

  app.use((_req, _res, next) => next(notFound('No such API route')));
  app.use(errorHandler);

  return app;
}
