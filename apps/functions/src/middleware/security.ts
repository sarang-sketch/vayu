/**
 * Firebase security middleware.
 *  - App Check (reCAPTCHA Enterprise attestation) blocks non-app traffic.
 *  - Firebase Auth ID-token verification identifies the caller.
 * Both enforce only when configured; demo mode skips with a warning so the
 * product stays explorable without a Firebase project.
 */
import type { NextFunction, Request, Response } from 'express';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAppCheck } from 'firebase-admin/app-check';
import { getAuth } from 'firebase-admin/auth';
import { config } from '../config';
import { forbidden, unauthorized } from '../lib/errors';
import { logWarn } from '../lib/logger';

function ensureAdminApp(): void {
  if (getApps().length === 0) {
    initializeApp({ projectId: config.projectId });
  }
}

/** Verify the X-Firebase-AppCheck token when enforcement is enabled. */
export async function verifyAppCheck(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (!config.appCheckEnabled) return next();
  const token = req.header('X-Firebase-AppCheck');
  if (!token) {
    logWarn('appcheck.rejected', { requestId: req.requestId, reason: 'missing_token' });
    return next(forbidden('App Check token required'));
  }
  try {
    ensureAdminApp();
    await getAppCheck().verifyToken(token);
    return next();
  } catch {
    logWarn('appcheck.rejected', { requestId: req.requestId, reason: 'invalid_token' });
    return next(forbidden('Invalid App Check token'));
  }
}

/** Attach req.uid when a valid Firebase ID token is presented (optional). */
export async function attachAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.header('Authorization');
  if (!header?.startsWith('Bearer ')) return next();
  try {
    ensureAdminApp();
    const decoded = await getAuth().verifyIdToken(header.slice(7));
    req.uid = decoded.uid;
  } catch {
    // Invalid tokens are treated as anonymous; protected routes use requireAuth.
  }
  return next();
}

/** Hard auth gate for owner-scoped writes. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (req.uid) return next();
  if (!config.firestoreEnabled) return next(); // demo mode: anonymous civic participation
  return next(unauthorized());
}
