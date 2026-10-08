import { validateWebEnvironment, type WebEnvironment } from './env.schema.js';

/**
 * Local development configuration. Points at the NestJS dev server rather than a
 * relative path, because `ng serve` has no reverse proxy in front of it.
 */
export const environment: WebEnvironment = validateWebEnvironment({
  production: false,
  apiBaseUrl: 'http://localhost:3000/api/v1',
});
