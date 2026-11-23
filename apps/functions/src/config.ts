/**
 * Runtime configuration.
 *
 * Keys resolve from environment variables first, then Google Secret Manager
 * (via firebase-functions params). When a key is absent the corresponding
 * service transparently degrades to DETERMINISTIC DEMO MODE, so the entire
 * product remains explorable without credentials — a deliberate resilience
 * property, not a stub.
 */
import { defineSecret } from 'firebase-functions/params';

const geminiSecret = defineSecret('GEMINI_API_KEY');
const mapsSecret = defineSecret('GOOGLE_MAPS_API_KEY');

/** Secret Manager lookup that never throws in local/demo environments. */
function readSecret(secret: { value: () => string }, envName: string): string {
  const fromEnv = process.env[envName];
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv.trim();
  try {
    return secret.value() ?? '';
  } catch {
    return '';
  }
}

export interface AppConfig {
  nodeEnv: string;
  port: number;
  projectId: string;
  geminiApiKey: string;
  geminiModel: string;
  useVertexAi: boolean;
  vertexLocation: string;
  mapsApiKey: string;
  nlApiKey: string;
  translateApiKey: string;
  recaptchaSiteKey: string;
  recaptchaProjectId: string;
  recaptchaApiKey: string;
  appCheckEnabled: boolean;
  firestoreEnabled: boolean;
  demo: {
    ai: boolean;
    airQuality: boolean;
    sentiment: boolean;
    translate: boolean;
    recaptcha: boolean;
  };
}

export function loadConfig(): AppConfig {
  const geminiApiKey = readSecret(geminiSecret, 'GEMINI_API_KEY');
  const mapsApiKey = readSecret(mapsSecret, 'GOOGLE_MAPS_API_KEY');
  const nlApiKey = process.env.GOOGLE_NL_API_KEY ?? '';
  const translateApiKey = process.env.GOOGLE_TRANSLATE_API_KEY ?? '';
  const recaptchaSiteKey = process.env.RECAPTCHA_ENTERPRISE_SITE_KEY ?? '';
  const recaptchaProjectId = process.env.RECAPTCHA_ENTERPRISE_PROJECT_ID ?? '';
  const recaptchaApiKey = process.env.RECAPTCHA_ENTERPRISE_API_KEY ?? '';
  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT ?? process.env.FIREBASE_PROJECT_ID ?? 'vayusense-demo';

  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 8080),
    projectId,
    geminiApiKey,
    geminiModel: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
    useVertexAi: process.env.USE_VERTEX_AI === 'true',
    vertexLocation: process.env.GOOGLE_CLOUD_LOCATION ?? 'us-central1',
    mapsApiKey,
    nlApiKey,
    translateApiKey,
    recaptchaSiteKey,
    recaptchaProjectId,
    recaptchaApiKey,
    appCheckEnabled: process.env.APP_CHECK_ENABLED === 'true',
    firestoreEnabled: Boolean(
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.K_SERVICE ||
      process.env.FUNCTIONS_EMULATOR,
    ),
    demo: {
      ai: geminiApiKey.length === 0,
      airQuality: mapsApiKey.length === 0,
      sentiment: nlApiKey.length === 0,
      translate: translateApiKey.length === 0,
      recaptcha: recaptchaSiteKey.length === 0 || recaptchaProjectId.length === 0,
    },
  };
}

export const config = loadConfig();

/** Secrets that must be bound when deploying to Firebase. */
export const functionSecrets = [geminiSecret, mapsSecret];
