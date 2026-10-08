import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit loads this file in isolation, so the `.env` bootstrap is intentionally
// duplicated from `src/env.ts` rather than imported.
const packageRoot = typeof import.meta.dirname === 'string'
  ? import.meta.dirname
  : dirname(fileURLToPath(import.meta.url));
const workspaceEnv = resolve(packageRoot, '..', '..', '.env');
const packageEnv = resolve(packageRoot, '.env');

for (const candidate of [workspaceEnv, packageEnv]) {
  if (existsSync(candidate)) {
    process.loadEnvFile(candidate);
    break;
  }
}

const databaseUrl = process.env['DATABASE_URL']?.trim();

/**
 * `generate` and `check` are pure schema-to-SQL operations and run in CI without
 * database credentials, so a placeholder keeps them usable. Commands that actually
 * connect (`migrate`, `studio`, `push`) fail loudly with a connection error instead.
 */
const PLACEHOLDER_URL = 'postgresql://placeholder:placeholder@localhost:5432/placeholder';

if (databaseUrl === undefined || databaseUrl.length === 0) {
  process.stderr.write(
    '[database] DATABASE_URL is not set; using a placeholder. Commands that open a ' +
      'connection (db:migrate, db:studio) will fail until a real Neon URL is provided.\n',
  );
}

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './src/migrations',
  dialect: 'postgresql',
  strict: true,
  verbose: true,
  dbCredentials: {
    url: databaseUrl ?? PLACEHOLDER_URL,
  },
});
