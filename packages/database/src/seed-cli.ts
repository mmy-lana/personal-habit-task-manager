import pg from 'pg';
import { isLocalConnectionString, requireDatabaseUrl } from './index.js';
import { seedDevUser } from './seed.js';

/**
 * Standalone seed runner (`pnpm db:seed`).
 *
 * Seeds the default development identity so foreign keys resolve in non-auth dev
 * mode. Idempotent — safe to run repeatedly.
 *
 * Local development databases (docker compose) route through the standard TCP
 * `pg` driver; Neon targets use the WebSocket serverless pool.
 */
const connectionString = requireDatabaseUrl();

if (isLocalConnectionString(connectionString)) {
  const pool = new pg.Pool({ connectionString, max: 1 });
  try {
    const { drizzle } = await import('drizzle-orm/node-postgres');
    await seedDevUser(drizzle(pool));
  } finally {
    await pool.end();
  }
} else {
  await seedDevUser(connectionString);
}

process.stdout.write('[database] development identity seed ensured\n');
