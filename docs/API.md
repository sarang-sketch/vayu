# VayuSense API Reference

Base URL: `/api` (Firebase Hosting rewrite → `api` function, region `asia-south1`).
All responses are JSON. Errors use a consistent envelope:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "…", "requestId": "uuid" } }
```

Every response carries `X-Request-Id` for Cloud Logging correlation.

## Health

### `GET /api/health`
Liveness probe (outside auth/rate limits). Reports per-service mode (`demo` vs live).

```json
{
  "status": "ok",
  "service": "vayusense-api",
  "version": "1.0.0",
  "uptimeSeconds": 123,
  "services": { "gemini": "demo", "airQuality": "demo", "sentiment": "lexicon", "…": "…" }
}
```

## Assistant (Gemini)

### `POST /api/assistant/chat`
Rate limit: 20/min/IP. Body validated by `chatRequestSchema`.

```json
{
  "message": "Can my kids play outside today?",
  "persona": "family_kids",
  "aqi": 415,
  "city": "New Delhi",
  "history": [{ "role": "user", "text": "…" }, { "role": "model", "text": "…" }]
}
```

Response: `{ "reply": string, "suggestedActions": [{label, prompt}], "meta": {model, demo} }`

### `POST /api/routine/generate`
Rate limit: 20/min/IP. Body validated by `routineRequestSchema`
(`persona`, `city`, `aqi`, `householdSize`, `commuteKm`, `sensitivities`).

Response: `DailyRoutine` — `{title, summary, steps[{time, activity, location, emissionSaving, healthNote}], estimatedCo2eSavedKg, meta}`.
Output is Gemini structured JSON, Zod-validated with one repair retry.

## Air quality (Google Air Quality API + CPCB)

### `GET /api/air-quality/current?lat=28.61&lng=77.20&label=Delhi`
Returns `AirQualitySnapshot`: CPCB `aqi`, `category`, `dominant` pollutant,
`pollutants[]` (µg/m³; CO mg/m³), `observedAt`, `source`. Firestore-cached 15 min.

### `GET /api/air-quality/forecast?lat=28.61&lng=77.20`
Returns `{ "points": [{ "hour": "08:00", "aqi": 425, "pm25": 264 }, …] }` (24 h).

## Sustainable swaps

### `GET /api/swaps`
Catalog with documented baseline/alternative emission factors.

### `POST /api/swaps/impact`
```json
{ "swapId": "car-to-metro", "quantityPerDay": 12, "daysPerWeek": 5 }
```
Response: `{weeklyCo2eKg, weeklyPm25G, monthlyCo2eKg, yearlyCo2eKg, treesEquivalent, carKmEquivalent}`.

## Community

### `GET /api/community/reports`
Public civic feed (Firestore when configured; deterministic demo feed otherwise).

### `POST /api/community/reports`
Auth required in production (demo mode allows anonymous). reCAPTCHA Enterprise assessment
on `recaptchaToken`; sentiment via Cloud Natural Language (lexicon fallback).

```json
{
  "location": { "lat": 28.64, "lng": 77.31, "label": "Anand Vihar" },
  "category": "burning",
  "description": "Garbage burning near the school gate since 6 AM.",
  "severity": 4,
  "recaptchaToken": "…"
}
```

Response `201`: `{report, sentimentSource, recaptcha}`.

## Translation

### `POST /api/translate`
```json
{ "text": "…advisory…", "target": "hi" }
```
Response: `{translatedText, source}` — Cloud Translation, demo dictionary, or passthrough.

## Scheduled (not HTTP)

`smogAlerts` — Cloud Scheduler `every 60 minutes` (Asia/Kolkata): re-checks subscribed
cities and multicasts FCM notifications when AQI ≥ 401.
