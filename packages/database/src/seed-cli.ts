import { requireDatabaseUrl } from './env.js';
import { seedDevUser } from './seed.js';

/**
 * Standalone seed runner (`pnpm db:seed`).
 *
 * Seeds the default development identity so foreign keys resolve in non-auth dev
 * mode. Idempotent — safe to run repeatedly.
 */
const connectionString = requireDatabaseUrl();

await seedDevUser(connectionString);

process.stdout.write('[database] development identity seed ensured\n');
