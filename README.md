# 🌫️ VayuSense — Urban Air Quality Assistant

> **Challenge 06.** A GenAI-powered assistant that helps families and communities navigate
> severe winter smog: personalized **low-emission daily routines**, **indoor air quality hacks**
> and **sustainable swaps with clear, quantified impact** — built end-to-end on the Google stack.

[![CI](https://img.shields.io/badge/CI-lint%20%7C%20typecheck%20%7C%20test%20%7C%20build-2dd4bf)](.github/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)](tsconfig.base.json)
[![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38bdf8)](apps/web/tailwind.config.js)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## Why VayuSense

During a Severe smog episode (AQI 400+), generic advice fails: a family with an asthmatic child,
a delivery rider and a school administrator need *different* plans. VayuSense combines

1. **Live air quality** — Google Air Quality API, re-aggregated to the official **CPCB Indian AQI**
   in a shared, unit-tested domain layer.
2. **Gemini personalization** — persona-aware chat and structured-output daily routines,
   Zod-validated before they ever reach the UI.
3. **Quantified action** — every sustainable swap shows **kg CO₂e and grams of PM2.5 avoided**,
   with tree and car-km equivalents. No vague green claims.
4. **Community defense** — civic reports triaged by Cloud Natural Language sentiment, protected
   by reCAPTCHA Enterprise, plus FCM push alerts when AQI crosses 400.

## ✨ Features

| Area | What you get |
| --- | --- |
| Dashboard | Animated AQI gauge, CPCB pollutant sub-indices, 24-h forecast chart, health advisory (EN/हिंदी), best ventilation window |
| AI Assistant | Gemini chat with 6 household personas, suggestion chips, safety rails, prompt-injection resistance |
| Daily routines | Structured-output low-emission day plans (exposure-aware timing + mode shifts + indoor actions) |
| Air map | Google Maps ward-level AQI overlay + Places search; deterministic SVG heatmap in demo mode |
| Indoor air | Effectiveness-rated hacks, DIY Corsi-Rosenthal purifier guide, live ventilation advisor |
| Swaps | 7-swap catalog with auditable emission factors, live impact calculator, persistent household ledger |
| Community | Pollution report feed + submission (reCAPTCHA Enterprise + sentiment triage) |
| Alerts | Hourly Cloud Scheduler sweep → FCM multicast at AQI ≥ 401 |
| PWA | Workbox service worker: offline shell, API network-first caching, Maps tile caching |

## 🔵 Google technology map

| Google product | Where it lives |
| --- | --- |
| **Gemini** (`@google/genai`, AI Studio or Vertex AI) | `apps/functions/src/services/gemini.ts` — chat + structured routines, safety settings, schema-repair retry |
| **Firebase Authentication** (Google Sign-In) | `apps/web/src/config/firebase.ts`, `hooks/useAuth.ts` |
| **Cloud Firestore** | profiles, routines, append-only impact ledger, civic reports, TTL AQI cache — `firestore.rules`, `services/firestore.ts` |
| **Firebase App Check** (reCAPTCHA Enterprise) | client attestation + server `verifyAppCheck` middleware |
| **Firebase Remote Config** | feature flags (`enable_heatmap`, `assistant_model`, …) |
| **Firebase Cloud Messaging** | `services/notifications.ts` + `onSchedule` sweep |
| **Firebase Hosting** | SPA rewrites, CSP/security headers, immutable asset caching (`firebase.json`) |
| **Cloud Functions (2nd gen)** | `apps/functions/src/index.ts` (`api`, `smogAlerts`) |
| **Cloud Run + Cloud Build + Artifact Registry** | `Dockerfile`, `cloudbuild.yaml`, standalone `server.ts` |
| **Secret Manager** | `defineSecret('GEMINI_API_KEY')`, `GOOGLE_MAPS_API_KEY` |
| **Cloud Logging** | structured event logs (`lib/logger.ts`) |
| **Google Air Quality API** (Maps Platform) | `services/airQuality.ts` — current + forecast, unit conversion, CPCB aggregation |
| **Maps JavaScript API + Places** | `components/map/AirQualityMap.tsx`, `pages/MapPage.tsx` |
| **Cloud Natural Language API** | `services/sentiment.ts` (lexicon fallback) |
| **Cloud Translation API** | `services/translate.ts` (Hindi advisories) |
| **reCAPTCHA Enterprise** | `services/recaptcha.ts`, `lib/recaptcha.ts` |
| **Google Analytics 4 + Firebase Analytics** | `index.html` gtag, `lib/analytics.ts` |
| **web-vitals** (Google CWV library) | LCP/INP/CLS → GA4 |
| **Google Fonts** | Space Grotesk / Inter / Noto Sans Devanagari |
| **Workbox** (Google PWA tooling) | `vite-plugin-pwa` runtime caching |
| **Lighthouse CI** | performance/a11y budgets in `lighthouserc.json` |

## 🚀 Quickstart (zero keys required)

```bash
npm install
npm run build -w @vayusense/shared   # domain layer first
npm run dev                          # web (5173) + API (8080) together
```

Open http://localhost:5173. **With no API keys configured, every Google service transparently
serves a deterministic winter-smog demo scenario** (Delhi, AQI 415, Severe) — the full product
is explorable, testable and screenshot-stable. Add keys to `.env` / `apps/web/.env.local`
(see `.env.example` files) to go live, service by service.

```bash
npm test          # 43 unit/component tests across the workspace
npm run smoke     # 11 live API checks (start the API first)
npm run lint      # ESLint 9 flat config + react-hooks
npm run typecheck # strict TypeScript, all packages
npm run build     # shared → functions → web (production bundle + PWA)
```

## 🧱 Architecture

```
React 18 PWA (Vite, Tailwind 3.4, zustand)
   │  Firebase SDK: Auth · Firestore · App Check · Remote Config · FCM · Analytics
   │  Maps JS + Places · GA4 gtag · web-vitals
   ▼
/api ── Firebase Hosting rewrite ──► Cloud Functions (2nd gen) ═══ Cloud Run
   Express: Helmet · CORS · rate limits · App Check · Auth · Zod · structured errors
   ├─ Gemini (AI Studio / Vertex AI) ── structured JSON ── Zod validation ── repair retry
   ├─ Google Air Quality API ── unit conversion ── CPCB AQI (shared) ── Firestore TTL cache
   ├─ Natural Language sentiment · Cloud Translation · reCAPTCHA Enterprise
   └─ Cloud Scheduler (hourly) ── AQI ≥ 401 ── FCM multicast
@vayusense/shared ── CPCB breakpoints · impact math · Zod contracts (unit tested)
```

Details: [ARCHITECTURE.md](ARCHITECTURE.md) · [API reference](docs/API.md) ·
[Security model](docs/SECURITY.md) · [Deployment guide](docs/DEPLOYMENT.md) ·
[Google stack deep-dive](docs/GOOGLE_STACK.md)

## 📁 Repository layout

```
├── apps/
│   ├── web/          # React PWA — pages, components, hooks, Firebase/Maps/GA4 libs
│   └── functions/    # Express API — Gemini, Air Quality, sentiment, FCM; Functions + Cloud Run
├── packages/shared/  # CPCB AQI science, emission-impact engine, Zod contracts + tests
├── docs/             # API, security, deployment, Google stack
├── firebase.json · firestore.rules · storage.rules · cloudbuild.yaml · Dockerfile
└── .github/workflows/ci.yml · lighthouserc.json
```

## 🧪 Quality gates

- **Strict TypeScript** everywhere (`noUnusedLocals`, `noUnusedParameters`, no `any` leaks).
- **Zod at every boundary** — HTTP payloads *and* Gemini output share one contract set.
- **43 unit/component tests + 11 live API smoke checks**: CPCB interpolation anchors, impact math, schema rejection, prompt rails,
  sentiment fallback, demo-scenario schema validity, component rendering, formatting.
- **CI**: format → lint → typecheck → test → build on every push; Lighthouse budgets for
  performance ≥ 0.90, accessibility ≥ 0.95.
- **Accessibility**: semantic landmarks, aria-labelled gauges/charts/progressbars, focus rings,
  live regions for chat, keyboard-friendly controls.

## ⚠️ Disclaimer

VayuSense is a lifestyle assistant, **not a medical device**. Emission factors are conservative
planning estimates documented in `packages/shared/src/impact.ts`. In a health emergency, call
local emergency services immediately.

## 📄 License

MIT — see [LICENSE](LICENSE).
