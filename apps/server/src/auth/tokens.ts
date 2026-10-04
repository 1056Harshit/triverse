import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db, schema } from "../db/index.ts";

const REFRESH_DAYS = 60;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export interface AccessClaims { sub: string; roles: string[] }

export async function issueSession(app: FastifyInstance, user: { id: string; roles: string[] }) {
  const accessToken = app.jwt.sign({ sub: user.id, roles: user.roles } satisfies AccessClaims, { expiresIn: "15m" });
  const refreshToken = randomBytes(32).toString("base64url");
  await db.insert(schema.refreshTokens).values({
    userId: user.id, tokenHash: sha(refreshToken), expiresAt: new Date(Date.now() + REFRESH_DAYS * 86_400_000),
  });
  return { accessToken, refreshToken };
}

/** Rotates the refresh token: the old one is revoked on use. */
export async function rotateRefresh(app: FastifyInstance, refreshToken: string) {
  const [row] = await db.select().from(schema.refreshTokens).where(and(
    eq(schema.refreshTokens.tokenHash, sha(refreshToken)), isNull(schema.refreshTokens.revokedAt), gt(schema.refreshTokens.expiresAt, new Date()),
  ));
  if (!row) return null;
  await db.update(schema.refreshTokens).set({ revokedAt: new Date() }).where(eq(schema.refreshTokens.id, row.id));
  const [user] = await db.select({ id: schema.users.id, roles: schema.users.roles }).from(schema.users).where(eq(schema.users.id, row.userId));
  return user ? issueSession(app, user) : null;
}

export async function revokeRefresh(refreshToken: string) {
  await db.update(schema.refreshTokens).set({ revokedAt: new Date() }).where(eq(schema.refreshTokens.tokenHash, sha(refreshToken)));
}
