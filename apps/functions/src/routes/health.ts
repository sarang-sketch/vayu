import { Router } from 'express';
import { config } from '../config';

export const healthRouter = Router();

/** Liveness/readiness probe used by Cloud Run and uptime checks. */
healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'vayusense-api',
    version: '1.0.0',
    uptimeSeconds: Math.round(process.uptime()),
    services: {
      gemini: config.demo.ai ? 'demo' : config.useVertexAi ? 'vertex_ai' : 'ai_studio',
      airQuality: config.demo.airQuality ? 'demo' : 'google_air_quality_api',
      sentiment: config.demo.sentiment ? 'lexicon' : 'google_natural_language',
      translation: config.demo.translate ? 'dictionary' : 'google_cloud_translation',
      recaptcha: config.demo.recaptcha ? 'demo' : 'recaptcha_enterprise',
      firestore: config.firestoreEnabled ? 'connected' : 'demo',
    },
  });
});
