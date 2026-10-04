import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { findPlaces, placeDetails } from "../integrations/places.ts";
import { db, schema } from "../db/index.ts";
import { HttpError } from "../lib/http.ts";
import { geocode } from "../integrations/maps.ts";
import { farmWeather } from "../integrations/agri.ts";
import { parse, requireAuth } from "../lib/http.ts";

export async function placeRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  app.get("/places", async (req) => {
    const q = parse(z.object({
      kind: z.enum(["restaurant", "cafe", "lodging"]).default("restaurant"),
      lat: z.coerce.number(), lng: z.coerce.number(), q: z.string().max(80).optional(), radiusKm: z.coerce.number().min(0.5).max(30).default(5),
    }), req.query);
    return findPlaces({ kind: q.kind, query: q.q, near: { lat: q.lat, lng: q.lng }, radiusKm: q.radiusKm, limit: 20 });
  });

  /** Resolves a typed place name ("Shimla ISBT") to coordinates for ride search/offer. */
  app.get("/geo/search", async (req) => {
    const { q } = parse(z.object({ q: z.string().min(2).max(80) }), req.query);
    const hit = await geocode(q);
    return hit ? [hit] : [];
  });

  app.get("/farm/weather", async (req) => {
    const q = parse(z.object({ lat: z.coerce.number(), lng: z.coerce.number() }), req.query);
    return farmWeather(q.lat, q.lng);
  });

  app.get("/places/:id", async (req) => {
    const { id } = req.params as { id: string };
    const d = await placeDetails(decodeURIComponent(id)).catch((e) => { req.log.error(e, "place details failed"); return null; });
    if (!d) throw new HttpError(404, "Couldn't load this place right now.");
    const [fav] = await db.select({ id: schema.favorites.placeId }).from(schema.favorites)
      .where(and(eq(schema.favorites.userId, req.auth.id), eq(schema.favorites.placeId, d.id)));
    return { ...d, saved: !!fav };
  });

  app.get("/favorites", async (req) =>
    db.select().from(schema.favorites).where(eq(schema.favorites.userId, req.auth.id)).orderBy(desc(schema.favorites.savedAt)));

  app.put("/favorites/:id", async (req) => {
    const { id } = req.params as { id: string };
    const b = parse(z.object({
      name: z.string().min(1).max(200), address: z.string().max(300).optional(), lat: z.number().optional(), lng: z.number().optional(),
      triScore: z.number().optional(), photoUrl: z.string().url().optional(), kind: z.string().max(20).optional(),
    }), req.body);
    await db.insert(schema.favorites).values({ userId: req.auth.id, placeId: decodeURIComponent(id), ...b }).onConflictDoNothing();
    return { saved: true };
  });

  app.delete("/favorites/:id", async (req) => {
    const { id } = req.params as { id: string };
    await db.delete(schema.favorites).where(and(eq(schema.favorites.userId, req.auth.id), eq(schema.favorites.placeId, decodeURIComponent(id))));
    return { saved: false };
  });
}
