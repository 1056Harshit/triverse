# Launch checklist

## Legal and compliance (India)
- [ ] **Motor Vehicles Act / state rules:** get a legal opinion that cost-sharing on private cars is permissible in your launch states. Keep the price cap and never market rides as "earn money".
- [ ] **DPDP Act 2023:** privacy notice, consent records (KYC consent is captured in-app), grievance officer, data deletion flow, retention jobs for `kyc_submissions`.
- [ ] **KYC provider contract** (Surepass, IDfy or Signzy) and DigiLocker partner onboarding.
- [ ] **TRAI DLT:** register the entity, sender ID (e.g. `PVTFRD`) and the OTP template before SMS goes live.
- [ ] **Pesticides:** sync `BANNED_PESTICIDES` with the latest CIB&RC list; review the farm agent's disclaimers with an agronomist.
- [ ] **Payments:** Razorpay KYC, Route (driver payouts), refund and cancellation policy pages.
- [ ] Terms of Service, community guidelines, and a safety desk process for SOS.

## Platform
- [ ] **Domain:** pvtfrnd.com → API (`api.pvtfrnd.com`), web, email (Resend SPF/DKIM/DMARC), deep links (`apple-app-site-association`, `assetlinks.json` for `/open/*`).
- [ ] Host `brand/png/*` at `https://pvtfrnd.com/brand/` (emails load images from there).
- [ ] Postgres (managed), S3-compatible storage for avatars/posters, a CDN.
- [ ] Production secrets: `JWT_SECRET`, `OTP_PEPPER`. The server refuses to start in production with dev values or `OTP_DEV_ECHO`.
- [ ] Google Cloud: enable Routes API, Places API (New), Maps SDK for Android/iOS; restrict keys.
- [ ] Google OAuth client IDs (web, iOS, Android) and the iOS URL scheme in `app.json`.
- [ ] Apple: Sign in with Apple capability (required on iOS if Google sign-in is offered).
- [ ] Payments in the app: add `react-native-razorpay` and replace `authorisePayment` in `apps/mobile/src/lib/payments.ts`.
- [ ] Push notifications (ride booked, ride alerts, campaign pushes): `expo-notifications`.
- [ ] EAS: `eas build`, `eas submit`; store listings use `brand/png/icon.png`.

## Still to build
- [ ] Live GPS trace during trips (compare against the booked route to set `tripVerified`).
- [ ] Driver payouts and an earnings view; ride management screens (my rides and bookings).
- [ ] Campaign approval and sending UI (Resend broadcasts, push, WhatsApp Business API).
- [ ] Multilingual UI strings (the agents already reply in the user's language).
- [ ] Admin console for KYC review, disputes and flagged chats.
