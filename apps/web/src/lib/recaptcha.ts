/**
 * reCAPTCHA Enterprise client for civic-report submissions.
 * Loads enterprise.js on demand and executes the 'community_report' action.
 * Returns undefined in demo mode (the API applies its own demo assessment).
 */
import { env, recaptchaEnabled } from '../config/env';

let scriptPromise: Promise<void> | null = null;

function loadEnterpriseScript(): Promise<void> {
  if (window.grecaptcha?.enterprise) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/enterprise.js?render=${env.VITE_RECAPTCHA_SITE_KEY}`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('reCAPTCHA script failed to load'));
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export async function executeRecaptcha(action: string): Promise<string | undefined> {
  if (!recaptchaEnabled) return undefined;
  try {
    await loadEnterpriseScript();
    const enterprise = window.grecaptcha?.enterprise;
    if (!enterprise) return undefined;
    await new Promise<void>((resolve) => enterprise.ready(resolve));
    return await enterprise.execute(env.VITE_RECAPTCHA_SITE_KEY, { action });
  } catch {
    return undefined;
  }
}
