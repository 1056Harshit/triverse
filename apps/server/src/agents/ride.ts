import { z } from "zod";
import { busFareEstimate, maxSeatPrice, suggestedSeatPrice } from "@triverse/shared";
import { computeRoute, geocode } from "../integrations/maps.ts";
import { searchRides } from "../routes/rides.ts";
import { db, schema } from "../db/index.ts";
import { json, tool, type AgentDefinition } from "./base.ts";

export const rideAgent: AgentDefinition = {
  id: "ride",
  effort: "low",
  system: `You are Safar Saathi, TriVerse's ride-sharing assistant. TriVerse is a cost-sharing carpool, not a taxi: drivers only recover fuel, tolls and wear, and every driver is verified (DL, RC, insurance, face match).

You help users:
- Find rides (search_rides) and explain the options: departure time, pickup points, price vs bus, driver rating and badges. Results appear as cards; don't repeat every field, just compare and recommend.
- Estimate a trip (estimate_trip): distance, time, fair seat price, the price cap, and approximate Volvo/AC/ordinary bus fares. Always say bus fares are estimates.
- Plan the trip: when to leave, hill-road and weather cautions, luggage.
- Set a ride alert (create_ride_alert) when nothing matches.

You never book, cancel or pay on the user's behalf; the user taps Book on a ride card and confirms in the app. Never share a driver's or rider's phone number; all contact is through in-app chat.
Safety: remind users to share their live trip, check the plate and the driver photo before getting in, and only share the 4-digit ride PIN once seated. For emergencies: the SOS button or 112.`,
  tools: (ctx) => [
    tool({
      name: "estimate_trip",
      description: "Distance, duration, fair cost-share seat price, max allowed price and bus fare estimates between two places.",
      inputSchema: z.object({ origin: z.string(), destination: z.string(), seats: z.number().int().min(1).max(6).default(3) }),
      run: async ({ origin, destination, seats }) => {
        const [o, d] = await Promise.all([geocode(origin), geocode(destination)]);
        if (!o || !d) return `Couldn't find ${!o ? origin : destination}. Ask for a more specific place.`;
        const r = await computeRoute(o, d);
        const fare = { distanceKm: r.distanceKm, tollsInr: r.tollsInr, seats, hillRoute: r.hillRoute };
        return json({
          from: o.name, to: d.name, ...r, polyline: undefined,
          suggestedSeatPrice: suggestedSeatPrice(fare), maxSeatPrice: maxSeatPrice(fare),
          busEstimates: { volvo: busFareEstimate(r.distanceKm, "volvo"), acDeluxe: busFareEstimate(r.distanceKm, "acDeluxe"), ordinary: busFareEstimate(r.distanceKm, "ordinary") },
        });
      },
    }),
    tool({
      name: "search_rides",
      description: "Search published rides. Date is YYYY-MM-DD.",
      inputSchema: z.object({ origin: z.string(), destination: z.string(), date: z.string(), seats: z.number().int().min(1).default(1), women_only: z.boolean().default(false) }),
      run: async ({ origin, destination, date, seats, women_only }) => {
        const [o, d] = await Promise.all([geocode(origin), geocode(destination)]);
        if (!o || !d) return "Place not found.";
        const rides = await searchRides({ origin: o, destination: d, date, seats, womenOnly: women_only });
        rides.slice(0, 5).forEach((ride) => ctx.card({ kind: "ride", ride }));
        return json({ count: rides.length, rides: rides.slice(0, 5).map((r) => ({ id: r.id, departAt: r.departAt, seatPrice: r.seatPrice, seatsLeft: r.seatsLeft, rating: r.driver.rating, badges: r.driver.badges })) });
      },
    }),
    tool({
      name: "create_ride_alert",
      description: "Notify the user when a matching ride is published.",
      inputSchema: z.object({ origin: z.string(), destination: z.string(), date: z.string() }),
      run: async ({ origin, destination, date }) => {
        const [o, d] = await Promise.all([geocode(origin), geocode(destination)]);
        if (!o || !d) return "Place not found.";
        await db.insert(schema.rideAlerts).values({ userId: ctx.userId, originLat: o.lat, originLng: o.lng, destLat: d.lat, destLng: d.lng, date });
        return "Alert created.";
      },
    }),
  ],
};
