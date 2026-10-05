import type { FastifyInstance } from "fastify";
import { randomInt } from "node:crypto";
import { and, asc, eq, gte, lt, or, sql } from "drizzle-orm";
import { z } from "zod";
import { busFareEstimate, maxSeatPrice, suggestedSeatPrice, validateSeatPrice, type RideSummary } from "@triverse/shared";
import { db, schema } from "../db/index.ts";
import { computeRoute, haversineKm, type LatLng } from "../integrations/maps.ts";
import { cancellationFee, capture, createSeatOrder, verifyPaymentSignature } from "../integrations/payments.ts";
import { sendEmail } from "../notify/email.ts";
import { HttpError, LatLngSchema, parse, requireAuth } from "../lib/http.ts";
import { loadUser } from "./me.ts";

/** Pickup/drop must be within this distance of the ride's origin, destination or a stop. */
const MATCH_RADIUS_KM = 15;

const RideInput = z.object({
  origin: LatLngSchema, destination: LatLngSchema, stops: z.array(LatLngSchema).max(5).default([]),
  departAt: z.iso.datetime(), seats: z.number().int().min(1).max(6), seatPrice: z.number().int().min(0),
  womenOnly: z.boolean().default(false), instantBook: z.boolean().default(true),
  rules: z.object({ smoking: z.boolean(), pets: z.boolean(), luggage: z.enum(["small", "medium", "large"]) }),
});

export async function rideRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  /** Price helper for the "offer a ride" form: route, fair price, cap and bus comparison. */
  app.post("/rides/estimate", async (req) => {
    const b = parse(z.object({ origin: LatLngSchema, destination: LatLngSchema, stops: z.array(LatLngSchema).default([]), seats: z.number().int().min(1).max(6) }), req.body);
    const route = await computeRoute(b.origin, b.destination, b.stops);
    const fare = { distanceKm: route.distanceKm, tollsInr: route.tollsInr, seats: b.seats, hillRoute: route.hillRoute };
    return {
      route, suggestedSeatPrice: suggestedSeatPrice(fare), maxSeatPrice: maxSeatPrice(fare),
      bus: { volvo: busFareEstimate(route.distanceKm, "volvo"), acDeluxe: busFareEstimate(route.distanceKm, "acDeluxe"), ordinary: busFareEstimate(route.distanceKm, "ordinary") },
    };
  });

  app.post("/rides", async (req) => {
    const b = parse(RideInput, req.body);
    const driver = await loadUser(req.auth.id);
    if (driver.driverKyc !== "verified") throw new HttpError(403, "Verify your licence and vehicle before offering rides.", "driver_kyc_required");
    if (!driver.avatarUrl) throw new HttpError(403, "Add a clear profile photo of your face before offering rides.", "photo_required");
    if (b.womenOnly && !driver.womenVerified) throw new HttpError(403, "Women-only rides can only be offered by verified women drivers.");
    if (new Date(b.departAt).getTime() < Date.now() + 30 * 60_000) throw new HttpError(400, "Departure must be at least 30 minutes from now.");

    const route = await computeRoute(b.origin, b.destination, b.stops);
    const fare = { distanceKm: route.distanceKm, tollsInr: route.tollsInr, seats: b.seats, hillRoute: route.hillRoute };
    const check = validateSeatPrice(fare, b.seatPrice);
    if (!check.ok) throw new HttpError(400, `PvtFrnd is cost-sharing only. The maximum for this route is ₹${check.max} per seat.`, "price_cap");

    const [ride] = await db.insert(schema.rides).values({
      driverId: driver.id, originName: b.origin.name, originLat: b.origin.lat, originLng: b.origin.lng,
      destName: b.destination.name, destLat: b.destination.lat, destLng: b.destination.lng, stops: b.stops,
      polyline: route.polyline, departAt: new Date(b.departAt), distanceKm: route.distanceKm, tollsInr: route.tollsInr,
      seatsTotal: b.seats, seatsLeft: b.seats, seatPrice: b.seatPrice, busEstimate: busFareEstimate(route.distanceKm),
      womenOnly: b.womenOnly, instantBook: b.instantBook, rules: b.rules,
    }).returning();
    return ride;
  });

  app.get("/rides/search", async (req) => {
    const q = parse(z.object({
      oLat: z.coerce.number(), oLng: z.coerce.number(), dLat: z.coerce.number(), dLng: z.coerce.number(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), seats: z.coerce.number().int().min(1).default(1), womenOnly: z.coerce.boolean().default(false),
    }), req.query);
    const me = await loadUser(req.auth.id);
    const rides = await searchRides({ origin: { lat: q.oLat, lng: q.oLng }, destination: { lat: q.dLat, lng: q.dLng }, date: q.date, seats: q.seats, womenOnly: q.womenOnly });
    // Women-only rides are visible only to verified women.
    return rides.filter((r) => !r.womenOnly || me.womenVerified);
  });

  app.post("/rides/:id/book", async (req) => {
    const { id } = req.params as { id: string };
    const b = parse(z.object({ seats: z.number().int().min(1).max(6), pickup: LatLngSchema.optional() }), req.body);
    const rider = await loadUser(req.auth.id);
    if (rider.identityKyc !== "verified") throw new HttpError(403, "Verify your ID once to book rides. It keeps everyone safe.", "identity_kyc_required");
    if (!rider.avatarUrl) throw new HttpError(403, "Add a profile photo so your driver can recognise you.", "photo_required");

    return db.transaction(async (tx) => {
      const [ride] = await tx.select().from(schema.rides).where(eq(schema.rides.id, id)).for("update");
      if (!ride || ride.status !== "open") throw new HttpError(404, "This ride is no longer available.");
      if (ride.driverId === rider.id) throw new HttpError(400, "You can't book your own ride.");
      if (ride.womenOnly && !rider.womenVerified) throw new HttpError(403, "This ride is for verified women only.");
      if (ride.seatsLeft < b.seats) throw new HttpError(409, `Only ${ride.seatsLeft} seat(s) left.`);
      if (rider.reliability < 40) throw new HttpError(403, "Booking is paused on your account after repeated late cancellations. Contact support.");

      const amount = ride.seatPrice * b.seats;
      const code = `TV-${randomCode(4)}`;
      const order = await createSeatOrder(amount, code);
      const [booking] = await tx.insert(schema.bookings).values({
        code, rideId: ride.id, riderId: rider.id, seats: b.seats, amount, ridePin: String(randomInt(1000, 10000)),
        paymentRef: order.orderId, pickup: b.pickup,
      }).returning();
      await tx.update(schema.rides).set({
        seatsLeft: ride.seatsLeft - b.seats, status: ride.seatsLeft - b.seats === 0 ? "full" : "open",
      }).where(eq(schema.rides.id, ride.id));
      return { bookingId: booking.id, code, amount, payment: { orderId: order.orderId, keyId: order.keyId } };
    });
  });

  app.post("/bookings/:id/confirm-payment", async (req) => {
    const { id } = req.params as { id: string };
    const b = parse(z.object({ paymentId: z.string(), signature: z.string() }), req.body);
    const { booking, ride } = await loadBooking(id, req.auth.id, "rider");
    if (booking.status !== "held") throw new HttpError(409, "Booking already processed.");
    if (!verifyPaymentSignature(booking.paymentRef!, b.paymentId, b.signature)) throw new HttpError(400, "Payment could not be verified.");
    await db.update(schema.bookings).set({ status: "confirmed", paymentRef: `${booking.paymentRef}|${b.paymentId}` }).where(eq(schema.bookings.id, id));

    const [rider, driver] = await Promise.all([loadUser(booking.riderId), loadUser(ride.driverId)]);
    const departAt = ride.departAt.toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
    const common = { bookingId: booking.code, from: ride.originName, to: ride.destName, pickup: booking.pickup?.name ?? ride.originName, departAt, seats: booking.seats, seatPrice: ride.seatPrice, busEstimate: ride.busEstimate };
    await Promise.allSettled([
      rider.email && sendEmail(rider.email, { template: "ride-booked", props: { ...common, role: "passenger", otherParty: { name: driver.name ?? "Your driver", avatarUrl: driver.avatarUrl ?? undefined, rating: await ratingOf(driver.id), verified: true } } }),
      driver.email && sendEmail(driver.email, { template: "ride-booked", props: { ...common, role: "driver", otherParty: { name: rider.name ?? "Passenger", avatarUrl: rider.avatarUrl ?? undefined, rating: await ratingOf(rider.id), verified: rider.identityKyc === "verified" } } }),
    ]);
    return { status: "confirmed", ridePin: booking.ridePin };
  });

  app.post("/bookings/:id/cancel", async (req) => {
    const { id } = req.params as { id: string };
    const me = req.auth.id;
    const [booking] = await db.select().from(schema.bookings).where(eq(schema.bookings.id, id));
    if (!booking) throw new HttpError(404, "Booking not found");
    const [ride] = await db.select().from(schema.rides).where(eq(schema.rides.id, booking.rideId));
    const byRider = booking.riderId === me, byDriver = ride.driverId === me;
    if (!byRider && !byDriver) throw new HttpError(403, "Not your booking");
    if (!["held", "confirmed"].includes(booking.status)) throw new HttpError(409, "Booking can't be cancelled now.");

    // Riders pay a sliding fee to the driver; drivers who cancel refund fully and lose reliability.
    const fee = byRider && booking.status === "confirmed" ? cancellationFee(booking.amount, ride.departAt) : 0;
    const paymentId = booking.paymentRef?.split("|")[1];
    if (fee > 0 && paymentId) await capture(paymentId, fee);
    const hoursLeft = (ride.departAt.getTime() - Date.now()) / 3_600_000;
    const penalty = hoursLeft < 2 ? 15 : hoursLeft < 24 ? 5 : 0;

    await db.transaction(async (tx) => {
      await tx.update(schema.bookings).set({ status: byRider ? "cancelled_by_rider" : "cancelled_by_driver" }).where(eq(schema.bookings.id, id));
      await tx.update(schema.rides).set({ seatsLeft: sql`${schema.rides.seatsLeft} + ${booking.seats}`, status: "open" }).where(eq(schema.rides.id, ride.id));
      if (penalty) await tx.update(schema.users).set({ reliability: sql`greatest(0, ${schema.users.reliability} - ${byDriver ? penalty * 2 : penalty})` }).where(eq(schema.users.id, me));
    });
    return { status: "cancelled", feeCharged: fee };
  });

  /** Driver enters the rider's PIN at pickup; proves the rider is in the right car. */
  app.post("/bookings/:id/start", async (req) => {
    const { id } = req.params as { id: string };
    const { pin } = parse(z.object({ pin: z.string().length(4) }), req.body);
    const { booking } = await loadBooking(id, req.auth.id, "driver");
    if (booking.status !== "confirmed") throw new HttpError(409, "Booking is not confirmed.");
    if (booking.ridePin !== pin) throw new HttpError(400, "Wrong PIN. Ask the passenger to check their app.");
    await db.update(schema.rides).set({ status: "started" }).where(eq(schema.rides.id, booking.rideId));
    return { started: true };
  });

  app.post("/bookings/:id/complete", async (req) => {
    const { id } = req.params as { id: string };
    const { booking } = await loadBooking(id, req.auth.id, "driver");
    if (booking.status !== "confirmed") throw new HttpError(409, "Booking is not active.");
    const paymentId = booking.paymentRef?.split("|")[1];
    if (paymentId) await capture(paymentId, booking.amount);
    await db.update(schema.bookings).set({ status: "completed" }).where(eq(schema.bookings.id, id));
    return { completed: true };
  });

  app.post("/bookings/:id/review", async (req) => {
    const { id } = req.params as { id: string };
    const b = parse(z.object({ stars: z.number().int().min(1).max(5), text: z.string().max(500).optional(), gpsMatched: z.boolean().default(false) }), req.body);
    const [booking] = await db.select().from(schema.bookings).where(eq(schema.bookings.id, id));
    if (!booking || booking.status !== "completed") throw new HttpError(400, "You can review only completed trips.");
    const [ride] = await db.select().from(schema.rides).where(eq(schema.rides.id, booking.rideId));
    const me = req.auth.id;
    const subject = me === booking.riderId ? ride.driverId : me === ride.driverId ? booking.riderId : null;
    if (!subject) throw new HttpError(403, "Not your trip.");
    await db.insert(schema.reviews).values({ bookingId: id, authorId: me, subjectId: subject, stars: b.stars, text: b.text, tripVerified: b.gpsMatched })
      .onConflictDoNothing();
    return { ok: true };
  });

  /** In-app chat. Phone numbers, emails and payment handles are masked to keep contact (and payment) on-platform. */
  app.post("/rides/:id/messages", { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, async (req) => {
    const { id } = req.params as { id: string };
    const b = parse(z.object({ to: z.uuid(), body: z.string().min(1).max(1000) }), req.body);
    const { text, flagged } = maskContact(b.body);
    const [m] = await db.insert(schema.messages).values({ rideId: id, fromId: req.auth.id, toId: b.to, body: text, flagged }).returning();
    return m;
  });

  app.get("/rides/:id/messages", async (req) => {
    const { id } = req.params as { id: string };
    const me = req.auth.id;
    return db.select().from(schema.messages)
      .where(and(eq(schema.messages.rideId, id), or(eq(schema.messages.fromId, me), eq(schema.messages.toId, me))))
      .orderBy(asc(schema.messages.createdAt));
  });

  app.post("/trips/:bookingId/sos", async (req) => {
    const { bookingId } = req.params as { bookingId: string };
    const b = parse(z.object({ lat: z.number(), lng: z.number() }), req.body);
    // Production: page the 24x7 safety desk, SMS emergency contacts with a live-location link, and surface 112.
    req.log.fatal({ bookingId, user: req.auth.id, at: b }, "SOS triggered");
    return { received: true, call: "112" };
  });
}

export function maskContact(input: string): { text: string; flagged: boolean } {
  let flagged = false;
  const text = input
    .replace(/(\+?\d[\s-]?){10,13}/g, () => { flagged = true; return "[number hidden]"; })
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, () => { flagged = true; return "[email hidden]"; })
    .replace(/\b[\w.-]+@(ok|ybl|paytm|upi|ibl|axl|oksbi|okhdfcbank|okaxis|okicici)\b/gi, () => { flagged = true; return "[UPI hidden]"; });
  return { text, flagged };
}

export async function searchRides(q: { origin: LatLng; destination: LatLng; date: string; seats: number; womenOnly: boolean }): Promise<RideSummary[]> {
  const dayStart = new Date(`${q.date}T00:00:00+05:30`), dayEnd = new Date(dayStart.getTime() + 86_400_000);
  const rows = await db.select({ ride: schema.rides, driver: schema.users }).from(schema.rides)
    .innerJoin(schema.users, eq(schema.users.id, schema.rides.driverId))
    .where(and(eq(schema.rides.status, "open"), gte(schema.rides.departAt, dayStart), lt(schema.rides.departAt, dayEnd), gte(schema.rides.seatsLeft, q.seats),
      q.womenOnly ? eq(schema.rides.womenOnly, true) : undefined))
    .orderBy(asc(schema.rides.departAt)).limit(200);

  // Match on the whole route: the rider can join at the origin or any stop, and leave at any later point.
  const near = (a: LatLng, b: LatLng) => haversineKm(a, b) <= MATCH_RADIUS_KM;
  const matched = rows.filter(({ ride }) => {
    const points = [{ lat: ride.originLat, lng: ride.originLng }, ...ride.stops, { lat: ride.destLat, lng: ride.destLng }];
    const i = points.findIndex((p) => near(p, q.origin));
    const j = points.findLastIndex((p) => near(p, q.destination));
    return i !== -1 && j > i;
  });

  return Promise.all(matched.map(async ({ ride, driver }) => {
    const stats = await driverStats(driver.id);
    return {
      id: ride.id,
      driver: { id: driver.id, name: driver.name ?? "Driver", avatarUrl: driver.avatarUrl, rating: stats.rating, trips: stats.trips, badges: badgesFor(driver, stats) },
      vehicle: { model: "", color: "", plateMasked: "" },
      origin: { name: ride.originName, lat: ride.originLat, lng: ride.originLng },
      destination: { name: ride.destName, lat: ride.destLat, lng: ride.destLng },
      stops: ride.stops, departAt: ride.departAt.toISOString(), seatsTotal: ride.seatsTotal, seatsLeft: ride.seatsLeft,
      seatPrice: ride.seatPrice, busEstimate: ride.busEstimate, distanceKm: ride.distanceKm, womenOnly: ride.womenOnly,
      instantBook: ride.instantBook, rules: ride.rules,
    } satisfies RideSummary;
  }));
}

async function driverStats(userId: string) {
  const [r] = await db.select({ avg: sql<number>`coalesce(avg(${schema.reviews.stars}), 0)`, n: sql<number>`count(*)` })
    .from(schema.reviews).where(and(eq(schema.reviews.subjectId, userId), eq(schema.reviews.tripVerified, true)));
  return { rating: Math.round(Number(r.avg) * 10) / 10, trips: Number(r.n) };
}
const ratingOf = async (id: string) => (await driverStats(id)).rating || 5;

function badgesFor(u: typeof schema.users.$inferSelect, s: { rating: number; trips: number }): string[] {
  const b = ["Verified driver"];
  if (u.womenVerified) b.push("Woman driver");
  if (u.reliability >= 95 && s.trips >= 10) b.push("Never cancels");
  if (s.trips >= 50 && s.rating >= 4.7) b.push("Super driver");
  return b;
}

async function loadBooking(id: string, userId: string, as: "rider" | "driver") {
  const [booking] = await db.select().from(schema.bookings).where(eq(schema.bookings.id, id));
  if (!booking) throw new HttpError(404, "Booking not found");
  const [ride] = await db.select().from(schema.rides).where(eq(schema.rides.id, booking.rideId));
  if ((as === "rider" && booking.riderId !== userId) || (as === "driver" && ride.driverId !== userId)) throw new HttpError(403, "Not allowed");
  return { booking, ride };
}

function randomCode(n: number) {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: n }, () => a[randomInt(0, a.length)]).join("");
}
