# Architecture

```
 Expo app (iOS / Android / web)
   │  JWT (15 min) + rotating refresh token in SecureStore
   ▼
 Fastify API ── Postgres (Drizzle)        uploads/ → S3 + CDN in production
   │
   ├─ /auth      email+SMS OTP (HMAC-hashed, 10 min, 5 attempts, cooldown, hourly cap), Google, Apple
   ├─ /me        profile, services chosen at onboarding, active service, avatar
   ├─ /rides     estimate · publish (price-capped) · route-aware search · book · pay · PIN start · complete · review · chat
   ├─ /kyc       driver: DL (Sarathi) + RC/insurance (Vahan) + selfie face-match; rider: DigiLocker
   ├─ /places    Google Places + TripAdvisor → TriScore
   ├─ /farm      weather + spray windows (Open-Meteo)
   └─ /agents/:agent/chat   (SSE) ──► agent router
                                       ├─ farm  : web_search, weather, banned-pesticide check, diagnosis/product cards
                                       ├─ ride  : trip estimate, ride search, ride alerts
                                       ├─ dine  : ranked place search
                                       └─ promo : poster renderer, campaign drafts (marketing role only)
```

## Agents

All agents share one runner (`apps/server/src/agents/base.ts`):

- **Model:** `claude-opus-5-5`, adaptive thinking, effort tuned per agent (farm `medium`, ride and dine `low` for speed, promo `high` for quality copy).
- **Tool loop:** the SDK tool runner with Zod-validated tools; tools push **cards** (products, diagnoses, rides, places, posters) to the app alongside streamed text.
- **Safety net:** `fallbacks: "default"` (server-side refusal fallback) and a stable, cached system prompt per agent.
- **Memory:** each conversation's full message history is stored append-only in `conversations.history`.
- **Images:** crop photos are sent as base64 image blocks (up to 4 per message).
- **Language:** agents answer in the user's language and script (Hindi, Hinglish, Punjabi…).

Adding a service means one `AgentDefinition`, one entry in `SERVICES` (theme), and its screens under `apps/mobile/src/app/(app)/<service>/`.

## Theming

`SERVICES` in `packages/shared` defines each world's primary, deep and tint colours and agent name. The app's palette, the pin logo (the active dot grows, the others fade), emails and posters all read from it, so the brand stays consistent everywhere.

## TriScore

A Bayesian average across rating sources: each source is weighted by its review count and the total is pulled toward a 3.8★ prior. Places with a handful of 5★ reviews can't outrank places with thousands of good ones. A small distance penalty applies when ranking.

## Data protection

- OTPs are stored only as HMAC hashes.
- Selfies are used for the face match and never stored. DL and RC numbers are stored masked.
- Document retention dates are tracked (`kyc_submissions.retain_until`).
- Avatars are re-encoded, which strips EXIF and GPS data.
- Logs redact authorization headers, selfies and OTP codes.
