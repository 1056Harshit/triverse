// End-to-end API flow against an in-memory Postgres (PGlite).
// Run: DATABASE_URL=pglite:memory npm test -w @triverse/server
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";

process.env.DATABASE_URL ??= "pglite:memory";
const { buildServer } = await import("./server.ts");
const { db, schema } = await import("./db/index.ts");

let app: FastifyInstance;
const sent: string[] = [];
const origInfo = console.info;
before(async () => {
  console.info = (...a: unknown[]) => { sent.push(a.join(" ")); };
  app = await buildServer();
});
after(async () => { console.info = origInfo; await app.close(); });

async function call(method: "GET" | "POST" | "PUT" | "PATCH", url: string, body?: unknown, token?: string) {
  const res = await app.inject({ method, url, payload: body as object, headers: token ? { authorization: `Bearer ${token}` } : {} });
  return { status: res.statusCode, body: res.json() };
}

async function login(email: string, name: string) {
  assert.equal((await call("POST", "/auth/otp/send", { channel: "email", target: email })).status, 200);
  const line = sent.findLast((l) => l.includes(`to=${email}`) && l.includes("is your TriVerse code"))!;
  const code = /subject="(\d{6})/.exec(line)![1];
  const wrong = await call("POST", "/auth/otp/verify", { channel: "email", target: email, code: code === "000000" ? "111111" : "000000" });
  assert.equal(wrong.status, 400);
  const ok = await call("POST", "/auth/otp/verify", { channel: "email", target: email, code, name });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  return ok.body as { accessToken: string; refreshToken: string; isNew: boolean; user: { id: string } };
}

const shimla = { name: "Shimla", lat: 31.1048, lng: 77.1734 };
const chd = { name: "Chandigarh", lat: 30.7333, lng: 76.7794 };
const solan = { name: "Solan", lat: 30.9045, lng: 77.0967 };

test("full ride-sharing flow", async () => {
  // Driver signs up, picks services, gets a welcome email
  const d = await login("driver@example.com", "Rohit Sharma");
  assert.equal(d.isNew, true);
  const svc = await call("PUT", "/me/services", { services: ["ride", "farm"], active: "ride" }, d.accessToken);
  assert.equal(svc.body.activeService, "ride");
  await new Promise((r) => setTimeout(r, 400));
  assert.ok(sent.some((l) => l.includes("to=driver@example.com") && l.includes("Welcome to TriVerse, Rohit")), "welcome email sent at sign-up");

  // Offering a ride is blocked until verified
  const ride = { origin: shimla, destination: chd, stops: [solan], departAt: new Date(Date.now() + 86_400_000).toISOString(), seats: 3, seatPrice: 280, rules: { smoking: false, pets: false, luggage: "medium" } };
  assert.equal((await call("POST", "/rides", ride, d.accessToken)).body.code, "driver_kyc_required");

  await call("PATCH", "/me", { avatarUrl: "https://example.com/rohit.jpg", gender: "male" }, d.accessToken);
  const kyc = await call("POST", "/kyc/driver", { fullName: "Rohit Sharma", dlNumber: "HP03 20190012345", dob: "1994-05-02", rcNumber: "HP03AB1221", selfie: "x".repeat(2000), consent: true }, d.accessToken);
  assert.equal(kyc.body.status, "verified", JSON.stringify(kyc.body));

  // Price cap
  const est = await call("POST", "/rides/estimate", { origin: shimla, destination: chd, seats: 3 }, d.accessToken);
  assert.ok(est.body.bus.volvo > est.body.suggestedSeatPrice);
  const greedy = await call("POST", "/rides", { ...ride, seatPrice: est.body.maxSeatPrice + 100 }, d.accessToken);
  assert.equal(greedy.body.code, "price_cap");
  const created = await call("POST", "/rides", { ...ride, seatPrice: est.body.suggestedSeatPrice }, d.accessToken);
  assert.equal(created.status, 200, JSON.stringify(created.body));

  // Rider must verify identity before booking
  const r = await login("rider@example.com", "Priya Verma");
  await call("PATCH", "/me", { avatarUrl: "https://example.com/priya.jpg" }, r.accessToken);
  const date = ride.departAt.slice(0, 10);
  // Joining at Solan (a stop) towards Chandigarh matches the route
  const found = await call("GET", `/rides/search?oLat=${solan.lat}&oLng=${solan.lng}&dLat=${chd.lat}&dLng=${chd.lng}&date=${date}`, undefined, r.accessToken);
  assert.equal(found.body.length, 1);
  // Reverse direction does not match
  const reverse = await call("GET", `/rides/search?oLat=${chd.lat}&oLng=${chd.lng}&dLat=${shimla.lat}&dLng=${shimla.lng}&date=${date}`, undefined, r.accessToken);
  assert.equal(reverse.body.length, 0);

  assert.equal((await call("POST", `/rides/${created.body.id}/book`, { seats: 1 }, r.accessToken)).body.code, "identity_kyc_required");
  await db.update(schema.users).set({ identityKyc: "verified" }).where(eq(schema.users.id, r.user.id));

  assert.equal((await call("POST", `/rides/${created.body.id}/book`, { seats: 9 }, r.accessToken)).status, 400);
  const booked = await call("POST", `/rides/${created.body.id}/book`, { seats: 1, pickup: solan }, r.accessToken);
  assert.equal(booked.status, 200, JSON.stringify(booked.body));
  const paid = await call("POST", `/bookings/${booked.body.bookingId}/confirm-payment`, { paymentId: "pay_dev", signature: "dev" }, r.accessToken);
  assert.equal(paid.body.status, "confirmed");
  assert.ok(sent.some((l) => l.includes("to=rider@example.com") && l.includes("Booking TV-")), "booking email");

  // Seat count dropped
  const again = await call("GET", `/rides/search?oLat=${shimla.lat}&oLng=${shimla.lng}&dLat=${chd.lat}&dLng=${chd.lng}&date=${date}`, undefined, r.accessToken);
  assert.equal(again.body[0].seatsLeft, 2);

  // Chat masks phone numbers and UPI IDs
  const msg = await call("POST", `/rides/${created.body.id}/messages`, { to: d.user.id, body: "call me on 98160 12345 or pay priya@okaxis" }, r.accessToken);
  assert.equal(msg.body.flagged, true);
  assert.ok(!/98160|okaxis/.test(msg.body.body), msg.body.body);

  // Driver needs the rider's PIN to start
  assert.equal((await call("POST", `/bookings/${booked.body.bookingId}/start`, { pin: "0000" === paid.body.ridePin ? "1111" : "0000" }, d.accessToken)).status, 400);
  assert.equal((await call("POST", `/bookings/${booked.body.bookingId}/start`, { pin: paid.body.ridePin }, d.accessToken)).body.started, true);
  // Reviews only after completion
  assert.equal((await call("POST", `/bookings/${booked.body.bookingId}/review`, { stars: 5 }, r.accessToken)).status, 400);
  await call("POST", `/bookings/${booked.body.bookingId}/complete`, {}, d.accessToken);
  assert.equal((await call("POST", `/bookings/${booked.body.bookingId}/review`, { stars: 5, gpsMatched: true }, r.accessToken)).status, 200);

  // Refresh rotation: the old refresh token stops working
  const rot = await call("POST", "/auth/refresh", { refreshToken: r.refreshToken });
  assert.equal(rot.status, 200);
  assert.equal((await call("POST", "/auth/refresh", { refreshToken: r.refreshToken })).status, 401);
});

test("agents: access control and unknown agents", async () => {
  const u = await login("someone@example.com", "Someone");
  assert.equal((await call("POST", "/agents/promo/chat", { message: "Diwali campaign" }, u.accessToken)).status, 403);
  assert.equal((await call("POST", "/agents/nope/chat", { message: "hi" }, u.accessToken)).status, 404);
  assert.equal((await call("GET", "/me")).status, 401);
});

test("places are ranked by TriScore", async () => {
  const u = await login("foodie@example.com", "Foodie");
  const res = await call("GET", `/places?kind=restaurant&lat=${shimla.lat}&lng=${shimla.lng}`, undefined, u.accessToken);
  assert.equal(res.status, 200);
  const names = res.body.map((p: { name: string }) => p.name);
  // The 4.9★ café with only 72 reviews must not outrank established places.
  assert.notEqual(names[0], "Brew & Bloom");
});

test("place details and favourites", async () => {
  const u = await login("saver@example.com", "Saver");
  const list = await call("GET", `/places?kind=restaurant&lat=${shimla.lat}&lng=${shimla.lng}`, undefined, u.accessToken);
  const first = list.body[0];
  const d = await call("GET", `/places/${encodeURIComponent(first.id)}`, undefined, u.accessToken);
  assert.equal(d.status, 200);
  assert.equal(d.body.sample, true, "demo data is flagged as a sample");
  assert.equal(d.body.saved, false);

  const put = await call("PUT", `/favorites/${encodeURIComponent(first.id)}`, { name: first.name, lat: first.location.lat, lng: first.location.lng, triScore: first.triScore, kind: "restaurant" }, u.accessToken);
  assert.equal(put.body.saved, true);
  // Saving twice is harmless
  assert.equal((await call("PUT", `/favorites/${encodeURIComponent(first.id)}`, { name: first.name }, u.accessToken)).status, 200);
  assert.equal((await call("GET", `/places/${encodeURIComponent(first.id)}`, undefined, u.accessToken)).body.saved, true);
  const favs = await call("GET", "/favorites", undefined, u.accessToken);
  assert.equal(favs.body.length, 1);
  assert.equal(favs.body[0].name, first.name);

  const other = await login("other@example.com", "Other");
  assert.equal((await call("GET", "/favorites", undefined, other.accessToken)).body.length, 0, "favourites are per user");

  const del = await app.inject({ method: "DELETE", url: `/favorites/${encodeURIComponent(first.id)}`, headers: { authorization: `Bearer ${u.accessToken}` } });
  assert.equal(del.json().saved, false);
  assert.equal((await call("GET", "/favorites", undefined, u.accessToken)).body.length, 0);
});

test("health, travel, reminders and daily brief", async () => {
  const u = await login("family@example.com", "Asha Devi");
  const svc = await call("PUT", "/me/services", { services: ["health", "travel", "farm"], active: "health" }, u.accessToken);
  assert.equal(svc.status, 200, JSON.stringify(svc.body));
  assert.deepEqual(svc.body.services, ["health", "travel", "farm"]);

  const r = await call("POST", "/reminders", { medicine: "Metformin", dose: "500 mg", times: ["08:00", "20:00"], withFood: "after" }, u.accessToken);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal((await call("POST", "/reminders", { medicine: "X", times: ["25:00"] }, u.accessToken)).status, 400);
  assert.equal((await call("GET", "/reminders", undefined, u.accessToken)).body.length, 1);

  const brief = await call("GET", "/brief", undefined, u.accessToken);
  assert.equal(brief.status, 200);
  assert.equal(brief.body.medicines.length, 2);
  assert.match(brief.body.spoken, /Asha/);

  await app.inject({ method: "DELETE", url: `/reminders/${r.body.id}`, headers: { authorization: `Bearer ${u.accessToken}` } });
  assert.equal((await call("GET", "/reminders", undefined, u.accessToken)).body.length, 0);

  // Every agent, including the new router, is registered.
  const { AGENTS } = await import("./agents/index.ts");
  for (const id of ["farm", "ride", "dine", "health", "travel", "triverse", "promo"]) assert.ok(AGENTS[id as keyof typeof AGENTS], id);
  const routerTools = AGENTS.triverse.tools({ userId: u.user.id, roles: [], card: () => {} }).map((t) => (t as { name: string }).name);
  assert.ok(routerTools.includes("ask_agent") && routerTools.includes("find_hospitals"));
});

test("sign-in emails: welcome on first sign-in, welcome back after", async () => {
  const before = sent.length;
  await login("newbie@example.com", "Ravi Kumar");
  await new Promise((r) => setTimeout(r, 400));
  assert.ok(sent.slice(before).some((l) => l.includes("to=newbie@example.com") && l.includes("Welcome to TriVerse, Ravi")), "joined email");

  // Onboarding must not send a second welcome
  const mid = sent.length;
  // Skip the 30 s resend cooldown for this test by clearing the earlier code.
  await db.delete(schema.otpCodes).where(eq(schema.otpCodes.target, "newbie@example.com"));
  const again = await login("newbie@example.com", "Ravi Kumar");
  await new Promise((r) => setTimeout(r, 400));
  assert.ok(sent.slice(mid).some((l) => l.includes("to=newbie@example.com") && l.includes("Welcome back to TriVerse")), "welcome-back email");
  const onb = sent.length;
  await call("PUT", "/me/services", { services: ["farm"] }, again.accessToken);
  await new Promise((r) => setTimeout(r, 400));
  assert.ok(!sent.slice(onb).some((l) => l.includes("to=newbie@example.com") && l.includes("Welcome to TriVerse Farm")), "no duplicate onboarding welcome");
});

test("settings, custom banners and account deletion", async () => {
  const u = await login("prefs@example.com", "Prefs User");
  const me = await call("GET", "/me", undefined, u.accessToken);
  assert.equal(me.body.settings.theme, "system");
  const p = await call("PATCH", "/me/settings", { theme: "dark", accent: "rose", motion: "reduced", largeText: true }, u.accessToken);
  assert.equal(p.status, 200, JSON.stringify(p.body));
  assert.equal(p.body.settings.theme, "dark");
  assert.equal(p.body.settings.accent, "rose");
  assert.equal(p.body.settings.largeText, true);
  assert.equal((await call("PATCH", "/me/settings", { theme: "neon" }, u.accessToken)).status, 400);
  assert.equal((await call("PATCH", "/me/settings", { hacker: true }, u.accessToken)).status, 400, "unknown keys rejected");

  // Custom banner (a real 2x1 PNG) → stored and listed in settings, then removed.
  const sharp = (await import("sharp")).default;
  const png = await sharp({ create: { width: 1200, height: 600, channels: 3, background: "#22A35A" } }).png().toBuffer();
  const b = await call("POST", "/me/banner", { service: "farm", data: png.toString("base64") }, u.accessToken);
  assert.equal(b.status, 200, JSON.stringify(b.body));
  assert.match(b.body.settings.banners.farm, /\/uploads\/banners\/.+-farm-\d+\.jpg$/);
  const del = await app.inject({ method: "DELETE", url: "/me/banner/farm", headers: { authorization: `Bearer ${u.accessToken}` } });
  assert.equal(del.json().settings.banners.farm, undefined);

  // Delete account → profile blanked, refresh tokens revoked
  const gone = await app.inject({ method: "DELETE", url: "/me", headers: { authorization: `Bearer ${u.accessToken}` } });
  assert.equal(gone.json().deleted, true);
  assert.equal((await call("POST", "/auth/refresh", { refreshToken: u.refreshToken })).status, 401);
  const after = await call("GET", "/me", undefined, u.accessToken);
  assert.equal(after.body.email, null);
});
