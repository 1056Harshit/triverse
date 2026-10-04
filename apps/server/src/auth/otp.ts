import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { db, schema } from "../db/index.ts";
import { env } from "../env.ts";

export const OTP_TTL_MIN = 10;
const MAX_ATTEMPTS = 5;
/** Max sends per target per hour, on top of the IP rate limit in the route. */
const MAX_SENDS_PER_HOUR = 5;
const RESEND_COOLDOWN_S = 30;

export type OtpChannel = "email" | "sms";

const hash = (target: string, code: string) =>
  createHmac("sha256", env.OTP_PEPPER).update(`${target}:${code}`).digest("hex");

export class OtpError extends Error {
  constructor(public code: "cooldown" | "too_many" | "invalid" | "expired" | "locked", message: string) { super(message); }
}

export async function issueOtp(channel: OtpChannel, target: string): Promise<string> {
  const recent = await db.select({ createdAt: schema.otpCodes.createdAt }).from(schema.otpCodes)
    .where(and(eq(schema.otpCodes.target, target), gt(schema.otpCodes.createdAt, sql`now() - interval '1 hour'`)))
    .orderBy(desc(schema.otpCodes.createdAt));
  if (recent.length >= MAX_SENDS_PER_HOUR) throw new OtpError("too_many", "Too many codes requested. Try again in an hour.");
  if (recent[0] && Date.now() - recent[0].createdAt.getTime() < RESEND_COOLDOWN_S * 1000) {
    throw new OtpError("cooldown", `Please wait ${RESEND_COOLDOWN_S} seconds before requesting another code.`);
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  // A new code invalidates older unused ones.
  await db.update(schema.otpCodes).set({ consumedAt: new Date() })
    .where(and(eq(schema.otpCodes.target, target), isNull(schema.otpCodes.consumedAt)));
  await db.insert(schema.otpCodes).values({
    channel, target, codeHash: hash(target, code), expiresAt: new Date(Date.now() + OTP_TTL_MIN * 60_000),
  });
  return code;
}

export async function verifyOtp(target: string, code: string): Promise<void> {
  const [row] = await db.select().from(schema.otpCodes)
    .where(and(eq(schema.otpCodes.target, target), isNull(schema.otpCodes.consumedAt)))
    .orderBy(desc(schema.otpCodes.createdAt)).limit(1);
  if (!row) throw new OtpError("invalid", "Code not found. Request a new one.");
  if (row.expiresAt < new Date()) throw new OtpError("expired", "This code has expired. Request a new one.");
  if (row.attempts >= MAX_ATTEMPTS) throw new OtpError("locked", "Too many wrong attempts. Request a new code.");

  const ok = timingSafeEqual(Buffer.from(row.codeHash), Buffer.from(hash(target, code)));
  if (!ok) {
    await db.update(schema.otpCodes).set({ attempts: row.attempts + 1 }).where(eq(schema.otpCodes.id, row.id));
    throw new OtpError("invalid", `Wrong code. ${MAX_ATTEMPTS - row.attempts - 1} attempts left.`);
  }
  await db.update(schema.otpCodes).set({ consumedAt: new Date() }).where(eq(schema.otpCodes.id, row.id));
}

export function normalizeTarget(channel: OtpChannel, raw: string): string {
  if (channel === "email") return raw.trim().toLowerCase();
  const digits = raw.replace(/\D/g, "");
  // Default to India (+91) for 10-digit numbers.
  return digits.length === 10 ? `+91${digits}` : `+${digits}`;
}
