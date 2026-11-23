# VayuSense Architecture

## 1. System overview

VayuSense is a three-tier system with a shared domain core:

```
┌────────────────────────────────────────────────────────────────────────┐
│  CLIENT — React 18 PWA (apps/web)                                      │
│  Vite · Tailwind 3.4 · zustand(persist) · react-router(lazy)           │
│  Firebase SDK: Auth / Firestore / App Check / Remote Config / FCM      │
│  Maps JS + Places · GA4 gtag · web-vitals · Workbox SW                 │
└───────────────┬────────────────────────────────────────────────────────┘
                │ HTTPS /api (Hosting rewrite → Function, or Vite proxy)
┌───────────────▼────────────────────────────────────────────────────────┐
│  API — Express (apps/functions)                                        │
│  Deployable identically as:                                            │
│   • Firebase Cloud Functions 2nd gen (index.ts: api, smogAlerts)       │
│   • Cloud Run container (server.ts, Dockerfile, cloudbuild.yaml)       │
│  Middleware chain: helmet → CORS → JSON(64kb) → requestId →            │
│  AppCheck → Auth → rate-limit → routes → 404 → structured errors       │
└───────────────┬────────────────────────────────────────────────────────┘
                │
┌───────────────▼────────────────────────────────────────────────────────┐
│  GOOGLE SERVICES                                                       │
│  Gemini (AI Studio / Vertex AI) · Air Quality API · Natural Language   │
│  Translation · reCAPTCHA Enterprise · Secret Manager · Cloud Logging   │
│  Firestore (cache + persistence) · FCM · Cloud Scheduler               │
└────────────────────────────────────────────────────────────────────────┘
                ▲
┌───────────────┴────────────────────────────────────────────────────────┐
│  DOMAIN CORE — @vayusense/shared                                       │
│  CPCB AQI breakpoints & aggregation · swap emission factors & impact   │
│  math · Zod request/response contracts · persona taxonomy              │
│  Consumed by BOTH client and API → one source of scientific truth      │
└────────────────────────────────────────────────────────────────────────┘
```

## 2. Key design decisions

### 2.1 Shared domain layer
AQI science and impact math live in `packages/shared`, compiled once and consumed by the
React app (instant client-side swap calculations) and the API (authoritative aggregation).
This eliminates client/server drift and makes the science unit-testable in isolation.

### 2.2 Demo mode as a resilience property
Every external service resolves its key from env → Secret Manager. Absence flips that
service to a **deterministic** fallback (fixed Delhi Severe-smog scenario, lexicon sentiment,
Hindi dictionary, demo reCAPTCHA pass). Consequences:
- the product is fully explorable without credentials;
- tests and screenshots are reproducible (no randomness);
- partial outages degrade one feature, never the app.

### 2.3 Gemini structured output with contract validation
`responseMimeType: application/json` + `responseSchema` (Gemini `Type` system) constrain
generation; the result is then parsed by the **same Zod schema** the UI uses. On schema
drift the service retries once with a repair turn at lower temperature, then fails with a
structured 502 — malformed model output can never reach the UI.

### 2.4 CPCB re-aggregation of Google data
Google's Air Quality API returns pollutant concentrations (µg/m³ or ppb). The API converts
units (ppb → µg/m³ via molecular-weight factors; CO → mg/m³) and computes the official
Indian CPCB index via breakpoint interpolation — the number Indian families see on TV.

### 2.5 Caching & quota protection
- Firestore `aqiCache/{grid}` documents with a 15-minute TTL field (Firestore TTL policy in
  `firestore.indexes.json`), keyed on 2-decimal coordinates (~1.1 km cells).
- Workbox `NetworkFirst` (5 s timeout) for `/api`, `CacheFirst` for fonts and Maps tiles.
- GenAI endpoints get a tighter rate budget (20 req/min/IP) than read endpoints (120).

### 2.6 Security in depth
App Check attestation → Firebase ID tokens → Zod validation → reCAPTCHA Enterprise on
public writes → Firestore rules as the last line (owner-scoped docs, append-only ledger,
immutable civic reports). CSP + Helmet + Hosting headers. Secrets never touch the client
bundle except public site keys. See docs/SECURITY.md.

## 3. Data flow: routine generation

```
User clicks "Generate routine"
 → POST /api/routine/generate {persona, city, aqi, householdSize, commuteKm}
 → Zod routineRequestSchema.parse
 → rate limit (AI budget) → App Check → optional Auth
 → Gemini generateContent(systemInstruction + responseSchema + safetySettings)
 → JSON.parse → dailyRoutineSchema.parse   (repair retry on drift)
 → optional Firestore persist (signed-in, non-blocking)
 → 200 {title, summary, steps[], estimatedCo2eSavedKg, meta{model, demo}}
 → RoutineTimeline renders chronological, emission-annotated steps
```

## 4. Data flow: smog alerts

```
Cloud Scheduler (every 60 min, Asia/Kolkata)
 → smogAlerts function → alertSubscriptions (Firestore)
 → fetchCurrent per city (cache-aware)
 → AQI ≥ 401 ? FCM sendEachForMulticast(tokens, high priority)
 → Cloud Logging structured event smog.alert_sent
```

## 5. Client state

- `zustand + persist`: persona, city, coords, locale, adopted-swap ledger (localStorage).
- Server state: lightweight hooks with AbortController (`useAirQuality`), no cache library
  needed at this scale; Workbox provides the offline layer.
- Feature flags: Remote Config with typed defaults (`useRemoteConfig`).

## 6. Scalability notes

- Stateless API → Cloud Run autoscaling 0–10 instances; Functions maxInstances 10.
- Firestore TTL cache absorbs read spikes; grid keys bound cardinality.
- Gemini calls are the cost center: rate limits + 15-min AQI cache + demo fallback keep
  spend predictable; Vertex AI path enables enterprise quota/iam controls.
- Static client on Firebase Hosting CDN with immutable asset hashing.
