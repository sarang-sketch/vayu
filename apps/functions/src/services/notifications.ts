/**
 * Firebase Cloud Messaging — Severe-smog push alerts.
 * Driven by a Cloud Scheduler trigger (every 60 minutes) that re-checks the
 * Google Air Quality API for each subscribed city and multicasts to devices.
 */
import { getMessaging } from 'firebase-admin/messaging';
import { logInfo } from '../lib/logger';
import { fetchCurrent } from './airQuality';
import { getDb, listAlertSubscriptions } from './firestore';

const ALERT_THRESHOLD = 401; // CPCB "Severe"

export async function runSmogAlertSweep(): Promise<{ checked: number; sent: number }> {
  const db = getDb();
  if (!db) {
    logInfo('service.demo_fallback', { service: 'fcm', reason: 'no_firestore_credentials' });
    return { checked: 0, sent: 0 };
  }

  const subscriptions = await listAlertSubscriptions();
  let sent = 0;

  for (const sub of subscriptions) {
    if (sub.tokens.length === 0) continue;
    const snapshot = await fetchCurrent(sub.lat, sub.lng, sub.city);
    if (snapshot.aqi < ALERT_THRESHOLD) continue;

    const result = await getMessaging().sendEachForMulticast({
      tokens: sub.tokens,
      notification: {
        title: `Severe smog alert — ${sub.city}`,
        body: `AQI ${snapshot.aqi}. Stay indoors, seal windows, run purifiers. Tap for your smog-safe routine.`,
      },
      data: { aqi: String(snapshot.aqi), city: sub.city, kind: 'smog_alert' },
      android: { priority: 'high' },
    });
    sent += result.successCount;
    logInfo('smog.alert_sent', { city: sub.city, aqi: snapshot.aqi, devices: result.successCount });
  }

  return { checked: subscriptions.length, sent };
}
