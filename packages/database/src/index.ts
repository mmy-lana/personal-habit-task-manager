export * from './schema/index.js';
export * from './client.js';
export { requireDatabaseUrl, loadEnvFiles } from './env.js';

// Re-export Drizzle query operators so consuming packages (api) do not need
// a direct `drizzle-orm` dependency — pnpm strict mode prevents hoisting.
export { eq, ne, and, or, not, sql, desc, asc, count, inArray, isNull, gte, lte, gt, lt } from 'drizzle-orm';
