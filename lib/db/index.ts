import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export type OxyDb = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  oxyDb?: { url: string; db: OxyDb };
};

// Returns null when DATABASE_URL is unset — the app degrades to stateless chat.
export function getDb(): OxyDb | null {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  // Recreate the client if the connection string changed since it was cached,
  // so a stale/broken DATABASE_URL never keeps poisoning an existing client.
  if (globalForDb.oxyDb && globalForDb.oxyDb.url === url) {
    return globalForDb.oxyDb.db;
  }
  const client = postgres(url, {
    // Supabase's transaction-mode pooler does not support prepared statements.
    prepare: false,
    max: 1,
  });
  globalForDb.oxyDb = { url, db: drizzle(client, { schema }) };
  return globalForDb.oxyDb.db;
}
