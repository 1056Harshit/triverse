import { z } from "zod";
import { findFacilities } from "../integrations/facilities.ts";
import { db, schema } from "../db/index.ts";
import { json, tool, type AgentContext, type AgentDefinition } from "./base.ts";

/** Shared so Krishi Mitra (pesticide exposure) and Ask TriVerse can find care too. */
export function findCareTool(ctx: AgentContext) {
  return tool({
    name: "find_hospitals",
    description: "Find nearby hospitals, clinics or pharmacies with phone, website and distance. Shows them to the user as cards.",
    inputSchema: z.object({ kind: z.enum(["hospital", "health", "pharmacy"]).default("hospital"), radius_km: z.number().min(1).max(50).default(15) }),
    run: async ({ kind, radius_km }) => {
      if (!ctx.location) return "No location. Ask which town or district they are in, and remind them that for emergencies they should call 108 now.";
      const list = await findFacilities(kind, ctx.location, radius_km, 8).catch(() => []);
      if (!list.length) return "Couldn't load facilities right now. Tell them to call 108 for an ambulance or 104 for the health helpline.";
      list.slice(0, 5).forEach((facility) => ctx.card({ kind: "facility", facility }));
      return json(list.map(({ photoUrl, location, ...f }) => f));
    },
  });
}

export const healthAgent: AgentDefinition = {
  id: "health",
  effort: "medium",
  system: `You are Sehat Saathi, TriVerse's health companion for families in India, including many elderly users. Speak simply, warmly and briefly; avoid medical jargon.

You help with:
- Understanding symptoms: ask 1–3 short questions (age, how long, severity), then explain possible common causes and what to do next: self-care, see a doctor soon, or go to hospital now.
- Finding care with find_hospitals: nearest hospitals, clinics or pharmacies. Say which are government (usually cheaper/free) vs private when known, and mention the cards have Call, Website and Directions.
- Explaining lab reports or prescriptions from photos in plain language: what each value means and whether it is in range. Never change a doctor's prescription.
- Medicine reminders: use add_medicine_reminder when the user wants to be reminded.
- Government schemes: Ayushman Bharat (PM-JAY), state health schemes, 104 health helpline.

Safety rules (always):
- RED FLAGS → tell them to call 108 (ambulance) or go to the nearest emergency now, before anything else: chest pain, trouble breathing, stroke signs (face drooping, arm weakness, slurred speech), severe bleeding, unconsciousness, seizures, poisoning or pesticide exposure, high fever in infants, suicidal thoughts (also give Tele-MANAS 14416).
- You are not a doctor and don't diagnose with certainty; say what is likely and recommend seeing a doctor.
- Don't recommend prescription-only drugs or doses. Basic OTC guidance (e.g. ORS, paracetamol label dose) is fine with cautions.`,
  tools: (ctx) => [
    findCareTool(ctx),
    tool({
      name: "add_medicine_reminder",
      description: "Save a daily medicine reminder for the user.",
      inputSchema: z.object({
        medicine: z.string().min(1), dose: z.string().optional(),
        times: z.array(z.string().regex(/^\d{2}:\d{2}$/)).min(1).max(6).describe("24-hour HH:MM times in IST"),
        with_food: z.enum(["before", "after", "any"]).default("any"),
      }),
      run: async (r) => {
        await db.insert(schema.reminders).values({ userId: ctx.userId, medicine: r.medicine, dose: r.dose, times: r.times, withFood: r.with_food });
        return `Saved: ${r.medicine} at ${r.times.join(", ")}.`;
      },
    }),
  ],
};
