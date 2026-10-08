import { neon, Pool, type NeonQueryFunction, type PoolConfig } from '@neondatabase/serverless';
import { drizzle as drizzleHttp, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { drizzle, type NeonDatabase } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzleNodePg } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index.js';

/** The compiled Drizzle schema surface shared by every client factory below. */
export type DatabaseSchema = typeof schema;

/**
 * Transaction-capable database client.
 *
 * Backed by `drizzle-orm/neon-serverless` over a WebSocket `Pool`, which is the only
 * Neon driver that exposes real `BEGIN`/`COMMIT` semantics. Every atomic write in this
 * codebase (habit streak recalculation, duplicate check-in guards, multi-row updates)
 * depends on those semantics, so this is the default client used by every repository.
 */
export type DatabaseClient = NeonDatabase<DatabaseSchema>;

/**
 * Stateless read-only client used for hot aggregate/read paths.
 *
 * `drizzle-orm/neon-http` speaks plain HTTP and is cheaper for point reads, but it
 * *cannot* run transactions — see `packages/database/docs` and the repository
 * transaction standard. Use it for reads only.
 */
export type ReadOnlyDatabaseClient = NeonHttpDatabase<DatabaseSchema>;

export const DEFAULT_POOL_MAX_CONNECTIONS = 10;
export const DEFAULT_POOL_IDLE_TIMEOUT_MS = 30_000;
export const DEFAULT_POOL_CONNECTION_TIMEOUT_MS = 10_000;

export interface DatabaseClientOptions {
  /** Upper bound on pooled connections. Keep low: Neon proxies use transaction-mode pooling. */
  readonly maxConnections?: number;
  readonly idleTimeoutMillis?: number;
  readonly connectionTimeoutMillis?: number;
  /** Enables Drizzle query logging. Never enable in production. */
  readonly logger?: boolean;
}

const CONNECTION_STRING_PATTERN = /^postgres(?:ql)?:\/\//i;

/**
 * Detects a plain local PostgreSQL endpoint (Docker `db:up`, Homebrew, etc.).
 *
 * The Neon WebSocket driver only speaks the Neon proxy protocol, so local
 * development databases must use the standard TCP `pg` driver instead.
 */
export function isLocalConnectionString(connectionString: string): boolean {
  try {
    const url = new URL(connectionString.trim());
    return ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  } catch {
    return false;
  }
}

function assertConnectionString(connectionString: string): string {
  const normalized = connectionString.trim();

  if (normalized.length === 0) {
    throw new Error('[database] Connection string must not be empty (set DATABASE_URL).');
  }

  if (!CONNECTION_STRING_PATTERN.test(normalized)) {
    throw new Error('[database] Connection string must start with "postgres://" or "postgresql://".');
  }

  return normalized;
}

/**
 * The transaction-capable driver tunnels over WebSocket. Node >= 22 ships a global
 * `WebSocket`, which `@neondatabase/serverless` uses directly, so no `ws` dependency is
 * required. Fail loudly rather than silently degrading if that ever stops holding.
 */
function assertWebSocketSupport(): void {
  if (typeof globalThis.WebSocket !== 'function') {
    throw new Error(
      '[database] No global WebSocket implementation was found. The transaction-capable Neon ' +
        'driver requires Node >= 22.12 or an explicit `webSocketConstructor` (for example `ws`).',
    );
  }
}

/**
 * Creates the underlying Neon connection pool.
 *
 * The pool must be closed with `pool.end()` during graceful shutdown so the WebSocket
 * tunnel and the Neon proxy session are released.
 */
export function createDatabasePool(connectionString: string, options: DatabaseClientOptions = {}): Pool {
  assertWebSocketSupport();

  const poolConfig: PoolConfig = {
    connectionString: assertConnectionString(connectionString),
    max: options.maxConnections ?? DEFAULT_POOL_MAX_CONNECTIONS,
    idleTimeoutMillis: options.idleTimeoutMillis ?? DEFAULT_POOL_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: options.connectionTimeoutMillis ?? DEFAULT_POOL_CONNECTION_TIMEOUT_MS,
    // Serverless instances are recycled aggressively; never hold the process open.
    allowExitOnIdle: true,
  };

  return new Pool(poolConfig);
}

/**
 * Creates the primary, transaction-capable Drizzle client.
 */
export function createDatabaseClient(
  connectionString: string,
  options: DatabaseClientOptions = {},
): DatabaseClient {
  // Local development databases (docker compose `db:up`) cannot speak the Neon
  // WebSocket protocol, so they route through the standard TCP `pg` driver. The
  // Drizzle node-postgres client exposes the identical query/transaction surface
  // used by every repository.
  if (isLocalConnectionString(connectionString)) {
    const pool = new pg.Pool({
      connectionString: assertConnectionString(connectionString),
      max: options.maxConnections ?? DEFAULT_POOL_MAX_CONNECTIONS,
      idleTimeoutMillis: options.idleTimeoutMillis ?? DEFAULT_POOL_IDLE_TIMEOUT_MS,
      connectionTimeoutMillis: options.connectionTimeoutMillis ?? DEFAULT_POOL_CONNECTION_TIMEOUT_MS,
    });
    return drizzleNodePg(pool, { schema, logger: options.logger ?? false }) as unknown as DatabaseClient;
  }

  const pool = createDatabasePool(connectionString, options);
  return drizzle(pool, { schema, logger: options.logger ?? false });
}

/**
 * Creates a stateless HTTP client for read-only queries.
 *
 * Transactions are unavailable on this driver by design; every write path must go
 * through {@link createDatabaseClient}.
 */
export function createReadOnlyClient(connectionString: string): ReadOnlyDatabaseClient {
  const sql: NeonQueryFunction<boolean, boolean> = neon(assertConnectionString(connectionString));
  return drizzleHttp(sql, { schema });
}

/**
 * Releases the pooled WebSocket connections held by a pool created with
 * {@link createDatabasePool}. Safe to call more than once.
 *
 * Because the Drizzle `NeonDatabase` wrapper does not expose the underlying
 * `Pool`, callers that need graceful shutdown should retain the `Pool` reference
 * returned by {@link createDatabasePool} and pass it here.
 */
export async function closeDatabasePool(pool: Pool): Promise<void> {
  await pool.end();
}
