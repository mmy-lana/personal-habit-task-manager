import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Candidate `.env` locations, ordered by precedence.
 *
 * The first entry that exists is loaded. Pre-existing `process.env` values always
 * win, because `process.loadEnvFile` never overwrites an already defined variable.
 */
export function envFileCandidates(): readonly string[] {
  // Resolves identically from `src/env.ts` and the compiled `dist/env.js`.
  const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const workspaceRoot = resolve(packageRoot, '..', '..');
  return [resolve(workspaceRoot, '.env'), resolve(packageRoot, '.env')];
}

/**
 * Loads the first existing `.env` file into `process.env`.
 *
 * Uses the Node-native loader (Node >= 20.12) so the package keeps a zero-runtime-
 * dependency footprint. Missing or malformed files are non-fatal: a missing file is
 * expected in CI and production where variables are injected by the platform.
 */
export function loadEnvFiles(): string | null {
  for (const candidate of envFileCandidates()) {
    if (!existsSync(candidate)) {
      continue;
    }

    try {
      process.loadEnvFile(candidate);
      return candidate;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`[database] Failed to load environment file "${candidate}": ${reason}`);
    }
  }

  return null;
}

/**
 * Reads `DATABASE_URL` from the environment, failing loudly when it is absent.
 */
export function requireDatabaseUrl(): string {
  loadEnvFiles();

  const connectionString = process.env['DATABASE_URL'];
  if (connectionString === undefined || connectionString.trim().length === 0) {
    throw new Error(
      '[database] DATABASE_URL is not set. Copy .env.example to .env and provide the Neon connection string.',
    );
  }

  return connectionString.trim();
}
