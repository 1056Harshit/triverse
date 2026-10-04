import type { FastifyInstance } from "fastify";
import { and, asc, eq, gte, lt } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/index.ts";
import { findFacilities } from "../integrations/facilities.ts";
import { farmWeather } from "../integrations/agri.ts";
import { heroPhotos } from "../integrations/heroMedia.ts";
import { HttpError, parse, requireAuth } from "../lib/http.ts";
import { loadUser } from "./me.ts";

/** Health & Travel listings, medicine reminders, and the cross-world daily brief. */
export async function lifeRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/facilities", async (req) => {
    const q = parse(z.object({
      kind: z.enum(["health", "hospital", "pharmacy", "sights", "stays"]),
      lat: z.coerce.number(), lng: z.coerce.number(), radiusKm: z.coerce.number().min(1).max(50).default(12),
    }), req.query);
    try {
      return await findFacilities(q.kind, { lat: q.lat, lng: q.lng }, q.radiusKm, 40);
    } catch (e) {
      req.log.warn({ err: (e as Error).message }, "facilities lookup failed");
      throw new HttpError(503, "Map data is busy right now. Please try again in a minute.");
    }
  });

  /** Real photos for the dashboard banners (Wikimedia Commons, credited). */
  app.get("/media/hero/:service", async (req) => {
    const { service } = req.params as { service: string };
    return heroPhotos(service).catch(() => []);
  });

  app.get("/reminders", async (req) =>
    db.select().from(schema.reminders).where(and(eq(schema.reminders.userId, req.auth.id), eq(schema.reminders.active, true))).orderBy(asc(schema.reminders.createdAt)));

  app.post("/reminders", async (req) => {
    const b = parse(z.object({
      medicine: z.string().min(1).max(80), dose: z.string().max(40).optional(),
      times: z.array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)).min(1).max(6), withFood: z.enum(["before", "after", "any"]).default("any"),
    }), req.body);
    const [r] = await db.insert(schema.reminders).values({ userId: req.auth.id, ...b }).returning();
    return r;
  });

  app.delete("/reminders/:id", async (req) => {
    const { id } = req.params as { id: string };
    await db.update(schema.reminders).set({ active: false }).where(and(eq(schema.reminders.id, id), eq(schema.reminders.userId, req.auth.id)));
    return { ok: true };
  });

  /** "Your day": weather & spray window, upcoming rides, today's medicines, in one place (and one sentence to read aloud). */
  app.get("/brief", async (req) => {
    const q = parse(z.object({ lat: z.coerce.number().optional(), lng: z.coerce.number().optional() }), req.query);
    const user = await loadUser(req.auth.id);
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 3600_000);
    const hourIST = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(now));
    const greeting = hourIST < 12 ? "Good morning" : hourIST < 17 ? "Good afternoon" : "Good evening";

    const [weather, asRider, asDriver, meds] = await Promise.all([
      q.lat !== undefined && q.lng !== undefined ? farmWeather(q.lat, q.lng).catch(() => null) : Promise.resolve(null),
      db.select({ b: schema.bookings, r: schema.rides }).from(schema.bookings).innerJoin(schema.rides, eq(schema.rides.id, schema.bookings.rideId))
        .where(and(eq(schema.bookings.riderId, user.id), eq(schema.bookings.status, "confirmed"), gte(schema.rides.departAt, now), lt(schema.rides.departAt, in48h))),
      db.select().from(schema.rides).where(and(eq(schema.rides.driverId, user.id), gte(schema.rides.departAt, now), lt(schema.rides.departAt, in48h))),
      db.select().from(schema.reminders).where(and(eq(schema.reminders.userId, user.id), eq(schema.reminders.active, true))),
    ]);

    const time = (d: Date) => d.toLocaleString("en-IN", { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
    const rides = [
      ...asRider.map(({ b, r }) => ({ role: "passenger" as const, when: time(r.departAt), route: `${r.originName} → ${r.destName}`, code: b.code })),
      ...asDriver.map((r) => ({ role: "driver" as const, when: time(r.departAt), route: `${r.originName} → ${r.destName}`, seatsBooked: r.seatsTotal - r.seatsLeft })),
    ];
    const medicines = meds.flatMap((m) => m.times.map((t) => ({ time: t, medicine: m.medicine, dose: m.dose, withFood: m.withFood }))).sort((a, b) => a.time.localeCompare(b.time));
    const nowHHMM = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(now);
    const nextMed = medicines.find((m) => m.time >= nowHHMM);

    const spoken = [
      `${greeting}${user.name ? ", " + user.name.split(" ")[0] : ""}.`,
      weather && `Weather: ${weather.summary} Today up to ${Math.round(weather.next24h.maxTempC)} degrees.`,
      weather?.sprayWindows[0] && user.services.includes("farm") && `Best time to spray is from ${weather.sprayWindows[0].start.slice(11, 16)}.`,
      rides.length ? `You have ${rides.length} ride${rides.length > 1 ? "s" : ""} coming up: ${rides.map((r) => `${r.route} on ${r.when}`).join("; ")}.` : null,
      nextMed && `Next medicine: ${nextMed.medicine}${nextMed.dose ? " " + nextMed.dose : ""} at ${nextMed.time}.`,
    ].filter(Boolean).join(" ");

    return { greeting, name: user.name, services: user.services, weather, rides, medicines, nextMedicine: nextMed ?? null, spoken };
  });
}
