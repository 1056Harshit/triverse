import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { fetch } from "expo/fetch";
import type { AgentChatRequest, AgentEvent, AgentId } from "@triverse/shared";

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";
const KEY = "triverse.session";

export interface Session { accessToken: string; refreshToken: string }
export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) { super(message); }
}

let session: Session | null = null;
let onSignedOut: (() => void) | null = null;
let refreshing: Promise<boolean> | null = null;

// Keychain/Keystore on devices; localStorage only for the web build.
const store = Platform.OS === "web"
  ? { get: async (k: string) => globalThis.localStorage?.getItem(k) ?? null, set: async (k: string, v: string) => globalThis.localStorage?.setItem(k, v), del: async (k: string) => globalThis.localStorage?.removeItem(k) }
  : { get: SecureStore.getItemAsync, set: SecureStore.setItemAsync, del: SecureStore.deleteItemAsync };

export async function loadSession() {
  const raw = await store.get(KEY);
  session = raw ? (JSON.parse(raw) as Session) : null;
  return session;
}
export async function saveSession(s: Session | null) {
  session = s;
  if (s) await store.set(KEY, JSON.stringify(s));
  else await store.del(KEY);
}
export const setSignedOutHandler = (fn: () => void) => { onSignedOut = fn; };

async function refresh(): Promise<boolean> {
  if (!session) return false;
  refreshing ??= (async () => {
    const res = await fetch(`${API_URL}/auth/refresh`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ refreshToken: session!.refreshToken }) });
    if (!res.ok) { await saveSession(null); onSignedOut?.(); return false; }
    await saveSession((await res.json()) as Session);
    return true;
  })().finally(() => { refreshing = null; });
  return refreshing;
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}, retry = true): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers: { "content-type": "application/json", ...(session ? { authorization: `Bearer ${session.accessToken}` } : {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  if (res.status === 401 && retry && session && (await refresh())) return api<T>(path, init, false);
  const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
  if (!res.ok) throw new ApiError(res.status, data.error ?? "Something went wrong", data.code);
  return data as T;
}

/** Streams an agent reply over SSE. Returns an abort function. */
export function chatStream(agent: AgentId, body: AgentChatRequest, onEvent: (e: AgentEvent) => void): () => void {
  const ctrl = new AbortController();
  (async () => {
    const open = () => fetch(`${API_URL}/agents/${agent}/chat`, {
      method: "POST", signal: ctrl.signal,
      headers: { "content-type": "application/json", accept: "text/event-stream", ...(session ? { authorization: `Bearer ${session.accessToken}` } : {}) },
      body: JSON.stringify(body),
    });
    let res = await open();
    if (res.status === 401 && (await refresh())) res = await open();
    if (!res.ok || !res.body) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      onEvent({ type: "error", message: err.error ?? "Couldn't reach the assistant." });
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n\n")) !== -1) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 2);
        if (line.startsWith("data: ")) onEvent(JSON.parse(line.slice(6)) as AgentEvent);
      }
    }
  })().catch((e: unknown) => {
    if (!ctrl.signal.aborted) onEvent({ type: "error", message: e instanceof TypeError ? "Couldn't reach the assistant. Check your connection and try again." : e instanceof Error ? e.message : "Network error" });
  });
  return () => ctrl.abort();
}
