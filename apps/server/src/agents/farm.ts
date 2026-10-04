import { z } from "zod";
import { checkBanned, farmWeather } from "../integrations/agri.ts";
import { mandiPrices } from "../integrations/mandi.ts";
import { findCareTool } from "./health.ts";
import { json, tool, type AgentDefinition } from "./base.ts";

export const farmAgent: AgentDefinition = {
  id: "farm",
  effort: "medium",
  system: `You are Krishi Mitra, TriVerse's farming assistant for Indian farmers, orchardists and kitchen gardeners.

What you do:
1. Diagnose crop problems from photos and descriptions: diseases, pests, nutrient deficiencies, water/heat stress. State the most likely cause, your confidence (low/medium/high), what visual signs you used, and 1–2 look-alikes to rule out. If the photo is unclear, ask for a close-up of the underside of the leaf, the stem or the fruit. Call record_diagnosis once you have a diagnosis.
2. Give a treatment plan, ordered: cultural/organic first (sanitation, pruning, neem, trichoderma, traps), then chemical only when justified.
3. For any chemical: name the active ingredient and formulation, dose per litre and per acre exactly as on the label, spray interval, pre-harvest interval (PHI), and PPE (gloves, mask, full sleeves, no spraying against the wind, keep away from children and water sources). Always call check_pesticide before recommending an active ingredient; never recommend banned or unregistered products, and never recommend mixing chemicals the label doesn't allow.
4. When the user asks where to buy or the price, use web_search on Indian agri marketplaces (BigHaat, AgroStar, IFFCO Bazar, DeHaat, Amazon India, Krishi Kendra listings). For each option call show_product with the real price and URL you found. Say prices change and the buyer should check the CIB&RC registration number on the pack.
5. Use get_farm_weather to advise spray windows, irrigation and sowing timing.
6. Selling produce: use mandi_prices for today's wholesale rates (₹ per quintal) at government mandis, compare markets, and suggest where it's worth taking the crop (consider distance and transport cost).
7. Pesticide exposure or poisoning (dizziness, vomiting, breathing trouble, skin burns after spraying): tell them to call 108 immediately and use find_hospitals to show the nearest hospital.
8. Know Indian context: kharif/rabi/zaid seasons, state agriculture departments, KVKs, PM-KISAN, soil health cards, MSP.

Safety: you are an assistant, not a licensed agronomist. For severe outbreaks, livestock or human poisoning, tell the user to contact their nearest KVK or agriculture officer (Kisan Call Centre 1800-180-1551) and, for poisoning, emergency services (108) right away.`,
  tools: (ctx) => [
    findCareTool(ctx),
    tool({
      name: "mandi_prices",
      description: "Today's government mandi (wholesale) prices for a commodity, in ₹ per quintal, optionally for one state.",
      inputSchema: z.object({ commodity: z.string().describe("e.g. Apple, Tomato, Wheat, Potato"), state: z.string().optional().describe("e.g. Himachal Pradesh") }),
      run: async ({ commodity, state }) => {
        const rows = await mandiPrices(commodity, state).catch(() => null);
        if (!rows) return "Mandi price service is unavailable right now. Suggest checking agmarknet.gov.in or the eNAM app.";
        if (!rows.length) return `No mandi prices found for ${commodity}${state ? " in " + state : ""} today. Try a different spelling or state.`;
        return json({ note: "Prices are ₹ per quintal from government mandi reports; they are not confirmed and change daily.", prices: rows.slice(0, 10) });
      },
    }),
    { type: "web_search_20260209", name: "web_search", max_uses: 5, user_location: { type: "approximate", country: "IN" } },
    tool({
      name: "get_farm_weather",
      description: "48-hour farm weather for a location: rain, wind, temperature and the best spray windows. Defaults to the user's location.",
      inputSchema: z.object({ lat: z.number().optional(), lng: z.number().optional() }),
      run: async ({ lat, lng }) => {
        const la = lat ?? ctx.location?.lat, ln = lng ?? ctx.location?.lng;
        if (la === undefined || ln === undefined) return "No location available. Ask the user for their village or district.";
        return json(await farmWeather(la, ln));
      },
    }),
    tool({
      name: "check_pesticide",
      description: "Check an active ingredient against India's banned pesticide list before recommending it.",
      inputSchema: z.object({ active_ingredient: z.string() }),
      run: async ({ active_ingredient }) => json(checkBanned(active_ingredient)),
    }),
    tool({
      name: "record_diagnosis",
      description: "Show the user a diagnosis card for the crop problem you identified.",
      inputSchema: z.object({ crop: z.string(), disease: z.string(), confidence: z.enum(["low", "medium", "high"]) }),
      run: async (d) => { ctx.card({ kind: "diagnosis", ...d }); return "shown"; },
    }),
    tool({
      name: "show_product",
      description: "Show a product card with a real price and URL found via web_search.",
      inputSchema: z.object({
        title: z.string(), price: z.string().describe("e.g. ₹450 / 250 ml"), seller: z.string(), url: z.string().url(),
        registered: z.boolean().describe("true only if the listing shows a CIB&RC registration"),
      }),
      run: async (p) => { ctx.card({ kind: "product", ...p }); return "shown"; },
    }),
  ],
};
