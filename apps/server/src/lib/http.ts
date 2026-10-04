import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) { super(message); }
}

export function parse<S extends z.ZodType>(schema: S, data: unknown): z.infer<S> {
  const r = schema.safeParse(data);
  if (!r.success) throw new HttpError(400, r.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; "), "validation");
  return r.data;
}

export interface AuthUser { id: string; roles: string[] }
declare module "fastify" {
  interface FastifyRequest { auth: AuthUser }
}

export async function requireAuth(req: FastifyRequest, _reply: FastifyReply) {
  try {
    const claims = await req.jwtVerify<{ sub: string; roles: string[] }>();
    req.auth = { id: claims.sub, roles: claims.roles };
  } catch {
    throw new HttpError(401, "Please sign in again.", "unauthenticated");
  }
}

export const LatLngSchema = z.object({ name: z.string().min(1), lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });
