import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { env, isProd } from "./env.ts";
import { HttpError } from "./lib/http.ts";
import { authRoutes } from "./routes/auth.ts";
import { meRoutes } from "./routes/me.ts";
import { rideRoutes } from "./routes/rides.ts";
import { kycRoutes } from "./routes/kyc.ts";
import { placeRoutes } from "./routes/places.ts";
import { agentRoutes } from "./routes/agents.ts";
import { campaignRoutes } from "./routes/campaigns.ts";
import { lifeRoutes } from "./routes/life.ts";
import { legalRoutes, seedLegalDocs } from "./routes/legal.ts";
import { warmUpSpeech } from "./speech/transcribe.ts";
import { ensureBucket } from "./storage/index.ts";

export async function buildServer() {
  const app = Fastify({
    logger: { level: isProd ? "info" : "debug", redact: ["req.headers.authorization", "body.selfie", "body.code"] },
    bodyLimit: 1024 * 1024,
    trustProxy: true,
  });
  await app.register(cors, { origin: isProd ? [env.APP_URL, ...env.WEB_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)] : true, methods: ["GET", "POST", "PUT", "PATCH", "DELETE"] });
  await app.register(jwt, { secret: env.JWT_SECRET });
  // Tests run many logins from one address; rate limits are exercised separately.
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute", allowList: env.NODE_ENV === "test" ? () => true : undefined });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof HttpError) return reply.status(err.status).send({ error: err.message, code: err.code });
    const status = (err as { statusCode?: number }).statusCode;
    if (status && status < 500) return reply.status(status).send({ error: (err as Error).message });
    req.log.error(err);
    return reply.status(500).send({ error: "Something went wrong" });
  });

  app.get("/health", async () => ({ ok: true }));
  await app.register(authRoutes);
  await app.register(meRoutes);
  await app.register(rideRoutes);
  await app.register(kycRoutes);
  await app.register(placeRoutes);
  await app.register(agentRoutes);
  await app.register(campaignRoutes);
  await app.register(lifeRoutes);
  await app.register(legalRoutes);
  await seedLegalDocs();
  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = await buildServer();
  await ensureBucket();
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  if (env.NODE_ENV !== "test") warmUpSpeech();
  if (!env.ANTHROPIC_API_KEY && !env.GEMINI_API_KEY && !env.GROQ_API_KEY && !env.LLM_BASE_URL) {
    app.log.warn("No AI provider configured: add GEMINI_API_KEY (free) or ANTHROPIC_API_KEY to apps/server/.env so the agents can answer");
  }
}
