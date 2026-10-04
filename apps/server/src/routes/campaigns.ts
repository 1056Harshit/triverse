import type { FastifyInstance } from "fastify";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "../db/index.ts";
import { HttpError, requireAuth } from "../lib/http.ts";

export async function campaignRoutes(app: FastifyInstance) {
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
