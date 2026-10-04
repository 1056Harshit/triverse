import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/index.ts";
import { kyc, maskId } from "../integrations/kyc.ts";
import { sendEmail } from "../notify/email.ts";
import { HttpError, parse, requireAuth } from "../lib/http.ts";
import { loadUser } from "./me.ts";

const DriverKyc = z.object({
  fullName: z.string().min(3),
  dlNumber: z.string().min(10).max(20),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rcNumber: z.string().min(6).max(14),
  /** Live selfie captured in-app (camera only, no gallery) as base64 JPEG. */
  selfie: z.string().min(1000),
  consent: z.literal(true),
});

export async function kycRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.post("/kyc/driver", { bodyLimit: 8 * 1024 * 1024, config: { rateLimit: { max: 3, timeWindow: "1 hour" } } }, async (req) => {
    const b = parse(DriverKyc, req.body);
    const user = await loadUser(req.auth.id);
    if (user.driverKyc === "verified") return { status: "verified" };
    if (!user.avatarUrl) throw new HttpError(400, "Add a clear profile photo of your face first.", "photo_required");

    const result = await kyc.verifyDriver({ dlNumber: b.dlNumber, dob: b.dob, rcNumber: b.rcNumber, selfieBase64: b.selfie, fullName: b.fullName });
    // The selfie is used for the match and not stored; only masked numbers and check results are kept.
    await db.insert(schema.kycSubmissions).values({
      userId: user.id, kind: "driver", dlNumberMasked: maskId(b.dlNumber), rcNumberMasked: maskId(b.rcNumber),
      vehicle: result.vehicle, checks: result.checks, status: result.status, providerRef: result.providerRef,
      retainUntil: new Date(Date.now() + 365 * 86_400_000),
    });
    await db.update(schema.users).set({
      driverKyc: result.status, roles: result.status === "verified" && !user.roles.includes("driver") ? [...user.roles, "driver"] : user.roles,
      ...(user.identityKyc !== "verified" && result.status === "verified" ? { identityKyc: "verified" as const } : {}),
    }).where(eq(schema.users.id, user.id));

    if (user.email && result.status !== "pending") {
      sendEmail(user.email, { template: "driver-verified", props: { name: (user.name ?? b.fullName).split(" ")[0], status: result.status, checks: result.checks } })
        .catch((e) => req.log.error(e, "kyc email failed"));
    }
    return result;
  });

  /** Rider identity via DigiLocker (Aadhaar-based, consented). Returns a URL the app opens in a browser. */
  app.post("/kyc/identity/start", async (req) => {
    const user = await loadUser(req.auth.id);
    if (user.identityKyc === "verified") return { status: "verified" };
    // Integrate the KYC provider's DigiLocker session API here; the callback marks identity_kyc = verified.
    await db.update(schema.users).set({ identityKyc: "pending" }).where(eq(schema.users.id, user.id));
    return { status: "pending", url: `https://pvtfrnd.com/kyc/digilocker?session=${user.id}` };
  });
}
