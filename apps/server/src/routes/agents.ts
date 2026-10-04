import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { AgentEvent, AgentId } from "@triverse/shared";
import { AGENTS, runAgent } from "../agents/index.ts";
import { buildContextNote } from "../agents/base.ts";
import { compatConfig, CompatError, runAgentCompat, type CompatMessage } from "../agents/openaiCompat.ts";
import { db, schema } from "../db/index.ts";
import { HttpError, parse, requireAuth } from "../lib/http.ts";
import { transcribe } from "../speech/transcribe.ts";
import { env } from "../env.ts";

const ChatBody = z.object({
  conversationId: z.uuid().optional(),
  message: z.string().min(1).max(4000),
  images: z.array(z.object({ mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]), data: z.string().max(7_000_000) })).max(4).optional(),
  location: z.object({ lat: z.number(), lng: z.number(), label: z.string().optional() }).optional(),
  language: z.string().max(20).optional(),
});

export async function agentRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  /** Streams the agent's answer as Server-Sent Events (see AgentEvent in @triverse/shared). */
  app.post("/agents/:agent/chat", { bodyLimit: 30 * 1024 * 1024, config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (req, reply) => {
    const agentId = (req.params as { agent: string }).agent as AgentId;
    const def = AGENTS[agentId];
    if (!def) throw new HttpError(404, "Unknown agent");
    const body = parse(ChatBody, req.body);
    const ctx = { userId: req.auth.id, roles: req.auth.roles, location: body.location, language: body.language };
    if (def.allowed && !def.allowed({ ...ctx, card: () => {} })) throw new HttpError(403, "This assistant is for the marketing team.");

    let convo = body.conversationId
      ? (await db.select().from(schema.conversations).where(and(eq(schema.conversations.id, body.conversationId), eq(schema.conversations.userId, req.auth.id))))[0]
      : undefined;
    if (!convo) {
      [convo] = await db.insert(schema.conversations).values({ userId: req.auth.id, agent: agentId, title: body.message.slice(0, 60) }).returning();
    }

    const content: BetaMessageParam["content"] = [
      ...(body.images ?? []).map((img) => ({ type: "image" as const, source: { type: "base64" as const, media_type: img.mediaType, data: img.data } })),
      { type: "text" as const, text: body.message },
    ];

    // Hijacking bypasses Fastify's reply pipeline, so carry over headers set by hooks (CORS).
    const hookHeaders = reply.getHeaders() as Record<string, string | string[]>;
    reply.hijack();
    reply.raw.writeHead(200, { ...hookHeaders, "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive", "x-accel-buffering": "no" });
    const send = (e: AgentEvent) => reply.raw.write(`data: ${JSON.stringify(e)}\n\n`);
    const abort = new AbortController();
    req.raw.on("close", () => abort.abort());

    // Claude when a key is set, otherwise a free OpenAI-compatible provider (Gemini/Groq/Ollama).
    const compat = env.ANTHROPIC_API_KEY ? null : compatConfig();
    if (!env.ANTHROPIC_API_KEY && !compat) {
      send({ type: "error", message: "The AI assistant isn't set up yet. Add GEMINI_API_KEY (free) or ANTHROPIC_API_KEY to apps/server/.env." });
      reply.raw.end();
      return;
    }
    const provider = compat ? compat.label : "claude";
    // Histories from a different provider use another message format; start fresh rather than mixing.
    const prior = convo.provider === provider ? convo.history : [];

    try {
      const history = compat
        ? await runAgentCompat(compat, def, ctx, prior as CompatMessage[], content, buildContextNote(ctx), send, abort.signal)
        : await runAgent(def, ctx, prior as BetaMessageParam[], content, send, abort.signal);
      await db.update(schema.conversations).set({ history, provider, updatedAt: new Date() }).where(eq(schema.conversations.id, convo.id));
      send({ type: "done", conversationId: convo.id });
    } catch (err) {
      if (!abort.signal.aborted) {
        req.log.error(err, "agent run failed");
        send({ type: "error", message: err instanceof CompatError ? err.userMessage : "Something went wrong. Please try again." });
      }
    } finally {
      reply.raw.end();
    }
  });

  /** Voice → text. Audio is transcribed and discarded; nothing is stored. */
  app.post("/speech/transcribe", { bodyLimit: 15 * 1024 * 1024, config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (req) => {
    const b = parse(z.object({ audio: z.string().min(100).max(14_000_000), mimeType: z.string().regex(/^audio\/[\w.+-]+$/).default("audio/m4a"), language: z.enum(["hi", "pa", "en"]).default("hi") }), req.body);
    const started = Date.now();
    const result = await transcribe(Buffer.from(b.audio, "base64"), b.mimeType, b.language).catch((e) => {
      req.log.error({ err: (e as Error).message }, "transcription failed");
      throw new HttpError(502, "Sorry, I couldn't hear that clearly. Please try again.");
    });
    req.log.info({ provider: result.provider, ms: Date.now() - started, chars: result.text.length }, "transcribed");
    if (!result.text) throw new HttpError(422, "I didn't catch anything. Hold the phone closer and speak a little louder.");
    return result;
  });

  app.get("/agents/:agent/conversations", async (req) => {
    const agent = (req.params as { agent: string }).agent;
    return db.select({ id: schema.conversations.id, title: schema.conversations.title, updatedAt: schema.conversations.updatedAt })
      .from(schema.conversations).where(and(eq(schema.conversations.userId, req.auth.id), eq(schema.conversations.agent, agent)));
  });
}
