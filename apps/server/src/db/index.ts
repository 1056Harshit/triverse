import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { env } from "../env.ts";
import * as schema from "./schema.ts";

const MIGRATIONS = new URL("../../drizzle", import.meta.url).pathname;

/**
 * Supabase Postgres (or any Postgres) in development and production; migrations run on boot.
 * `DATABASE_URL=pglite:memory` gives tests a throwaway in-memory database (nothing written to disk).
 */
async function connect(): Promise<PostgresJsDatabase<typeof schema>> {
  if (env.DATABASE_URL === "pglite:memory") {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle: drizzlePglite } = await import("drizzle-orm/pglite");
    const { migrate: migratePglite } = await import("drizzle-orm/pglite/migrator");
    const d = drizzlePglite(new PGlite(), { schema });
    await migratePglite(d, { migrationsFolder: MIGRATIONS });
    return d as unknown as PostgresJsDatabase<typeof schema>;
  }
  if (env.DATABASE_URL.startsWith("pglite:")) {
    throw new Error("On-disk PGlite is no longer used. Set DATABASE_URL to your Supabase connection string (Session pooler).");
  }
  // Supabase poolers don't support prepared statements; TLS is required for hosted databases.
  const hosted = !/localhost|127\.0\.0\.1/.test(env.DATABASE_URL);
  const options = { prepare: false, ssl: hosted ? ("require" as const) : undefined };
  const migrator = postgres(env.DATABASE_URL, { ...options, max: 1, onnotice: () => {} });
  try { await migrate(drizzle(migrator), { migrationsFolder: MIGRATIONS }); } finally { await migrator.end(); }
  return drizzle(postgres(env.DATABASE_URL, { ...options, max: 10 }), { schema });
}

export const db = await connect();
export { schema };
