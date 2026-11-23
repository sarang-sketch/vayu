/**
 * Google Analytics 4 + Firebase Analytics + Core Web Vitals.
 * - gtag.js (loaded in index.html) receives product events.
 * - Firebase Analytics mirrors events for the Firebase console.
 * - web-vitals (Google's CWV library) reports LCP/INP/CLS as GA4 events.
 */
import { onCLS, onINP, onLCP, type Metric } from 'web-vitals';
import { env, firebaseEnabled } from '../config/env';

type FirebaseLogEvent = ((name: string, params?: Record<string, unknown>) => void) | null;
let firebaseLogEvent: FirebaseLogEvent = null;

/** Fire a product event to every configured Google analytics surface. */
export function track(event: string, params: Record<string, unknown> = {}): void {
  window.gtag?.('event', event, params);
  firebaseLogEvent?.(event, params);
}

function reportWebVital(metric: Metric): void {
  track('web_vitals', {
    metric_name: metric.name,
    metric_value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    metric_id: metric.id,
    metric_rating: metric.rating,
  });
}

export function initAnalytics(): void {
  onCLS(reportWebVital);
  onINP(reportWebVital);
  onLCP(reportWebVital);

  if (firebaseEnabled && env.VITE_FIREBASE_MEASUREMENT_ID) {
    import('firebase/analytics')
      .then(async ({ getAnalytics, isSupported, logEvent }) => {
        if (!(await isSupported())) return;
        const { firebaseApp } = await import('../config/firebase');
        if (!firebaseApp) return;
        const analytics = getAnalytics(firebaseApp);
        firebaseLogEvent = (name, params) => logEvent(analytics, name, params);
      })
      .catch(() => {
        // Analytics must never break the product.
      });
  }
}
