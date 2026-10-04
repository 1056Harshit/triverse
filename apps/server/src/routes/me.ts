import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { env } from "../env.ts";
import { z } from "zod";
import { DEFAULT_SETTINGS, SERVICE_IDS, type ServiceId, type UserProfile, type UserSettings } from "@triverse/shared";
import { unlink } from "node:fs/promises";
import { db, schema } from "../db/index.ts";
import { sendEmail } from "../notify/email.ts";
import { HttpError, parse, requireAuth } from "../lib/http.ts";

type UserRow = typeof schema.users.$inferSelect;

export function toProfile(u: UserRow): UserProfile {
  return {
    id: u.id, name: u.name, email: u.email, phone: u.phone, avatarUrl: u.avatarUrl,
    services: u.services, activeService: u.activeService ?? u.services[0] ?? "farm",
    roles: u.roles as UserProfile["roles"], kyc: { identity: u.identityKyc, driver: u.driverKyc }, womenVerified: u.womenVerified,
    settings: { ...DEFAULT_SETTINGS, ...(u.settings as Partial<UserSettings>), banners: { ...((u.settings as Partial<UserSettings>)?.banners ?? {}) } },
  };
}

const Service = z.enum(SERVICE_IDS as [ServiceId, ...ServiceId[]]);

export async function meRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/me", async (req) => toProfile(await loadUser(req.auth.id)));

  /** Onboarding and settings: which services the user wants. Sends a themed welcome email per new service. */
  app.put("/me/services", async (req) => {
    const body = parse(z.object({ services: z.array(Service).min(1), active: Service.optional() }), req.body);
    const user = await loadUser(req.auth.id);
    const active = body.active && body.services.includes(body.active) ? body.active : body.services[0];
    const [updated] = await db.update(schema.users).set({ services: body.services, activeService: active }).where(eq(schema.users.id, user.id)).returning();
    const fresh = body.services.filter((s) => !user.welcomeSentFor.includes(s));
    // First onboarding: the "Welcome to TriVerse" email already went out at sign-in, so don't send another.
    if (user.services.length === 0) {
      await db.update(schema.users).set({ welcomeSentFor: body.services }).where(eq(schema.users.id, user.id));
    } else if (user.email && fresh.length) {
      // Fire-and-forget; one email for the primary new service avoids flooding the inbox.
      const service = fresh.includes(active) ? active : fresh[0];
      sendEmail(user.email, { template: "welcome", props: { name: user.name ?? "there", service } }, { idempotencyKey: `welcome-${user.id}-${service}` })
        .then(() => db.update(schema.users).set({ welcomeSentFor: [...user.welcomeSentFor, ...fresh] }).where(eq(schema.users.id, user.id)))
        .catch((e) => req.log.error(e, "welcome email failed"));
    }
    return toProfile(updated);
  });

  app.put("/me/active", async (req) => {
    const { service } = parse(z.object({ service: Service }), req.body);
    const user = await loadUser(req.auth.id);
    const services = user.services.includes(service) ? user.services : [...user.services, service];
    const [updated] = await db.update(schema.users).set({ activeService: service, services }).where(eq(schema.users.id, user.id)).returning();
    return toProfile(updated);
  });

  /** Profile photo: re-encoded to a 512px JPEG (strips EXIF/GPS). Required for drivers and riders. */
  app.post("/me/avatar", { bodyLimit: 8 * 1024 * 1024 }, async (req) => {
    const { data } = parse(z.object({ data: z.string().min(1000) }), req.body);
    const img = await sharp(Buffer.from(data, "base64")).rotate().resize(512, 512, { fit: "cover" }).jpeg({ quality: 82 }).toBuffer()
      .catch(() => { throw new HttpError(400, "That image couldn't be read. Try another photo."); });
    await mkdir(AVATAR_DIR, { recursive: true });
    const key = `${req.auth.id}-${Date.now()}.jpg`;
    await writeFile(path.join(AVATAR_DIR, key), img);
    const [updated] = await db.update(schema.users).set({ avatarUrl: `${env.APP_URL}/uploads/avatars/${key}` }).where(eq(schema.users.id, req.auth.id)).returning();
    return toProfile(updated);
  });

  app.patch("/me/settings", async (req) => {
    const patch = parse(SettingsPatch, req.body);
    const user = await loadUser(req.auth.id);
    const [updated] = await db.update(schema.users).set({ settings: { ...user.settings, ...patch } }).where(eq(schema.users.id, user.id)).returning();
    return toProfile(updated);
  });

  /**
   * Custom dashboard banner: a photo (re-encoded, EXIF stripped) or an animated GIF/WebP (kept as-is so it stays animated).
   */
  app.post("/me/banner", { bodyLimit: 12 * 1024 * 1024 }, async (req) => {
    const b = parse(z.object({ service: Service, data: z.string().min(1000) }), req.body);
    const raw = Buffer.from(b.data, "base64");
    const meta = await sharp(raw, { animated: true }).metadata().catch(() => { throw new HttpError(400, "That file isn't a supported image."); });
    const animated = (meta.pages ?? 1) > 1;
    if (animated && raw.length > 8 * 1024 * 1024) throw new HttpError(400, "Animated banners must be under 8 MB.");
    const ext = animated ? (meta.format === "webp" ? "webp" : "gif") : "jpg";
    const out = animated ? raw : await sharp(raw).rotate().resize(1600, 900, { fit: "cover" }).jpeg({ quality: 84 }).toBuffer();
    await mkdir(BANNER_DIR, { recursive: true });
    const key = `${req.auth.id}-${b.service}-${Date.now()}.${ext}`;
    await writeFile(path.join(BANNER_DIR, key), out);
    const user = await loadUser(req.auth.id);
    const prev = (user.settings as Partial<UserSettings>).banners ?? {};
    const old = prev[b.service];
    const banners = { ...prev, [b.service]: `${env.APP_URL}/uploads/banners/${key}` };
    const [updated] = await db.update(schema.users).set({ settings: { ...user.settings, banners } }).where(eq(schema.users.id, user.id)).returning();
    if (old) await unlink(path.join(BANNER_DIR, old.split("/").pop()!)).catch(() => {});
    return toProfile(updated);
  });

  app.delete("/me/banner/:service", async (req) => {
    const service = parse(Service, (req.params as { service: string }).service);
    const user = await loadUser(req.auth.id);
    const banners = { ...((user.settings as Partial<UserSettings>).banners ?? {}) };
    const old = banners[service];
    delete banners[service];
    const [updated] = await db.update(schema.users).set({ settings: { ...user.settings, banners } }).where(eq(schema.users.id, user.id)).returning();
    if (old) await unlink(path.join(BANNER_DIR, old.split("/").pop()!)).catch(() => {});
    return toProfile(updated);
  });

  /** Deletes the account and personal data (DPDP right to erasure). Ride/booking records are anonymised by FK rules. */
  app.delete("/me", async (req) => {
    const user = await loadUser(req.auth.id);
    await db.transaction(async (tx) => {
      await tx.delete(schema.refreshTokens).where(eq(schema.refreshTokens.userId, user.id));
      await tx.delete(schema.favorites).where(eq(schema.favorites.userId, user.id));
      await tx.delete(schema.reminders).where(eq(schema.reminders.userId, user.id));
      await tx.delete(schema.conversations).where(eq(schema.conversations.userId, user.id));
      await tx.delete(schema.kycSubmissions).where(eq(schema.kycSubmissions.userId, user.id));
      // Rides and bookings keep their history for the other party, so blank the profile instead of deleting the row.
      await tx.update(schema.users).set({
        name: "Deleted user", email: null, phone: null, avatarUrl: null, services: [], settings: {}, emailVerified: false, phoneVerified: false,
      }).where(eq(schema.users.id, user.id));
      await tx.delete(schema.identities).where(eq(schema.identities.userId, user.id));
    });
    return { deleted: true };
  });

  app.patch("/me", async (req) => {
    const body = parse(z.object({
      name: z.string().min(2).max(80).optional(), avatarUrl: z.string().url().optional(),
      gender: z.enum(["female", "male", "other", "undisclosed"]).optional(),
    }), req.body);
    const [updated] = await db.update(schema.users).set(body).where(eq(schema.users.id, req.auth.id)).returning();
    return toProfile(updated);
  });
}

export const AVATAR_DIR = path.resolve("uploads/avatars");
export const BANNER_DIR = path.resolve("uploads/banners");

const SettingsPatch = z.object({
  theme: z.enum(["system", "light", "dark", "auto"]),
  accent: z.enum(["dynamic", "blue", "purple", "teal", "rose", "amber"]),
  motion: z.enum(["full", "reduced", "off"]),
  largeText: z.boolean(), haptics: z.boolean(), autoSpeak: z.boolean(),
  voiceLanguage: z.enum(["hi", "pa", "en"]),
}).partial().strict();

export async function loadUser(id: string): Promise<UserRow> {
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, id));
  if (!u) throw new HttpError(404, "User not found");
  return u;
}
