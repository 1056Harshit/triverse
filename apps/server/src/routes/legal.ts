import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { LEGAL_DOCS, LEGAL_ORDER, type LegalDoc, type LegalDocId } from "@triverse/shared";
import { db, schema } from "../db/index.ts";
import { HttpError } from "../lib/http.ts";

/**
 * Public Privacy / Terms / Safety / Delete-account pages. The text lives in the `legal_docs` table
 * (Supabase → Table Editor → legal_docs → edit `doc`), seeded from @triverse/shared on first boot,
 * so it can change without a new app build. The app and website fall back to their bundled copy.
 */
export async function seedLegalDocs() {
  await db.insert(schema.legalDocs).values(LEGAL_ORDER.map((id) => ({ id, doc: LEGAL_DOCS[id] }))).onConflictDoNothing();
}

export async function legalRoutes(app: FastifyInstance) {
  app.get("/legal", async () => {
    const rows = await db.select().from(schema.legalDocs);
    const byId = new Map(rows.map((r) => [r.id, r]));
    return LEGAL_ORDER.map((id) => ({ ...((byId.get(id)?.doc as LegalDoc | undefined) ?? LEGAL_DOCS[id]), id, revisedAt: byId.get(id)?.updatedAt ?? null }));
  });

  app.get("/legal/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!LEGAL_ORDER.includes(id as LegalDocId)) throw new HttpError(404, "Page not found");
    const [row] = await db.select().from(schema.legalDocs).where(eq(schema.legalDocs.id, id));
    reply.header("cache-control", "public, max-age=300");
    return { ...((row?.doc as LegalDoc | undefined) ?? LEGAL_DOCS[id as LegalDocId]), id, revisedAt: row?.updatedAt ?? null };
  });
}
