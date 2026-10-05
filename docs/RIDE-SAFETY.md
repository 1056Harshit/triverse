# Ride: what we do better than BlaBlaCar

| Gap in BlaBlaCar (India) | PvtFrnd design | Where |
|---|---|---|
| Phone/email is often the only check on drivers | **Mandatory** profile photo + DL via Sarathi + RC, insurance and status via Vahan + selfie face-match before a driver can publish | `routes/kyc.ts`, `integrations/kyc.ts`, `POST /rides` guard |
| Passengers aren't verified | DigiLocker identity + profile photo required to book | `POST /rides/:id/book` guard |
| Last-minute cancellations | Sliding fee (free ≥24h, 25% ≥2h, 50% after) paid to the driver; reliability score drops; booking paused below 40; drivers penalised twice as hard | `cancellationFee`, `/bookings/:id/cancel` |
| Fake or revenge reviews | Reviews only after a completed trip, once per booking; only GPS-verified trips count toward ratings | `/bookings/:id/review`, `driverStats` |
| No proof the right person got in the right car | 4-digit **ride PIN** the rider shares only once seated; the driver must enter it to start | `/bookings/:id/start` |
| Unclear or profit-making prices (legal risk for white-plate cars) | AI-suggested fair cost-share with a **hard cap** (fuel + wear + tolls ÷ occupants × 1.15), shown next to Volvo/AC/ordinary bus estimates | `packages/shared/src/fare.ts` |
| Cash disputes, no-shows | In-app payment with **escrow** (Razorpay manual capture); captured only on completion | `integrations/payments.ts` |
| Numbers shared, so people go off-platform | In-app chat masks phone numbers, emails and UPI IDs and flags the message | `maskContact` |
| Rides only city-to-city | Route-aware matching: join at any stop and leave at any later point, within 15 km | `searchRides` |
| Dead end when nothing matches | Ride alerts via the agent | `create_ride_alert` |
| Women's safety | Women-only rides, offered only by and visible only to verified women | ride and search guards |
| In-trip emergencies | SOS (logs location, pages the safety desk, dials 112) + live trip sharing | `/trips/:id/sos`, app |
| Hill-route risk | Hill/ghat detection from route speed; fuel factor in pricing; agent gives road and weather cautions | `computeRoute`, ride agent |
