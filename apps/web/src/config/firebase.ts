/**
 * Firebase bootstrap (modular v11 SDK).
 * Initializes Auth (Google Sign-In), Firestore, App Check (reCAPTCHA
 * Enterprise), Remote Config and Cloud Messaging — each guarded so the app
 * runs in demo mode when Firebase is not configured.
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, type AppCheck } from 'firebase/app-check';
import { getRemoteConfig, type RemoteConfig } from 'firebase/remote-config';
import { getMessaging, type Messaging } from 'firebase/messaging';
import { env, firebaseEnabled, recaptchaEnabled } from './env';

export const firebaseApp: FirebaseApp | null = firebaseEnabled
  ? initializeApp({
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.VITE_FIREBASE_APP_ID,
      measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
    })
  : null;

export const auth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;
export const db: Firestore | null = firebaseApp ? getFirestore(firebaseApp) : null;
export const googleProvider = new GoogleAuthProvider();

export const remoteConfig: RemoteConfig | null = firebaseApp ? getRemoteConfig(firebaseApp) : null;

export const messaging: Messaging | null = (() => {
  if (!firebaseApp) return null;
  try {
    return getMessaging(firebaseApp);
  } catch {
    return null; // unsupported browser (e.g. private mode)
  }
})();

// App Check attestation — proves requests come from this genuine web app.
export const appCheck: AppCheck | null = (() => {
  if (!firebaseApp || !recaptchaEnabled) return null;
  try {
    return initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaEnterpriseProvider(env.VITE_RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  } catch {
    // App Check is best-effort on the client; the API enforces server-side.
    return null;
  }
})();

if (remoteConfig) {
  remoteConfig.settings.minimumFetchIntervalMillis = 3_600_000;
  remoteConfig.defaultConfig = {
    enable_heatmap: 'true',
    enable_community: 'true',
    assistant_model: 'gemini-2.5-flash',
    indoor_diy_featured: 'true',
  };
}
