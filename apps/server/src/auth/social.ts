import { OAuth2Client } from "google-auth-library";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "../env.ts";

export interface SocialProfile { provider: "google" | "apple"; subject: string; email?: string; emailVerified: boolean; name?: string; picture?: string }

const google = new OAuth2Client();
const googleAudiences = env.GOOGLE_CLIENT_IDS.split(",").map((s) => s.trim()).filter(Boolean);

export async function verifyGoogle(idToken: string): Promise<SocialProfile> {
  if (googleAudiences.length === 0) throw new Error("GOOGLE_CLIENT_IDS is not configured");
  const ticket = await google.verifyIdToken({ idToken, audience: googleAudiences });
  const p = ticket.getPayload();
  if (!p?.sub) throw new Error("Invalid Google token");
  return { provider: "google", subject: p.sub, email: p.email, emailVerified: !!p.email_verified, name: p.name, picture: p.picture };
}

const appleJwks = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

/** `fullName` is only sent by the device on the first Apple sign-in, so the client passes it along. */
export async function verifyApple(identityToken: string, fullName?: string): Promise<SocialProfile> {
  const { payload } = await jwtVerify(identityToken, appleJwks, { issuer: "https://appleid.apple.com", audience: env.APPLE_BUNDLE_ID });
  if (!payload.sub) throw new Error("Invalid Apple token");
  const email = typeof payload.email === "string" ? payload.email : undefined;
  const verified = payload.email_verified === true || payload.email_verified === "true";
  return { provider: "apple", subject: payload.sub, email, emailVerified: verified, name: fullName };
}
