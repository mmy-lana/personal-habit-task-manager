import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { requireDatabaseUrl } from './env.js';

/**
 * Migrations are generated into `src/migrations` and copied verbatim into `dist/`
 * by `scripts/copy-assets.mjs` during `pnpm build`, so the compiled runner resolves
 * the same folder that the built JavaScript lives next to.
 */
const MIGRATIONS_FOLDER = resolve(dirname(fileURLToPath(import.meta.url)), 'migrations');

/**
 * Neon transaction-mode pooling may hand a different backend session to every logical
 * connection, so a migration — which must run as a single atomic unit against one
 * session — pins a dedicated pool of exactly one connection.
 */
const MIGRATION_POOL_MAX_CONNECTIONS = 1;

/**
 * Renders a connection target for logs without leaking credentials.
 */
function describeTarget(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    const database = url.pathname.replace(/^\//, '');
    const host = url.hostname.length > 0 ? url.hostname : 'unknown-host';
    return `${host}/${database.length > 0 ? database : 'unknown-database'}`;
  } catch {
    return 'unparseable-connection-string';
  }
}

export async function runMigrations(): Promise<void> {
  const connectionString = requireDatabaseUrl();

  process.stdout.write(`[database] applying migrations to ${describeTarget(connectionString)}\n`);

  const pool = new Pool({
    connectionString,
    max: MIGRATION_POOL_MAX_CONNECTIONS,
    allowExitOnIdle: true,
  });

  // The migrator only needs a bare client; the schema is irrelevant for DDL replay.
  const db = drizzle(pool);

  try {
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    process.stdout.write('[database] migrations applied successfully\n');
  } finally {
    await pool.end();
  }
}

runMigrations().catch((error: unknown) => {
  const reason = error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(`[database] migration run failed: ${reason}\n`);
  process.exitCode = 1;
});
