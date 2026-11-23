# VayuSense Security Model

## Layers (defense in depth)

1. **Transport & headers** — HTTPS everywhere; Helmet on the API; Firebase Hosting sends
   CSP, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`,
   `Permissions-Policy`. CSP allowlists only Google origins actually used (gtag, Maps,
   reCAPTCHA, fonts, Firebase).
2. **App Check** — client attests with reCAPTCHA Enterprise; server `verifyAppCheck`
   middleware verifies tokens via Firebase Admin when `APP_CHECK_ENABLED=true`.
3. **Authentication** — Firebase ID tokens verified server-side (`attachAuth`,
   `requireAuth`). Google Sign-In only; no passwords stored anywhere.
4. **Input validation** — every payload parsed by Zod at the edge; body size capped at
   64 KB; chat messages capped at 2 000 chars; history at 20 turns.
5. **Abuse control** — IP rate limiting (120/min general, 20/min GenAI); reCAPTCHA
   Enterprise assessment (score ≥ 0.5) on public civic writes.
6. **Authorization** — Firestore rules: owner-scoped profiles/routines, append-only
   impact ledger, immutable public reports, server-only cache/advisories; default deny.
7. **Storage rules** — report images: owner-scoped, ≤ 5 MB, images only.

## AI-specific defenses

- **Prompt injection resistance**: system instructions explicitly refuse rule-change or
  prompt-exfiltration requests embedded in user text; user content is never interpolated
  into system instructions.
- **Output contract enforcement**: Gemini JSON is Zod-validated; drift triggers one
  low-temperature repair retry, then a structured 502. The UI never renders unvalidated
  model output.
- **Safety settings**: harassment / hate / sexual / dangerous categories blocked at
  `BLOCK_MEDIUM_AND_ABOVE`.
- **Medical rails**: no diagnosis or prescriptions; emergency symptoms escalate to care;
  no outdoor exertion advice above AQI 300.
- **Cost protection**: tight GenAI rate budget + caching + demo fallback.

## Secrets handling

- Server keys live in **Secret Manager** (`defineSecret`), bound at deploy time
  (`cloudbuild.yaml --set-secrets`); never in the repo, never in the client bundle.
- Client `.env` holds only *public* identifiers (Firebase web config, Maps key restricted
  by HTTP referrer, reCAPTCHA site key, GA4 id, FCM VAPID public key).
- `.gitignore` excludes `.env*`, service-account JSON and `.firebase/`.

## Privacy

- Analytics: GA4 with IP anonymization; events carry no PII (persona enums, swap ids).
- Local-first: profile + ledger in localStorage; cloud sync only after explicit Sign-In.
- Civic reports are public by design; author attribution is a truncated uid, never email.
- "Clear local data" control in Settings wipes persisted state.

## Known limitations (honest scope)

- Demo mode intentionally relaxes App Check/reCAPTCHA/auth gates for exploration;
  production enforcement is configuration-driven and documented in DEPLOYMENT.md.
- Emission factors are planning estimates, not certified inventory data.
