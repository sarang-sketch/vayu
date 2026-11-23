/**
 * Lazy Firebase Admin Firestore access.
 * Returns null when credentials are unavailable (local/demo), letting every
 * caller degrade gracefully instead of crashing.
 */
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import {
  airQualitySnapshotSchema,
  type AirQualitySnapshot,
  type CommunityReport,
  type DailyRoutine,
} from '@vayusense/shared';
import { config } from '../config';

let cached: Firestore | null | undefined;

export function getDb(): Firestore | null {
  if (cached !== undefined) return cached;
  if (!config.firestoreEnabled) {
    cached = null;
    return cached;
  }
  try {
    if (getApps().length === 0) {
      initializeApp({ credential: applicationDefault(), projectId: config.projectId });
    }
    cached = getFirestore();
  } catch {
    cached = null;
  }
  return cached;
}

/** Grid cell key (~1.1 km resolution) for the AQI cache. */
export const cacheKey = (lat: number, lng: number): string =>
  `aqi_${lat.toFixed(2)}_${lng.toFixed(2)}`;

export async function readCachedSnapshot(key: string): Promise<AirQualitySnapshot | null> {
  const db = getDb();
  if (!db) return null;
  const doc = await db.collection('aqiCache').doc(key).get();
  if (!doc.exists) return null;
  const data = doc.data();
  const expiresAt = data?.expiresAt as Timestamp | undefined;
  if (!expiresAt || expiresAt.toMillis() < Date.now()) return null;
  // Validate cached payloads — a corrupt or stale-schema document is a miss.
  const parsed = airQualitySnapshotSchema.safeParse(data?.payload);
  return parsed.success ? parsed.data : null;
}

export async function writeCachedSnapshot(
  key: string,
  snapshot: AirQualitySnapshot,
  ttlMinutes = 15,
): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db
    .collection('aqiCache')
    .doc(key)
    .set({
      payload: snapshot,
      expiresAt: Timestamp.fromMillis(Date.now() + ttlMinutes * 60_000),
    });
}

export async function saveReport(report: CommunityReport, authorUid?: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db
    .collection('communityReports')
    .doc(report.id)
    .set({ ...report, authorUid: authorUid ?? 'anonymous' });
}

export async function listReports(limit = 20): Promise<CommunityReport[]> {
  const db = getDb();
  if (!db) return [];
  const snap = await db
    .collection('communityReports')
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  // Strip authorUid — the public feed must not expose user identifiers.
  return snap.docs.map((doc) => {
    const { authorUid: _authorUid, ...report } = doc.data();
    return report as CommunityReport;
  });
}

export async function saveRoutine(ownerUid: string, routine: DailyRoutine): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.collection('routines').add({ ownerUid, ...routine, generatedAt: Timestamp.now() });
}

export interface AlertSubscription {
  city: string;
  lat: number;
  lng: number;
  tokens: string[];
}

export async function listAlertSubscriptions(): Promise<AlertSubscription[]> {
  const db = getDb();
  if (!db) return [];
  const snap = await db.collection('alertSubscriptions').get();
  return snap.docs.map((doc) => doc.data() as AlertSubscription);
}
