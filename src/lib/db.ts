import "server-only";
import { SCHEMA } from "./schema";
import { seedDemo } from "./seed";

// One tiny query interface over two drivers:
//  - Neon serverless Postgres in production (DATABASE_URL set)
//  - PGlite (Postgres compiled to WASM) locally and in tests, no install needed
export interface Db {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

declare global {
  var __werkbankDb: Promise<Db> | undefined;
}

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  let db: Db;
  if (url) {
    const { Pool } = await import("@neondatabase/serverless");
    const pool = new Pool({ connectionString: url });
    db = { query: (t, p) => pool.query(t, p as unknown[]) as never };
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    // In-memory on serverless hosts and in tests; a local folder in dev so data survives restarts.
    const dir = process.env.VERCEL || process.env.NODE_ENV === "test" ? undefined : "./.pglite";
    const pg = new PGlite(dir);
    db = { query: (t, p) => pg.query(t, p as unknown[]) as never };
  }
  for (const stmt of SCHEMA) await db.query(stmt);
  await seedDemo(db);
  return db;
}

export function getDb(): Promise<Db> {
  globalThis.__werkbankDb ??= connect().catch((e) => {
    globalThis.__werkbankDb = undefined;
    throw e;
  });
  return globalThis.__werkbankDb;
}

export const usingEphemeralDb = () => !process.env.DATABASE_URL && !!process.env.VERCEL;
