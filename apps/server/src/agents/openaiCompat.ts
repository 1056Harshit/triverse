/**
 * Agent runner for OpenAI-compatible chat APIs: Gemini (free tier), Groq, OpenRouter, Ollama…
 * Used when no ANTHROPIC_API_KEY is set. Shares tool definitions with the Claude runner.
 */
import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { AgentEvent } from "@triverse/shared";
import { env } from "../env.ts";
import type { AgentContext, AgentDefinition } from "./base.ts";

export interface CompatConfig { baseUrl: string; apiKey?: string; model: string; label: string; fallbacks: string[] }

/** Picks the free/compatible provider from env, or null if none is configured. */
export function compatConfig(): CompatConfig | null {
  const fallbacks = (env.LLM_FALLBACK_MODELS ?? "").split(",").map((m) => m.trim()).filter(Boolean);
  if (env.LLM_BASE_URL) return { baseUrl: env.LLM_BASE_URL, apiKey: env.LLM_API_KEY, model: env.LLM_MODEL ?? "gemini-3.8-flash", label: "custom", fallbacks };
  if (env.GEMINI_API_KEY) return {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", apiKey: env.GEMINI_API_KEY, label: "gemini",
    model: env.LLM_MODEL ?? "gemini-3.8-flash",
    // Free-tier models each have their own quota; try the next one when a model is overloaded or rate-limited.
    fallbacks: fallbacks.length ? fallbacks : ["gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite"],
  };
  if (env.GROQ_API_KEY) return { baseUrl: "https://api.groq.com/openai/v1", apiKey: env.GROQ_API_KEY, model: env.LLM_MODEL ?? "llama-3.3-70b-versatile", label: "groq", fallbacks };
  return null;
}

type Part = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
/** `extra_content` carries Gemini's thought_signature, which must be echoed back with the call. */
type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string }; extra_content?: unknown };
export type CompatMessage =
  | { role: "system" | "user"; content: string | Part[] }
  | { role: "assistant"; content: string; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

interface RunnableTool { name: string; description?: string; input_schema: unknown; run: (input: unknown) => unknown; parse?: (input: unknown) => unknown }

/** Inlines local "$ref"s (Zod emits them for reused or patterned types) so nothing dangles once $defs is dropped. */
function inlineRefs(node: unknown, defs: Record<string, unknown>, depth = 0): unknown {
  if (Array.isArray(node)) return node.map((n) => inlineRefs(n, defs, depth));
  if (!node || typeof node !== "object") return node;
  const obj = node as Record<string, unknown>;
  if (typeof obj.$ref === "string" && depth < 8) {
    const name = obj.$ref.replace(/^#\/(\$defs|definitions)\//, "");
    const target = defs[name];
    if (target) return inlineRefs(target, defs, depth + 1);
  }
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, inlineRefs(v, defs, depth)]));
}

/** Gemini's function schemas accept a subset of JSON Schema; inline refs, then drop keys it rejects. */
function toGeminiSchema(s: unknown): unknown {
  const root = (s ?? {}) as Record<string, unknown>;
  const defs = { ...((root.$defs as Record<string, unknown>) ?? {}), ...((root.definitions as Record<string, unknown>) ?? {}) };
  return cleanSchema(inlineRefs(root, defs));
}

function cleanSchema(s: unknown): unknown {
  if (Array.isArray(s)) return s.map(cleanSchema);
  if (!s || typeof s !== "object") return s;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s)) {
    if (["$schema", "additionalProperties", "$defs", "definitions", "$ref", "$id", "default", "format", "exclusiveMinimum", "exclusiveMaximum", "pattern"].includes(k)) continue;
    out[k] = cleanSchema(v);
  }
  return out;
}

/** Converts the Claude-style user content the route builds (text + base64 images) to OpenAI parts. */
function toParts(content: BetaMessageParam["content"]): string | Part[] {
  if (typeof content === "string") return content;
  const parts: Part[] = [];
  for (const b of content) {
    if (b.type === "text") parts.push({ type: "text", text: b.text });
    else if (b.type === "image" && b.source.type === "base64") parts.push({ type: "image_url", image_url: { url: `data:${b.source.media_type};base64,${b.source.data}` } });
  }
  return parts;
}

export async function runAgentCompat(
  cfg: CompatConfig, def: AgentDefinition, ctx: Omit<AgentContext, "card">, history: CompatMessage[],
  userContent: BetaMessageParam["content"], contextNote: string, emit: (e: AgentEvent) => void, signal?: AbortSignal,
): Promise<CompatMessage[]> {
  const fullCtx: AgentContext = { ...ctx, card: (card) => emit({ type: "card", card }) };
  const all = def.tools(fullCtx) as unknown[];
  const tools = all.filter((t): t is RunnableTool => typeof (t as RunnableTool).run === "function");
  const hadWebSearch = all.some((t) => (t as { name?: string }).name === "web_search");

  const system = def.system + (hadWebSearch
    ? "\n\nNote: live web search is not available right now. Do not state live prices or product URLs; instead name the Indian marketplaces the user can check (BigHaat, AgroStar, IFFCO Bazar, DeHaat, Amazon India) and what to look for on the pack."
    : "") + "\n- Reply in the user's language and script. Keep answers short and clear for a phone screen."
    + '\n- Whenever you mention any price, fare, fee or cost (rides, buses, hotels, food, medicines, mandi rates, products, trip totals), add one short line at the end: "Note: prices are estimates and not confirmed. Please check before paying." (in the user\'s language).';

  const parts = toParts(userContent);
  const userMsg: CompatMessage = { role: "user", content: typeof parts === "string" ? `${parts}\n\n<context>\n${contextNote}\n</context>` : [...parts, { type: "text", text: `<context>\n${contextNote}\n</context>` }] };
  const messages: CompatMessage[] = [...history, userMsg];

  for (let iteration = 0; iteration < 8; iteration++) {
    const { text, toolCalls } = await streamTurn(cfg, [{ role: "system", content: system }, ...messages], tools, emit, signal);
    messages.push({ role: "assistant", content: text, ...(toolCalls.length ? { tool_calls: toolCalls } : {}) });
    if (!toolCalls.length) break;

    for (const call of toolCalls) {
      emit({ type: "tool", name: call.function.name, status: "start" });
      const tool = tools.find((t) => t.name === call.function.name);
      let result: string;
      try {
        if (!tool) throw new Error(`Unknown tool ${call.function.name}`);
        const raw = call.function.arguments ? JSON.parse(call.function.arguments) : {};
        const input = tool.parse ? tool.parse(raw) : raw; // Zod validation
        const out = await tool.run(input);
        result = typeof out === "string" ? out : JSON.stringify(out);
      } catch (e) {
        result = `Error: ${(e as Error).message}`;
      }
      messages.push({ role: "tool", tool_call_id: call.id, content: result.slice(0, 20_000) });
    }
  }
  return messages;
}

// 404 = model retired for this account: skip to the next one.
const RETRYABLE = new Set([404, 429, 500, 502, 503, 504]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Opens the stream, retrying briefly on overload and then moving down the fallback models. */
async function openStream(cfg: CompatConfig, body: (model: string) => string, signal?: AbortSignal): Promise<Response> {
  const models = [cfg.model, ...cfg.fallbacks.filter((m) => m !== cfg.model)];
  let last: Response | null = null;
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST", signal,
        headers: { "content-type": "application/json", ...(cfg.apiKey ? { authorization: `Bearer ${cfg.apiKey}` } : {}) },
        body: body(model),
      });
      if (res.ok || !RETRYABLE.has(res.status)) return res;
      last = res;
      await res.body?.cancel().catch(() => {});
      if (res.status === 429 || res.status === 404) break; // out of quota or unavailable: go straight to the next model
      await sleep(600 * (attempt + 1));
    }
  }
  return last!;
}

async function streamTurn(cfg: CompatConfig, messages: CompatMessage[], tools: RunnableTool[], emit: (e: AgentEvent) => void, signal?: AbortSignal) {
  const res = await openStream(cfg, (model) => JSON.stringify({
    model,
    stream: true,
    messages,
    ...(tools.length ? {
      tools: tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description ?? "", parameters: toGeminiSchema(t.input_schema) } })),
      tool_choice: "auto",
    } : {}),
  }), signal);
  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    if (res.status === 429) throw new CompatError("The free AI limit was reached for now. Please try again in a minute.");
    if (res.status === 503 || res.status === 500) throw new CompatError("The AI service is busy right now. Please try again in a moment.", body.slice(0, 300));
    if (res.status === 401 || res.status === 403) throw new CompatError("The AI provider rejected the API key. Check it in apps/server/.env.");
    throw new CompatError(`AI provider error ${res.status}`, body.slice(0, 300));
  }

  let text = "";
  const calls = new Map<number, ToolCall>();
  const decoder = new TextDecoder();
  let buf = "";
  for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
    buf += decoder.decode(chunk, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") continue;
      let json: { choices?: Array<{ delta?: { content?: string | null; tool_calls?: Array<{ index?: number; id?: string; function?: { name?: string; arguments?: string }; extra_content?: unknown }> } }> };
      try { json = JSON.parse(data); } catch { continue; }
      const delta = json.choices?.[0]?.delta;
      if (!delta) continue;
      if (delta.content) { text += delta.content; emit({ type: "text", delta: delta.content }); }
      for (const tc of delta.tool_calls ?? []) {
        // OpenAI streams one call in pieces under a stable `index`; Gemini sends each parallel call whole,
        // often without an index. A new id, or a new name on a call that already has one, starts a new call.
        let idx = tc.index ?? Math.max(-1, ...calls.keys());
        const existing = calls.get(idx);
        if (!existing || (tc.id && existing.id !== tc.id && !tc.id.startsWith(existing.id)) || (tc.function?.name && existing.function.name)) {
          idx = existing ? Math.max(...calls.keys()) + 1 : Math.max(idx, 0);
        }
        const cur = calls.get(idx) ?? { id: tc.id || `call_${idx}_${Date.now()}`, type: "function" as const, function: { name: "", arguments: "" } };
        if (tc.id) cur.id = tc.id;
        if (tc.function?.name) cur.function.name += tc.function.name;
        if (tc.function?.arguments) cur.function.arguments += tc.function.arguments;
        if (tc.extra_content) cur.extra_content = tc.extra_content;
        calls.set(idx, cur);
      }
    }
  }
  return { text, toolCalls: [...calls.values()].filter((c) => c.function.name) };
}

export class CompatError extends Error {
  constructor(public userMessage: string, public detail?: string) { super(detail ? `${userMessage}: ${detail}` : userMessage); }
}
