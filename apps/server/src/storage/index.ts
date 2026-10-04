/**
 * File storage on Supabase Storage (public bucket). Nothing is written to the server's disk.
 * Tests use an in-memory store so they never touch the network or disk.
 */
import { env } from "../env.ts";

const memory = new Map<string, { body: Buffer; type: string }>();
const useMemory = () => env.NODE_ENV === "test" && !env.SUPABASE_URL;

function base() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase Storage is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  return { url: env.SUPABASE_URL.replace(/\/$/, ""), key: env.SUPABASE_SERVICE_ROLE_KEY, bucket: env.SUPABASE_BUCKET };
}

/** Legacy service_role keys are JWTs (sent as Bearer too); new "sb_secret_…" keys go only in the apikey header. */
function auth(key: string): Record<string, string> {
  return key.startsWith("sb_secret_") ? { apikey: key } : { apikey: key, authorization: `Bearer ${key}` };
}

/** Uploads (or replaces) an object and returns its public URL. `path` like "avatars/<user>-123.jpg". */
export async function putObject(path: string, body: Buffer, contentType: string): Promise<string> {
  if (useMemory()) { memory.set(path, { body, type: contentType }); return `memory://${path}`; }
  const { url, key, bucket } = base();
  const res = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: { ...auth(key), "content-type": contentType, "x-upsert": "true", "cache-control": "max-age=3600" },
    body: new Uint8Array(body),
  });
  if (!res.ok) throw new Error(`Storage upload ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return publicUrl(path);
}

/** Deletes an object given its public URL or path; ignores anything that isn't ours. */
export async function deleteObject(urlOrPath: string): Promise<void> {
  const path = toPath(urlOrPath);
  if (!path) return;
  if (useMemory()) { memory.delete(path); return; }
  const { url, key, bucket } = base();
  await fetch(`${url}/storage/v1/object/${bucket}`, {
    method: "DELETE", headers: { ...auth(key), "content-type": "application/json" }, body: JSON.stringify({ prefixes: [path] }),
  }).catch(() => {});
}

export function publicUrl(path: string): string {
  const { url, bucket } = base();
  return `${url}/storage/v1/object/public/${bucket}/${path}`;
}

function toPath(urlOrPath: string): string | null {
  if (urlOrPath.startsWith("memory://")) return urlOrPath.slice(9);
  const m = /\/storage\/v1\/object\/public\/[^/]+\/(.+)$/.exec(urlOrPath);
  if (m) return m[1];
  return /^[a-z]+\/[\w.-]+$/.test(urlOrPath) ? urlOrPath : null;
}

/** Creates the public bucket on first run (idempotent). */
export async function ensureBucket(): Promise<void> {
  if (useMemory()) return;
  const { url, key, bucket } = base();
  const res = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST", headers: { ...auth(key), "content-type": "application/json" },
    body: JSON.stringify({ id: bucket, name: bucket, public: true, file_size_limit: 12 * 1024 * 1024, allowed_mime_types: ["image/jpeg", "image/png", "image/gif", "image/webp"] }),
  });
  if (!res.ok && res.status !== 409 && !/already exists|Duplicate/i.test(await res.text())) throw new Error(`Storage bucket ${res.status}`);
}

export const memoryStoreSize = () => memory.size;
