/**
 * Firebase Cloud Functions (2nd gen) entry point.
 *  - api        : HTTPS function backing the web app (also Cloud Run compatible)
 *  - smogAlerts : Cloud Scheduler sweep → FCM multicast when AQI ≥ 401
 */
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { createApp } from './app';
import { functionSecrets } from './config';
import { logError, logInfo } from './lib/logger';
import { runSmogAlertSweep } from './services/notifications';

export const api = onRequest(
  {
    region: 'asia-south1',
    secrets: functionSecrets,
    maxInstances: 10,
    memory: '512MiB',
    timeoutSeconds: 60,
  },
  createApp(),
);

export const smogAlerts = onSchedule(
  { schedule: 'every 60 minutes', region: 'asia-south1', timeZone: 'Asia/Kolkata' },
  async () => {
    try {
      const result = await runSmogAlertSweep();
      logInfo('smog.alert_sent', { sweep: true, ...result });
    } catch (error) {
      logError('service.error', error, { scope: 'smogAlerts' });
      throw error;
    }
  },
);
