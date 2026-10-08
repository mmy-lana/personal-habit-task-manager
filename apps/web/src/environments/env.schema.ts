/**
 * Browser-side environment contract.
 *
 * A browser bundle has no `process.env`, so configuration is injected at build time by
 * the Angular builder's `fileReplacements`. That makes silent mistakes easy — a missing
 * file replacement quietly yields a development build's localhost URL in production.
 * This schema turns that class of mistake into an immediate, explicit boot failure.
 */

/** Public, non-secret configuration available to the browser bundle. */
export interface WebEnvironment {
  readonly production: boolean;
  /**
   * Either an absolute `http(s)` origin plus path (development) or a root-relative path
   * that the deployment's reverse proxy forwards to the API (production).
   */
  readonly apiBaseUrl: string;
}

/** Aggregates every configuration problem so one boot reports all of them. */
export class WebEnvironmentValidationError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(
      `Invalid web environment configuration:\n${issues.map((issue) => `  - ${issue}`).join('\n')}`,
    );
    this.name = 'WebEnvironmentValidationError';
  }
}

/** Root-relative paths must start with a single slash and carry no origin. */
const RELATIVE_API_PATH_PATTERN = /^\/(?!\/)[A-Za-z0-9._~!$&'()*+,;=:@%/-]*$/;

function validateApiBaseUrl(issues: string[], value: unknown): void {
  if (typeof value !== 'string') {
    issues.push(`apiBaseUrl must be a string (received ${value === undefined ? 'undefined' : typeof value}).`);
    return;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    issues.push('apiBaseUrl must not be empty.');
    return;
  }

  if (trimmed.startsWith('/')) {
    if (!RELATIVE_API_PATH_PATTERN.test(trimmed)) {
      issues.push(
        `apiBaseUrl "${trimmed}" must be a root-relative path such as "/api/v1" ` +
          '(protocol-relative "//host" URLs are not allowed).',
      );
    }
    if (trimmed.length > 1 && trimmed.endsWith('/')) {
      issues.push(`apiBaseUrl "${trimmed}" must not end with a trailing slash.`);
    }
    return;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      issues.push(`apiBaseUrl "${trimmed}" must use the http or https protocol.`);
    }
    if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
      issues.push(`apiBaseUrl "${trimmed}" must not end with a trailing slash.`);
    }
  } catch {
    issues.push(
      `apiBaseUrl "${trimmed}" must be either a root-relative path ("/api/v1") or an ` +
        'absolute http(s) URL ("http://localhost:3000/api/v1").',
    );
  }
}

/**
 * Validates the build-time environment object.
 *
 * @throws {WebEnvironmentValidationError} listing every invalid field.
 */
export function validateWebEnvironment(raw: unknown): WebEnvironment {
  const issues: string[] = [];

  if (typeof raw !== 'object' || raw === null) {
    throw new WebEnvironmentValidationError(['environment must be an object.']);
  }

  const candidate = raw as Record<string, unknown>;

  if (typeof candidate['production'] !== 'boolean') {
    issues.push(
      `production must be a boolean (received ${typeof candidate['production']}). ` +
        'Ensure angular.json fileReplacements maps the correct environment file.',
    );
  }

  validateApiBaseUrl(issues, candidate['apiBaseUrl']);

  if (issues.length > 0) {
    throw new WebEnvironmentValidationError(issues);
  }

  const apiBaseUrl = (candidate['apiBaseUrl'] as string).trim();

  return Object.freeze({
    production: candidate['production'] as boolean,
    apiBaseUrl,
  });
}
