import { z } from "zod";
import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { SERVICES, type ServiceId } from "@triverse/shared";
import { env } from "../env.ts";
import { buildContextNote, runAgent, tool, type AgentContext, type AgentDefinition } from "./base.ts";
import { compatConfig, runAgentCompat } from "./openaiCompat.ts";
import { findCareTool } from "./health.ts";

/** Runs another service's agent on one question and returns its answer; its cards still reach the user. */
async function consult(service: ServiceId, question: string, ctx: AgentContext): Promise<string> {
  const { AGENTS } = await import("./index.ts");
  const def = AGENTS[service];
  let text = "";
  const emit = (e: { type: string; delta?: string; card?: unknown }) => {
    if (e.type === "text" && e.delta) text += e.delta;
    else if (e.type === "card" && e.card) ctx.card(e.card as Parameters<AgentContext["card"]>[0]);
  };
  const sub = { userId: ctx.userId, roles: ctx.roles, location: ctx.location, language: ctx.language };
  const content: BetaMessageParam["content"] = [{ type: "text", text: question }];
  const compat = env.ANTHROPIC_API_KEY ? null : compatConfig();
  if (compat) await runAgentCompat(compat, def, sub, [], content, buildContextNote(sub), emit as never);
  else await runAgent(def, sub, [], content, emit as never);
  return text.trim() || "(no answer)";
}

const SERVICE_LIST = (Object.keys(SERVICES) as ServiceId[]).map((s) => `- ${s}: ${SERVICES[s].agentName}, ${SERVICES[s].tagline}`).join("\n");

export const triverseAgent: AgentDefinition = {
  id: "triverse",
  effort: "medium",
  system: `You are "Ask TriVerse", the one assistant for the whole TriVerse app. Many users are elderly or new to smartphones and speak by voice, so reply in short, simple sentences in their language and script.

TriVerse has these specialist assistants:
${SERVICE_LIST}

How to work:
- Decide which specialist(s) the request needs and call ask_agent with a clear, self-contained question (include places, dates and numbers the user gave). Call several in parallel when a task spans worlds, for example:
  · "Weekend in Manali for 2" → travel (plan, stays, weather) + ride (shared car and price) + dine (where to eat) → combine into one plan with a total cost.
  · "My apples are ready, where do I sell?" → farm (mandi prices) → ride (transport to that mandi).
  · "I sprayed pesticide and feel dizzy" → this is urgent: tell them to call 108 now, then use find_hospitals; also ask_agent(health).
- Combine the specialists' answers into ONE short reply; don't repeat everything they said. Cards they produced (rides, hospitals, places, plans) are already shown to the user.
- For simple chit-chat or general questions, answer directly without tools.
- At the end, if useful, say which world to open for more (e.g. "Open Health for the full list"), in one line.`,
  tools: (ctx) => [
    tool({
      name: "ask_agent",
      description: "Ask one specialist assistant (farm, ride, dine, health, travel) a question and get its answer.",
      inputSchema: z.object({ service: z.enum(["farm", "ride", "dine", "health", "travel"]), question: z.string().min(3) }),
      run: async ({ service, question }) => consult(service, question, ctx).catch((e) => `The ${service} assistant couldn't answer right now (${(e as Error).message}).`),
    }),
    findCareTool(ctx),
  ],
};
