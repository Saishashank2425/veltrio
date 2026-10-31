import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool, type PoolClient } from "pg";

const globalForPool = globalThis as typeof globalThis & { veltrioPool?: Pool; veltrioSchema?: Promise<void> };

export function getPool(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  if (!globalForPool.veltrioPool) {
    globalForPool.veltrioPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSLMODE === "disable" ? false : process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }
  return globalForPool.veltrioPool;
}

export async function ensureSchema(): Promise<void> {
  if (!globalForPool.veltrioSchema) {
    globalForPool.veltrioSchema = (async () => {
      const pool = getPool();
      const client = await pool.connect();
      try {
        await client.query("SELECT pg_advisory_lock(hashtext('veltrio-schema-migrations'))");
        await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
        const applied = await client.query("SELECT 1 FROM schema_migrations WHERE version = $1", ["001_initial_schema"]);
        if (applied.rowCount === 0) {
          const sql = await readFile(resolve(process.cwd(), "migrations/001_initial_schema.sql"), "utf8");
          await client.query("BEGIN");
          try {
            await client.query(sql);
            await client.query("INSERT INTO schema_migrations(version) VALUES ($1)", ["001_initial_schema"]);
            await client.query("COMMIT");
          } catch (error) {
            await client.query("ROLLBACK");
            throw error;
          }
        }
      } catch (error) {
        globalForPool.veltrioSchema = undefined;
        throw error;
      } finally {
        await client.query("SELECT pg_advisory_unlock(hashtext('veltrio-schema-migrations'))").catch(() => undefined);
        client.release();
      }
    })();
  }
  await globalForPool.veltrioSchema;
}

export async function withTransaction<T>(run: (client: PoolClient) => Promise<T>): Promise<T> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await run(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
