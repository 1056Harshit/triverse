import type { AgentId } from "@triverse/shared";
import type { AgentDefinition } from "./base.ts";
import { farmAgent } from "./farm.ts";
import { rideAgent } from "./ride.ts";
import { dineAgent } from "./dine.ts";
import { promoAgent } from "./promo.ts";
import { healthAgent } from "./health.ts";
import { travelAgent } from "./travel.ts";
import { triverseAgent } from "./triverse.ts";

/** One agent per service; the app's active service picks which one answers. */
export const AGENTS: Record<AgentId, AgentDefinition> = {
  farm: farmAgent, ride: rideAgent, dine: dineAgent, health: healthAgent, travel: travelAgent, promo: promoAgent, triverse: triverseAgent,
};
export { runAgent } from "./base.ts";
