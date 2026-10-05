import { z } from "zod";
import { busFareEstimate, suggestedSeatPrice } from "@triverse/shared";
import { findFacilities } from "../integrations/facilities.ts";
import { tripWeather } from "../integrations/agri.ts";
import { computeRoute, geocode } from "../integrations/maps.ts";
import { json, tool, type AgentDefinition } from "./base.ts";

export const travelAgent: AgentDefinition = {
  id: "travel",
  effort: "medium",
  system: `You are Travel Frnd, PvtFrnd's travel planner, especially for Himachal Pradesh and North India (Manali, Kasol, Shimla, Dharamshala, Spiti, Kasauli, Bir, Chandigarh…), but you can help anywhere in India.

How you plan:
1. If dates, people or budget are missing, assume sensible defaults and say so in one line.
2. Use plan_route for distance/time and the cost of getting there (shared car seat vs Volvo bus), trip_weather for the forecast, and find_sights / find_stays for real places nearby.
3. Give a day-by-day plan: timings, what to see, where to eat, where to stay, and practical tips (permits like Rohtang/Atal Tunnel, altitude, cash/ATMs, network, what to pack).
4. Finish with a budget per person, then call show_plan with the key items and costs so the user gets a summary card.

Rules: only name places returned by your tools or that are very well known; never invent hotel prices, phone numbers or URLs. Flag weather risks (snow, landslides, road closures) clearly and suggest travelling in daylight on hill roads.`,
  tools: (ctx) => [
    tool({
      name: "plan_route",
      description: "Road distance, driving time and cost (shared-car seat and Volvo bus estimate) between two places.",
      inputSchema: z.object({ origin: z.string(), destination: z.string() }),
      run: async ({ origin, destination }) => {
        const [o, d] = await Promise.all([geocode(origin), geocode(destination)]);
        if (!o || !d) return `Couldn't find ${!o ? origin : destination}.`;
        const r = await computeRoute(o, d);
        return json({ from: o.name, to: d.name, distanceKm: r.distanceKm, durationMin: r.durationMin, hillRoute: r.hillRoute, tollsInr: r.tollsInr,
          sharedCarSeat: suggestedSeatPrice({ distanceKm: r.distanceKm, tollsInr: r.tollsInr, seats: 3, hillRoute: r.hillRoute }), volvoBus: busFareEstimate(r.distanceKm, "volvo"), destination: d });
      },
    }),
    tool({
      name: "trip_weather",
      description: "Daily weather forecast for a destination with travel cautions (up to 10 days).",
      inputSchema: z.object({ place: z.string(), days: z.number().int().min(1).max(10).default(5) }),
      run: async ({ place, days }) => {
        const p = await geocode(place);
        if (!p) return `Couldn't find ${place}.`;
        return json({ place: p.name, days: await tripWeather(p.lat, p.lng, days) });
      },
    }),
    tool({
      name: "find_sights",
      description: "Real sights near a place: viewpoints, museums, temples, heritage. Shows them as cards with website, photos and directions.",
      inputSchema: z.object({ place: z.string().optional().describe("Defaults to the user's location"), radius_km: z.number().min(1).max(40).default(15) }),
      run: async ({ place, radius_km }) => {
        const near = place ? await geocode(place) : ctx.location;
        if (!near) return "No location given.";
        const list = await findFacilities("sights", near, radius_km, 10).catch(() => []);
        list.slice(0, 5).forEach((facility) => ctx.card({ kind: "facility", facility }));
        return json(list.map(({ photoUrl, location, ...f }) => f));
      },
    }),
    tool({
      name: "find_stays",
      description: "Hotels, guest houses and hostels near a place.",
      inputSchema: z.object({ place: z.string() }),
      run: async ({ place }) => {
        const near = await geocode(place);
        if (!near) return `Couldn't find ${place}.`;
        const list = await findFacilities("stays", near, 8, 8).catch(() => []);
        list.slice(0, 4).forEach((facility) => ctx.card({ kind: "facility", facility }));
        return json(list.map(({ photoUrl, location, ...f }) => f));
      },
    }),
    tool({
      name: "show_plan",
      description: "Show the trip summary card: key items with per-person cost and a total.",
      inputSchema: z.object({ title: z.string(), items: z.array(z.object({ label: z.string(), detail: z.string(), cost: z.number().optional() })).max(12), total: z.number().optional() }),
      run: async (p) => { ctx.card({ kind: "plan", ...p }); return "shown"; },
    }),
  ],
};
