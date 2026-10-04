import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/index.ts";
import { env } from "../env.ts";
import { issueOtp, normalizeTarget, OTP_TTL_MIN, OtpError, verifyOtp, type OtpChannel } from "../auth/otp.ts";
import { verifyApple, verifyGoogle, type SocialProfile } from "../auth/social.ts";
import { issueSession, revokeRefresh, rotateRefresh } from "../auth/tokens.ts";
import { sendEmail } from "../notify/email.ts";
import { sendSmsOtp } from "../notify/sms.ts";
import { HttpError, parse } from "../lib/http.ts";
import { toProfile } from "./me.ts";

const OtpSend = z.object({ channel: z.enum(["email", "sms"]), target: z.string().min(5).max(120) });
const OtpVerify = OtpSend.extend({ code: z.string().regex(/^\d{6}$/), name: z.string().max(80).optional() });

function validTarget(channel: OtpChannel, t: string) {
  return channel === "email" ? z.email().safeParse(t).success : /^\+\d{10,15}$/.test(t);
}

export async function authRoutes(app: FastifyInstance) {
  const otpLimit = { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } };

  app.post("/auth/otp/send", otpLimit, async (req) => {
    const body = parse(OtpSend, req.body);
    const target = normalizeTarget(body.channel, body.target);
    if (!validTarget(body.channel, target)) throw new HttpError(400, body.channel === "email" ? "Enter a valid email." : "Enter a valid mobile number.");
    let code: string;
    try { code = await issueOtp(body.channel, target); } catch (e) {
      if (e instanceof OtpError) throw new HttpError(429, e.message, e.code);
      throw e;
    }
    if (env.OTP_DEV_ECHO) req.log.warn({ target, code }, "OTP_DEV_ECHO");
    // In local test mode a provider failure (e.g. no credits) must not block sign-in; the app shows the code.
    const deliver = async () => { if (body.channel === "email") {
      await sendEmail(target, {
        template: "otp",
        props: { code, minutesValid: OTP_TTL_MIN, purpose: "login", requestedFrom: { device: deviceLabel(req.headers["user-agent"]), at: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST" } },
      });
    } else {
      await sendSmsOtp(target, code);
    } };
    let delivered = true;
    try { await deliver(); } catch (e) {
      delivered = false;
      req.log.error({ err: (e as Error).message, channel: body.channel }, "OTP delivery failed");
      if (!env.OTP_DEV_ECHO) throw new HttpError(502, body.channel === "email" ? "We couldn't send the email right now. Try phone instead." : "We couldn't send the SMS right now. Try email instead.");
    }
    // Local testing only: hand the code back so the app can show it (refused in production by env.ts).
    return { sent: delivered, target, expiresInMin: OTP_TTL_MIN, ...(env.OTP_DEV_ECHO ? { devCode: code } : {}) };
  });

  app.post("/auth/otp/verify", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req) => {
    const body = parse(OtpVerify, req.body);
    const target = normalizeTarget(body.channel, body.target);
    try { await verifyOtp(target, body.code); } catch (e) {
      if (e instanceof OtpError) throw new HttpError(400, e.message, e.code);
      throw e;
    }
    const col = body.channel === "email" ? schema.users.email : schema.users.phone;
    let [user] = await db.select().from(schema.users).where(eq(col, target));
    const isNew = !user;
    if (!user) {
      [user] = await db.insert(schema.users).values(body.channel === "email"
        ? { email: target, emailVerified: true, name: body.name }
        : { phone: target, phoneVerified: true, name: body.name }).returning();
    } else {
      await db.update(schema.users).set(body.channel === "email" ? { emailVerified: true } : { phoneVerified: true }).where(eq(schema.users.id, user.id));
    }
    sendLoginEmail(app, user, isNew, body.channel === "email" ? "email" : "phone", req.headers["user-agent"]);
    return { isNew, user: toProfile(user), ...(await issueSession(app, user)) };
  });

  app.post("/auth/google", async (req) => {
    const { idToken } = parse(z.object({ idToken: z.string() }), req.body);
    const profile = await verifyGoogle(idToken).catch(() => { throw new HttpError(401, "Google sign-in failed."); });
    return socialLogin(app, profile, req.headers["user-agent"]);
  });

  app.post("/auth/apple", async (req) => {
    const { identityToken, fullName } = parse(z.object({ identityToken: z.string(), fullName: z.string().optional() }), req.body);
    const profile = await verifyApple(identityToken, fullName).catch(() => { throw new HttpError(401, "Apple sign-in failed."); });
    return socialLogin(app, profile, req.headers["user-agent"]);
  });

  app.post("/auth/refresh", async (req) => {
    const { refreshToken } = parse(z.object({ refreshToken: z.string() }), req.body);
    const session = await rotateRefresh(app, refreshToken);
    if (!session) throw new HttpError(401, "Session expired. Please sign in again.");
    return session;
  });

  app.post("/auth/logout", async (req) => {
    const { refreshToken } = parse(z.object({ refreshToken: z.string() }), req.body);
    await revokeRefresh(refreshToken);
    return { ok: true };
  });
}

/** Links by provider subject first, then by a *verified* email, then creates a user. */
async function socialLogin(app: FastifyInstance, p: SocialProfile, ua?: string) {
  const [link] = await db.select().from(schema.identities).where(and(eq(schema.identities.provider, p.provider), eq(schema.identities.subject, p.subject)));
  let user = link ? (await db.select().from(schema.users).where(eq(schema.users.id, link.userId)))[0] : undefined;
  if (!user && p.email && p.emailVerified) {
    user = (await db.select().from(schema.users).where(eq(schema.users.email, p.email.toLowerCase())))[0];
  }
  const isNew = !user;
  if (!user) {
    [user] = await db.insert(schema.users).values({ email: p.email?.toLowerCase(), emailVerified: p.emailVerified, name: p.name, avatarUrl: p.picture }).returning();
  }
  if (!link) await db.insert(schema.identities).values({ provider: p.provider, subject: p.subject, userId: user.id }).onConflictDoNothing();
  sendLoginEmail(app, user, isNew, p.provider, ua);
  return { isNew, user: toProfile(user), ...(await issueSession(app, user)) };
}

type UserRow = typeof schema.users.$inferSelect;

/**
 * Sign-in emails (only when the account has an email address):
 *   first sign-in → "Welcome to TriVerse"; every later sign-in → "Welcome back" with device and time.
 */
function sendLoginEmail(app: FastifyInstance, user: UserRow, isNew: boolean, method: "email" | "phone" | "google" | "apple", ua?: string) {
  if (!user.email) return;
  const email = isNew
    ? { template: "joined" as const, props: { name: user.name ?? undefined } }
    : { template: "signin" as const, props: { name: user.name ?? undefined, method, device: deviceLabel(ua), at: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST" } };
  sendEmail(user.email, email, isNew ? { idempotencyKey: `joined-${user.id}` } : {}).catch((e) => app.log.error(e, "sign-in email failed"));
}

function deviceLabel(ua = ""): string {
  const os = /Android/i.test(ua) ? "Android" : /iPhone|iPad|iOS/i.test(ua) ? "iPhone" : /Mac/i.test(ua) ? "Mac" : /Windows/i.test(ua) ? "Windows" : "a device";
  const app = /TriVerse|okhttp|CFNetwork|Expo/i.test(ua) ? "TriVerse app" : /Chrome/i.test(ua) ? "Chrome" : /Safari/i.test(ua) ? "Safari" : "browser";
  return `${app} on ${os}`;
}
