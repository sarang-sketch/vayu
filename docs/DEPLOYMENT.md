# Deployment Guide

VayuSense ships three deployable artifacts from one codebase.

## 0. Prerequisites

```bash
npm i -g firebase-tools
gcloud auth login
gcloud config set project YOUR_PROJECT
```

Enable APIs: Cloud Functions, Cloud Run, Cloud Build, Artifact Registry, Secret Manager,
Firestore, Air Quality API, Maps JavaScript API, Places API, Natural Language API,
Cloud Translation API, reCAPTCHA Enterprise, FCM.

## 1. Secrets (Secret Manager)

```bash
printf 'YOUR_GEMINI_KEY' | gcloud secrets create gemini-api-key --data-file=-
printf 'YOUR_MAPS_KEY'   | gcloud secrets create maps-api-key   --data-file=-
```

Grant the Functions runtime service account `roles/secretmanager.secretAccessor`.

## 2. Firebase (Hosting + Functions + Firestore)

```bash
cp .env.example .env                      # fill keys for local dev
cp apps/web/.env.example apps/web/.env.local

firebase use YOUR_PROJECT
npm run build
firebase deploy --only firestore:rules,firestore:indexes,storage
firebase deploy --only functions          # api + smogAlerts (asia-south1)
firebase deploy --only hosting            # SPA + CSP headers + /api rewrite
```

Client env for production builds (`apps/web/.env.local`): Firebase web config, Maps key,
reCAPTCHA site key, FCM VAPID key, GA4 measurement id.

## 3. Cloud Run (alternative API hosting)

```bash
gcloud artifacts repositories create vayusense --repository-format=docker --location=asia-south1
gcloud builds submit --config cloudbuild.yaml
```

Pipeline: install → lint → test → multi-stage Docker build → Artifact Registry push →
Cloud Run deploy with `--set-secrets`. The container runs the same Express app via
`dist/server.js`, listens on `$PORT`, and has a wget health check.

## 4. Post-deploy checklist

- [ ] `GET https://<host>/api/health` → all services report live modes
- [ ] Firebase console: App Check enforcement ON (reCAPTCHA Enterprise)
- [ ] Maps key restricted to your domains + the four APIs
- [ ] Firestore TTL policy active on `aqiCache.expiresAt`
- [ ] Cloud Scheduler job `smogAlerts` visible and succeeding
- [ ] GA4 real-time report receiving `page_view` / `web_vitals`
- [ ] Lighthouse CI budgets passing (`npx @lhci/cli autorun`)

## 5. Local development

```bash
npm install
npm run build -w @vayusense/shared
npm run dev            # web :5173 (proxy /api) + API :8080
```

No keys? Everything runs in deterministic demo mode — see README.

## 6. Rollback

- Hosting: `firebase hosting:rollback`
- Cloud Run: `gcloud run services update-traffic vayusense-api --to-revisions=PREV=100`
- Functions: redeploy previous commit (CI is reproducible via `npm ci`).
