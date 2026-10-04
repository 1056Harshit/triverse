# TriVerse: Grow · Go · Dine

One app, three worlds, each with its own AI agent, dashboard and theme:

| Service | Agent | What it does |
|---|---|---|
| 🌾 **Farm** | Krishi Mitra | Photo diagnosis of crop diseases and pests, safe treatment plans, registered pesticides with real online prices, spray-window weather, crop calendars, schemes |
| 🚗 **Ride** | Safar Saathi | Verified cost-sharing carpools (a safer, fairer BlaBlaCar), Google Maps distance and tolls, fair seat price vs Volvo bus fare, escrow payments, ride PIN, SOS |
| 🍽 **Dine & Stay** | Swad Guide | Restaurants, cafés and hotels near you ranked by **TriScore**, a review-weighted blend of ratings across sites |
| 📣 *(internal)* | Campaign Studio | Turns a brief into copy for push/WhatsApp/Instagram/email plus branded posters |

New users choose the services they want at sign-up and only see those. They can switch any time from the pin in the header. Sign-in works with phone OTP, email OTP, Google and Apple, and a themed welcome email goes out for the service they picked.

## Repository

```
brand/               Logo source (pin.js) + exported SVG/PNG assets (node brand/export.js)
packages/shared/     Service themes, fare rules (cost-share cap, bus estimates), shared types
packages/emails/     React Email templates: OTP, welcome ×3 themes, ride booked, driver verified, campaign
apps/server/         Fastify API + Claude agents, Postgres (Drizzle), KYC, maps, places, payments, posters
apps/mobile/         Expo (SDK 57) app with Expo Router
docs/                Architecture, ride safety design, launch checklist
```

## Run it locally

Requirements: Node 22+.

```bash
npm install
cp apps/server/.env.example apps/server/.env      # add ANTHROPIC_API_KEY at minimum
```

**API** (embedded Postgres, OTP codes printed to the log):

```bash
cd apps/server && DATABASE_URL=pglite:./.data OTP_DEV_ECHO=true npm run dev
```

**App:**

```bash
cd apps/mobile && EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:4000 npx expo start
```

Google/Apple sign-in, maps, camera and secure storage need a development build (`npx expo run:android` / `run:ios`, or `eas build --profile development`); Expo Go won't include them. The web build (`npx expo start --web`) works for phone/email login and the dashboards.

**Email previews:** `npm run emails`, then open http://localhost:3030.

**Tests:**

```bash
npm test -w @triverse/server     # end-to-end API flow on in-memory Postgres
npm test -w @triverse/shared     # fare rules
npm run typecheck
```

## Configuration

Everything works offline with sensible fallbacks; add keys to turn on the real integrations:

| Variable | Enables |
|---|---|
| `ANTHROPIC_API_KEY` | All four agents (model `claude-opus-5-5`, server-side refusal fallback on) |
| `RESEND_API_KEY` | Sending emails from `hello@pvtfrnd.com` (verify the domain in Resend: SPF, DKIM, DMARC) |
| `MSG91_AUTH_KEY`, `MSG91_OTP_TEMPLATE_ID` | SMS OTP (DLT-registered template required in India) |
| `GOOGLE_CLIENT_IDS`, `APPLE_BUNDLE_ID` | Social login token verification |
| `GOOGLE_MAPS_API_KEY` | Routes API (distance, duration, tolls), Places API (search, ratings), geocoding |
| `TRIPADVISOR_API_KEY` | Second rating source for TriScore |
| `KYC_PROVIDER=surepass`, `SUREPASS_TOKEN` | Real DL/RC/face-match checks (mock validates format only) |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Escrow seat payments (manual capture) |

App env: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, plus the Android Maps key in `app.json`.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/RIDE-SAFETY.md](docs/RIDE-SAFETY.md) and [docs/LAUNCH-CHECKLIST.md](docs/LAUNCH-CHECKLIST.md).
