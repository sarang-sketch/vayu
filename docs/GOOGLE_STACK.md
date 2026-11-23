# The Google Stack in VayuSense — Deep Dive

This document maps every Google integration to concrete code, for reviewers who want to
verify depth rather than logos.

## 1. Gemini — the GenAI core
`apps/functions/src/services/gemini.ts`
- SDK: `@google/genai` (current unified Google GenAI SDK).
- Dual provider: AI Studio (`apiKey`) or **Vertex AI** (`vertexai: true, project, location`)
  via `USE_VERTEX_AI` — enterprise IAM/quota path without code changes.
- Model: `gemini-2.5-flash` (configurable), temperature 0.7 chat / 0.2 repair.
- `responseMimeType: 'application/json'` + `responseSchema` built with the SDK `Type`
  system for both chat replies and daily routines.
- `safetySettings`: four harm categories at `BLOCK_MEDIUM_AND_ABOVE`.
- Contract enforcement: shared Zod schemas; one automatic repair retry on drift.
- Prompt engineering: `services/prompts.ts` — persona guidance, CPCB framing, medical
  rails, inversion-peak scheduling, injection resistance.

## 2. Google Air Quality API (Maps Platform)
`apps/functions/src/services/airQuality.ts`
- `currentConditions:lookup` with `HEALTH_RECOMMENDATIONS` + `DOMINANT_POLLUTANT`.
- `forecast:lookup` (24 h) with defensive parsing and sparse-data fallback.
- Unit science: ppb → µg/m³ conversion factors (NO₂ 1.88, O₃ 1.96, SO₂ 2.62, CO 1.145,
  NH₃ 0.696); CO normalized to mg/m³ for CPCB bands.
- CPCB re-aggregation through `@vayusense/shared` (max sub-index + dominant pollutant).
- Firestore TTL cache keyed on ~1.1 km grid cells.

## 3. Firebase
- **Auth**: Google Sign-In popup (`useAuth`), server ID-token verification.
- **Firestore**: `users`, `households`, `routines`, `impactLogs` (append-only),
  `communityReports` (immutable), `aqiCache` (TTL), `advisories`, `alertSubscriptions`.
  Rules in `firestore.rules` with validation functions; composite indexes in
  `firestore.indexes.json`.
- **App Check**: `ReCaptchaEnterpriseProvider` client + Admin `verifyToken` server.
- **Remote Config**: typed flags with 1-hour fetch interval and safe defaults.
- **FCM**: `getToken` (VAPID) client; `sendEachForMulticast` server; hourly sweep.
- **Hosting**: SPA rewrite, `/api` → function rewrite, CSP + security headers,
  immutable caching for hashed assets.
- **Analytics**: mirrors GA4 events into the Firebase console.

## 4. Cloud Run / Cloud Build / Secret Manager / Cloud Logging
- `Dockerfile`: multi-stage node:20-alpine, non-root user, wget HEALTHCHECK, `npm ci --omit=dev`.
- `cloudbuild.yaml`: lint+test gates before image build; Artifact Registry; Cloud Run
  deploy with `--set-secrets` (Secret Manager) in `asia-south1`.
- `lib/logger.ts`: structured JSON events (`request.completed`, `assistant.chat`,
  `routine.generated`, `smog.alert_sent`, …) → Cloud Logging queries/alerts.
- `server.ts`: graceful SIGTERM drain for container lifecycle.

## 5. Maps JavaScript API + Places
- `@googlemaps/js-api-loader` with `importLibrary('maps' | 'places')` (modern dynamic API).
- Dark-styled basemap (`MAP_STYLES`), AQI-colored `Circle` overlays, shared `InfoWindow`.
- Places `Autocomplete` (India-restricted) recenters the dashboard via the global store.
- Demo mode renders an equivalent deterministic SVG heatmap — same data, zero keys.

## 6. Cloud Natural Language + Cloud Translation
- Sentiment: `documents:analyzeSentiment` → `documentSentiment.score` for report triage;
  deterministic lexicon fallback keeps moderation working offline.
- Translation: `language/translate/v2` for Hindi advisories; demo dictionary ships the
  exact Severe/Very Poor/Poor advisory strings.

## 7. reCAPTCHA Enterprise
- Client: on-demand `enterprise.js`, `execute(siteKey, {action:'community_report'})`.
- Server: `projects/{id}/assessments` — `tokenProperties.valid` + risk score ≥ 0.5.
- Also powers Firebase App Check attestation.

## 8. Google Analytics 4 + web-vitals
- gtag.js in `index.html` (activates only with a real measurement id).
- `lib/analytics.ts`: product events (`assistant_message`, `swap_adopted`,
  `routine_generated`, `community_report_submitted`, `api_error`, …).
- Google's `web-vitals` library reports LCP/INP/CLS (with rating) as GA4 events.

## 9. Workbox + Lighthouse (Google quality tooling)
- `vite-plugin-pwa`: precached shell, `NetworkFirst` API (5 s timeout), `CacheFirst`
  fonts + Maps tiles, navigation fallback with `/api` denylist.
- `lighthouserc.json`: performance ≥ 0.90, accessibility ≥ 0.95, best-practices ≥ 0.95,
  SEO ≥ 0.90, PWA warn ≥ 0.80; 3 runs, temporary public storage upload.

## 10. Google Fonts
Space Grotesk (display), Inter (UI), Noto Sans Devanagari (Hindi advisories) — preconnected
and cached by Workbox for a year.
