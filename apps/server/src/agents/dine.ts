import { z } from "zod";
import { findPlaces } from "../integrations/places.ts";
import { geocode } from "../integrations/maps.ts";
import { json, tool, type AgentDefinition } from "./base.ts";

export const dineAgent: AgentDefinition = {
  id: "dine",
  effort: "low",
  system: `You are Dine Frnd, PvtFrnd's food and stay guide. You find the best restaurants, cafés, hotels and homestays near the user.

Use find_places for every recommendation. Results carry a TriScore: a review-volume-weighted blend of ratings from several sources (currently Google and TripAdvisor), so a 4.9★ place with 12 reviews ranks below a 4.6★ place with 3,000. Explain briefly why your top picks stand out (score, number of reviews, distance, price level, highlights) and mention when sources disagree a lot. Only state facts in the tool results; don't invent dishes, prices or amenities. Respect dietary needs (veg, Jain, halal), budget and accessibility, and say when you're unsure.`,
  tools: (ctx) => [
    tool({
      name: "find_places",
      description: "Find and rank restaurants, cafés or hotels near a location by TriScore. Uses the user's location unless `area` is given.",
      inputSchema: z.object({
        kind: z.enum(["restaurant", "cafe", "lodging"]),
        query: z.string().optional().describe("e.g. 'veg thali', 'rooftop', 'family hotel with parking'"),
        area: z.string().optional(),
        radius_km: z.number().min(0.5).max(30).default(5),
      }),
      run: async ({ kind, query, area, radius_km }) => {
        const near = area ? await geocode(area) : ctx.location;
        if (!near) return "No location. Ask the user which area.";
        const places = await findPlaces({ kind, query, near, radiusKm: radius_km, limit: 8 });
        places.slice(0, 5).forEach((p) => ctx.card({ kind: "place", name: p.name, score: p.triScore, reviews: p.totalReviews, url: p.sources[0]?.url ?? "" }));
        const rated = places.some((p) => p.sources.length > 0);
        return json({
          note: rated ? undefined : "These are real places from OpenStreetMap but have NO ratings. Do not claim any is 'top-rated' or describe dishes/quality you can't see; list a few by name and distance and suggest checking reviews.",
          places: places.map(({ location, photoUrl, ...p }) => p),
        });
      },
    }),
  ],
};
