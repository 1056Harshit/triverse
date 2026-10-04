import type { FastifyInstance } from "fastify";
import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "../db/index.ts";
import { POSTER_DIR } from "../posters/render.ts";
import { HttpError, requireAuth } from "../lib/http.ts";
import { AVATAR_DIR, BANNER_DIR } from "./me.ts";

export async function campaignRoutes(app: FastifyInstance) {
  // Public: rendered posters (served from object storage/CDN in production).
  app.get("/uploads/posters/:key", async (req, reply) => {
    const { key } = req.params as { key: string };
    if (!/^[a-z]+-[a-z]+-[a-z]+-[0-9a-f]{8}\.png$/.test(key)) throw new HttpError(404, "Not found");
    const file = path.join(POSTER_DIR, key);
    await access(file).catch(() => { throw new HttpError(404, "Not found"); });
    return reply.type("image/png").header("cache-control", "public, max-age=31536000, immutable").send(createReadStream(file));
  });

  app.get("/uploads/avatars/:key", async (req, reply) => {
    const { key } = req.params as { key: string };
    if (!/^[0-9a-f-]{36}-\d+\.jpg$/.test(key)) throw new HttpError(404, "Not found");
    const file = path.join(AVATAR_DIR, key);
    await access(file).catch(() => { throw new HttpError(404, "Not found"); });
    return reply.type("image/jpeg").header("cache-control", "public, max-age=86400").send(createReadStream(file));
  });

  app.get("/uploads/banners/:key", async (req, reply) => {
    const { key } = req.params as { key: string };
    const m = /^[0-9a-f-]{36}-[a-z]+-\d+\.(jpg|gif|webp)$/.exec(key);
    if (!m) throw new HttpError(404, "Not found");
    const file = path.join(BANNER_DIR, key);
    await access(file).catch(() => { throw new HttpError(404, "Not found"); });
    const type = { jpg: "image/jpeg", gif: "image/gif", webp: "image/webp" }[m[1] as "jpg" | "gif" | "webp"];
    return reply.type(type).header("cache-control", "public, max-age=31536000, immutable").send(createReadStream(file));
  });

  app.register(async (r) => {
    r.addHook("preHandler", requireAuth);
    r.addHook("preHandler", async (req) => {
      if (!req.auth.roles.some((x) => x === "marketing" || x === "admin")) throw new HttpError(403, "Marketing team only");
    });
    r.get("/campaigns", async () => db.select().from(schema.campaigns).orderBy(desc(schema.campaigns.createdAt)).limit(50));
    r.post("/campaigns/:id/approve", async (req) => {
      const { id } = req.params as { id: string };
      const [c] = await db.update(schema.campaigns).set({ status: "approved" }).where(eq(schema.campaigns.id, id)).returning();
      return c;
    });
  });
}
