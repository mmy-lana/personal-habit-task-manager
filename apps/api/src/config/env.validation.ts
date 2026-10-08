/**
 * Runtime environment contract for the API process.
 *
 * The schema is intentionally dependency-free: NestJS boots with a single, loud,
 * aggregated failure instead of a partially configured service that fails later in a
 * request handler. Validation runs before any provider is constructed.
 */

export const NODE_ENVIRONMENTS = ['development', 'test', 'production'] as const;

export type NodeEnvironment = (typeof NODE_ENVIRONMENTS)[number];

/** Fully validated, normalised API configuration. */
export interface ApiEnvironment {
  readonly nodeEnv: NodeEnvironment;
  readonly isProduction: boolean;
  readonly port: number;
  readonly databaseUrl: string;
  readonly databasePoolMaxConnections: number;
  readonly jwtAccessSecret: string;
  readonly jwtRefreshSecret: string;
  /** Access token lifetime in seconds; surfaced verbatim as `AuthTokenResponseDto.expiresIn`. */
  readonly jwtAccessExpiresInSeconds: number;
  readonly jwtRefreshExpiresInSeconds: number;
  /** Strict CORS allow-list. An empty list would reject every browser origin. */
  readonly corsOrigins: readonly string[];
  readonly apiBaseUrl: string;
  readonly webBaseUrl: string;
}

/** Aggregates every configuration problem so a single boot reports all of them. */
export class EnvironmentValidationError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(
      `Invalid environment configuration:\n${issues.map((issue) => `  - ${issue}`).join('\n')}\n\n` +
        'See .env.example for the expected contract.',
    );
    this.name = 'EnvironmentValidationError';
  }
}

const POSTGRES_URL_PATTERN = /^postgres(?:ql)?:\/\//i;
const MIN_SECRET_LENGTH = 32;
const DURATION_PATTERN = /^(\d+)(s|m|h|d)?$/;
const DURATION_UNIT_SECONDS: Readonly<Record<string, number>> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
};

const DEFAULTS = {
  nodeEnv: 'development' as const,
  port: 3000 as number,
  databasePoolMaxConnections: 10 as number,
  jwtAccessExpiresIn: '900s' as const,
  jwtRefreshExpiresIn: '7d' as const,
  corsOrigin: 'http://localhost:4200' as const,
  apiBaseUrl: 'http://localhost:3000' as const,
  webBaseUrl: 'http://localhost:4200' as const,
};

/** Strips surrounding whitespace and treats an empty string as "not provided". */
function normalise(raw: string | undefined): string | undefined {
  if (raw === undefined) {
    return undefined;
  }

  const trimmed = raw.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function parseDurationSeconds(raw: string): number | undefined {
  const match = DURATION_PATTERN.exec(raw);
  if (match === null) {
    return undefined;
  }

  const amount = Number.parseInt(match[1] ?? '', 10);
  const unit = match[2] ?? 's';
  const multiplier = DURATION_UNIT_SECONDS[unit];

  if (!Number.isSafeInteger(amount) || amount <= 0 || multiplier === undefined) {
    return undefined;
  }

  return amount * multiplier;
}

function isHttpUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Parses `process.env`-shaped input into a validated {@link ApiEnvironment}.
 *
 * @throws {EnvironmentValidationError} listing every invalid or missing variable.
 */
export function parseApiEnvironment(raw: Record<string, unknown>): ApiEnvironment {
  const issues: string[] = [];

  const nodeEnvRaw = normalise(typeof raw['NODE_ENV'] === 'string' ? (raw['NODE_ENV'] as string) : undefined);
  const isKnownNodeEnv =
    nodeEnvRaw === undefined || (NODE_ENVIRONMENTS as readonly string[]).includes(nodeEnvRaw);
  const nodeEnv = isKnownNodeEnv ? (nodeEnvRaw as NodeEnvironment | undefined) ?? DEFAULTS.nodeEnv : DEFAULTS.nodeEnv;
  if (!isKnownNodeEnv) {
    issues.push(`NODE_ENV must be one of ${NODE_ENVIRONMENTS.join(', ')} (received "${nodeEnvRaw}").`);
  }
  const isProduction = nodeEnv === 'production';

  const portRaw = normalise(typeof raw['PORT'] === 'string' ? (raw['PORT'] as string) : undefined);
  let port = DEFAULTS.port;
  if (portRaw !== undefined) {
    const parsed = Number.parseInt(portRaw, 10);
    if (!/^\d+$/.test(portRaw) || !Number.isSafeInteger(parsed) || parsed < 1 || parsed > 65535) {
      issues.push(`PORT must be an integer between 1 and 65535 (received "${portRaw}").`);
    } else {
      port = parsed;
    }
  }

  const databaseUrl = normalise(
    typeof raw['DATABASE_URL'] === 'string' ? (raw['DATABASE_URL'] as string) : undefined,
  );
  if (databaseUrl === undefined) {
    issues.push('DATABASE_URL is required (Neon pooled connection string).');
  } else if (!POSTGRES_URL_PATTERN.test(databaseUrl)) {
    issues.push('DATABASE_URL must be a postgres:// or postgresql:// connection string.');
  }

  const poolRaw = normalise(
    typeof raw['DATABASE_POOL_MAX_CONNECTIONS'] === 'string'
      ? (raw['DATABASE_POOL_MAX_CONNECTIONS'] as string)
      : undefined,
  );
  let databasePoolMaxConnections = DEFAULTS.databasePoolMaxConnections;
  if (poolRaw !== undefined) {
    const parsed = Number.parseInt(poolRaw, 10);
    if (!/^\d+$/.test(poolRaw) || parsed < 1 || parsed > 20) {
      issues.push(
        `DATABASE_POOL_MAX_CONNECTIONS must be an integer between 1 and 20 for Neon ` +
          `transaction-mode pooling (received "${poolRaw}").`,
      );
    } else {
      databasePoolMaxConnections = parsed;
    }
  }

  const jwtAccessSecret = normalise(
    typeof raw['JWT_ACCESS_SECRET'] === 'string' ? (raw['JWT_ACCESS_SECRET'] as string) : undefined,
  );
  if (jwtAccessSecret === undefined) {
    issues.push('JWT_ACCESS_SECRET is required.');
  } else if (jwtAccessSecret.length < MIN_SECRET_LENGTH) {
    issues.push(`JWT_ACCESS_SECRET must be at least ${MIN_SECRET_LENGTH} characters.`);
  }

  const jwtRefreshSecret = normalise(
    typeof raw['JWT_REFRESH_SECRET'] === 'string' ? (raw['JWT_REFRESH_SECRET'] as string) : undefined,
  );
  if (jwtRefreshSecret === undefined) {
    issues.push('JWT_REFRESH_SECRET is required.');
  } else if (jwtRefreshSecret.length < MIN_SECRET_LENGTH) {
    issues.push(`JWT_REFRESH_SECRET must be at least ${MIN_SECRET_LENGTH} characters.`);
  } else if (jwtAccessSecret !== undefined && jwtRefreshSecret === jwtAccessSecret) {
    issues.push('JWT_REFRESH_SECRET must differ from JWT_ACCESS_SECRET.');
  }

  const accessExpiresRaw = normalise(
    typeof raw['JWT_ACCESS_EXPIRES_IN'] === 'string' ? (raw['JWT_ACCESS_EXPIRES_IN'] as string) : undefined,
  );
  let jwtAccessExpiresInSeconds = parseDurationSeconds(DEFAULTS.jwtAccessExpiresIn) ?? 900;
  if (accessExpiresRaw !== undefined) {
    const parsed = parseDurationSeconds(accessExpiresRaw);
    if (parsed === undefined) {
      issues.push(
        `JWT_ACCESS_EXPIRES_IN must be a duration such as "900s", "15m" or "1h" (received "${accessExpiresRaw}").`,
      );
    } else {
      jwtAccessExpiresInSeconds = parsed;
    }
  }

  const refreshExpiresRaw = normalise(
    typeof raw['JWT_REFRESH_EXPIRES_IN'] === 'string' ? (raw['JWT_REFRESH_EXPIRES_IN'] as string) : undefined,
  );
  let jwtRefreshExpiresInSeconds = parseDurationSeconds(DEFAULTS.jwtRefreshExpiresIn) ?? 604800;
  if (refreshExpiresRaw !== undefined) {
    const parsed = parseDurationSeconds(refreshExpiresRaw);
    if (parsed === undefined) {
      issues.push(
        `JWT_REFRESH_EXPIRES_IN must be a duration such as "7d" or "168h" (received "${refreshExpiresRaw}").`,
      );
    } else {
      jwtRefreshExpiresInSeconds = parsed;
    }
  }

  if (jwtAccessExpiresInSeconds >= jwtRefreshExpiresInSeconds) {
    issues.push('JWT_ACCESS_EXPIRES_IN must be shorter than JWT_REFRESH_EXPIRES_IN.');
  }

  const corsRaw = normalise(
    typeof raw['CORS_ORIGIN'] === 'string' ? (raw['CORS_ORIGIN'] as string) : undefined,
  );
  let corsOrigins: readonly string[] = [DEFAULTS.corsOrigin];
  if (corsRaw !== undefined) {
    const parsed = corsRaw
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);

    if (parsed.length === 0) {
      issues.push('CORS_ORIGIN must list at least one absolute http(s) origin.');
    } else {
      const invalid = parsed.filter((origin) => !isHttpUrl(origin));
      if (invalid.length > 0) {
        issues.push(
          `CORS_ORIGIN entries must be absolute http(s) origins without a path ` +
            `(invalid: ${invalid.join(', ')}).`,
        );
      } else {
        corsOrigins = parsed;
      }
    }
  } else if (isProduction) {
    issues.push('CORS_ORIGIN is required in production and must list the deployed web origins.');
  }

  const apiBaseUrlRaw = normalise(
    typeof raw['API_BASE_URL'] === 'string' ? (raw['API_BASE_URL'] as string) : undefined,
  );
  if (apiBaseUrlRaw !== undefined && !isHttpUrl(apiBaseUrlRaw)) {
    issues.push(`API_BASE_URL must be an absolute http(s) URL (received "${apiBaseUrlRaw}").`);
  }

  const webBaseUrlRaw = normalise(
    typeof raw['WEB_BASE_URL'] === 'string' ? (raw['WEB_BASE_URL'] as string) : undefined,
  );
  if (webBaseUrlRaw !== undefined && !isHttpUrl(webBaseUrlRaw)) {
    issues.push(`WEB_BASE_URL must be an absolute http(s) URL (received "${webBaseUrlRaw}").`);
  }

  if (issues.length > 0) {
    throw new EnvironmentValidationError(issues);
  }

  return Object.freeze({
    nodeEnv,
    isProduction,
    port,
    // Both branches are validated above; the fallback keeps the type non-optional.
    databaseUrl: databaseUrl as string,
    databasePoolMaxConnections,
    jwtAccessSecret: jwtAccessSecret as string,
    jwtRefreshSecret: jwtRefreshSecret as string,
    jwtAccessExpiresInSeconds,
    jwtRefreshExpiresInSeconds,
    corsOrigins,
    apiBaseUrl: apiBaseUrlRaw ?? DEFAULTS.apiBaseUrl,
    webBaseUrl: webBaseUrlRaw ?? DEFAULTS.webBaseUrl,
  });
}

/**
 * `ConfigModule.forRoot` hook.
 *
 * Validates eagerly, then returns the raw record so `ConfigService.get('PORT')` and
 * friends keep working for code that has not migrated to {@link parseApiEnvironment}.
 */
export function validateEnvironment(raw: Record<string, unknown>): Record<string, unknown> {
  parseApiEnvironment(raw);
  return { ...raw };
}
