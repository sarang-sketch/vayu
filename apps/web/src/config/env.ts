/**
 * Typed, validated environment access. Every Google integration is optional;
 * absence flips that feature into demo mode instead of throwing at startup.
 */
import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().default(''),
  VITE_FIREBASE_API_KEY: z.string().default(''),
  VITE_FIREBASE_AUTH_DOMAIN: z.string().default(''),
  VITE_FIREBASE_PROJECT_ID: z.string().default(''),
  VITE_FIREBASE_STORAGE_BUCKET: z.string().default(''),
  VITE_FIREBASE_MESSAGING_SENDER_ID: z.string().default(''),
  VITE_FIREBASE_APP_ID: z.string().default(''),
  VITE_FIREBASE_MEASUREMENT_ID: z.string().default(''),
  VITE_GOOGLE_MAPS_API_KEY: z.string().default(''),
  VITE_RECAPTCHA_SITE_KEY: z.string().default(''),
  VITE_FCM_VAPID_KEY: z.string().default(''),
  VITE_GA4_MEASUREMENT_ID: z.string().default(''),
});

export const env = envSchema.parse(import.meta.env);

export const firebaseEnabled =
  env.VITE_FIREBASE_API_KEY.length > 0 &&
  env.VITE_FIREBASE_PROJECT_ID.length > 0 &&
  env.VITE_FIREBASE_APP_ID.length > 0;

export const mapsEnabled = env.VITE_GOOGLE_MAPS_API_KEY.length > 0;
export const recaptchaEnabled = env.VITE_RECAPTCHA_SITE_KEY.length > 0;
export const fcmEnabled = firebaseEnabled && env.VITE_FCM_VAPID_KEY.length > 0;

/** True when no Google credentials are configured at all. */
export const fullDemoMode = !firebaseEnabled && !mapsEnabled;
