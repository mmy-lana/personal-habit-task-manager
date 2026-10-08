import { validateWebEnvironment, type WebEnvironment } from './env.schema.js';

/**
 * Production configuration. The Angular builder swaps this module for
 * `environment.development.ts` through `fileReplacements` in non-production builds.
 *
 * Validating at module load means every consumer — not just `main.ts` — is guaranteed
 * a well-formed configuration object.
 */
export const environment: WebEnvironment = validateWebEnvironment({
  production: true,
  apiBaseUrl: '/api/v1',
});
