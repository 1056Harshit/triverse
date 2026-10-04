import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../env.ts";
import * as schema from "./schema.ts";

/**
 * Postgres in production. `DATABASE_URL=pglite:./.data` runs an embedded
 * Postgres (PGlite) with migrations applied on boot, for local dev and tests.
 */
async function connect(): Promise<PostgresJsDatabase<typeof schema>> {
  if (env.DATABASE_URL.startsWith("pglite:")) {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle: drizzlePglite } = await import("drizzle-orm/pglite");
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    const dir = env.DATABASE_URL.slice("pglite:".length);
    const pg = dir === "memory" ? new PGlite() : new PGlite(dir);
    const d = drizzlePglite(pg, { schema });
    await migrate(d, { migrationsFolder: new URL("../../drizzle", import.meta.url).pathname });
    return d as unknown as PostgresJsDatabase<typeof schema>;
  }
  return drizzle(postgres(env.DATABASE_URL, { max: 10 }), { schema });
}

export const db = await connect();
export { schema };
