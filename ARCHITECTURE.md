# Architecture Specification

### 1. Topology & Directory Structure

```
personal-habit-task-manager/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── core/
│   │   │   │   │   ├── guards/
│   │   │   │   │   ├── interceptors/
│   │   │   │   │   └── services/
│   │   │   │   ├── features/
│   │   │   │   │   ├── habits/
│   │   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── pages/
│   │   │   │   │   │   ├── services/
│   │   │   │   │   │   └── state/
│   │   │   │   ├── tasks/
│   │   │   │   │   ├── components/
│   │   │   │   │   ├── pages/
│   │   │   │   │   ├── services/
│   │   │   │   │   └── state/
│   │   │   │   │   └── dashboard/
│   │   │   │   └── shared/
│   │   │   ├── environments/
│   │   │   ├── index.html
│   │   │   ├── main.ts
│   │   │   └── styles.css
│   │   ├── project.json
│   │   ├── tsconfig.app.json
│   │   └── tsconfig.json
│   └── api/
│       ├── src/
│       │   ├── common/
│       │   │   ├── decorators/
│       │   │   ├── filters/
│       │   │   ├── guards/
│       │   │   ├── interceptors/
│       │   │   └── pipes/
│       │   ├── config/
│       │   ├── database/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── habits/
│       │   │   ├── tasks/
│       │   │   └── users/
│       │   ├── app.module.ts
│       │   └── main.ts
│       ├── project.json
│       ├── tsconfig.app.json
│       └── tsconfig.json
├── packages/
│   ├── shared-dto/
│   │   ├── src/
│   │   │   ├── common/
│   │   │   ├── habits/
│   │   │   ├── tasks/
│   │   │   └── users/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── database/
│   │   ├── src/
│   │   │   ├── migrations/
│   │   │   ├── schema/
│   │   │   ├── client.ts
│   │   │   └── index.ts
│   │   ├── drizzle.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── ui/
│   │   ├── src/
│   │   │   ├── button/
│   │   │   ├── card/
│   │   │   ├── badge/
│   │   │   ├── input/
│   │   │   ├── modal/
│   │   │   └── metric-tile/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── tailwind-config/
│   │   ├── index.css
│   │   └── package.json
│   └── tsconfig/
│       ├── base.json
│       ├── angular.json
│       └── nest.json
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── turbo.json
```

### 2. Toolchain & Tooling Configuration

#### 2.1 Workspace Configuration
- Workspace Manager: pnpm strict (`latest`)
- Monorepo Orchestration: Turborepo (`latest`)
- Module Resolution: `NodeNext`
- TypeScript: `latest`
  - Rules: `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`, `strictFunctionTypes: true`, `strictBindCallApply: true`, `strictPropertyInitialization: true`, `noImplicitThis: true`, `alwaysStrict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`

#### 2.2 Frontend Stack (Web)
- Framework: Angular (`latest`)
- Core Utilities: `@angular/cdk` (`latest`) for accessible focus trapping and modal overlay behavior
- Architecture: Standalone Components, Signal-based reactivity, no NgModules
- Bundler: `@angular/build` (Vite-backed Application Builder)
- Styling Engine: Tailwind CSS (`latest` v4) via `@tailwindcss/vite` integration plugin and CSS-first entry (`@import "tailwindcss";`, `@theme`)

#### 2.3 Backend Stack (API)
- Framework: NestJS (`latest`)
- Runtime: Node.js (`latest` LTS)
- Validation: `class-validator` (`latest`), `class-transformer` (`latest`)
- Documentation: `@nestjs/swagger` (`latest`)

### 3. Global Data Layer

#### 3.1 Persistence & Neon PostgreSQL
- Database: Neon Serverless PostgreSQL
- ORM/Driver: Drizzle ORM (`latest`) via `@neondatabase/serverless` connection pooler
- Pooling Strategy: Transaction-mode pooling via Neon proxy connection string with max connections tuned for serverless runtime.

#### 3.2 Frontend State Management
- Paradigm: Angular Signals (`signal`, `computed`, `effect`) organized into dedicated Signal Store classes per domain module.
- Immutability: Deep freeze utility applied during state transitions.
- Storage Bridge: LocalStorage persistence adapter for offline cache and client preferences verified by an SHA-256 HMAC checksum computed with a per-session ephemeral secret. Payloads failing checksum verification are atomically evicted.

#### 3.3 Base API Specification
- Base Path: `/api/v1`
- Standard Response Envelope:
```typescript
export interface ApiResponseEnvelope<T> {
  success: boolean;
  statusCode: number;
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
    pagination?: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    };
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

### 4. Security & Runtime Constraints

#### 4.1 Authentication & Authorization
- Strategy: Dual-Token Architecture (Access JWT via Authorization Header + Refresh Token via secure, HttpOnly, SameSite=Strict cookie). Refresh endpoint: `POST /api/v1/auth/refresh`.
- NestJS Implementation: Custom `JwtAuthGuard` and `RolesGuard` utilizing `@nestjs/passport` and `passport-jwt`.
- Angular Implementation: `auth.interceptor.ts` injecting Bearer token, intercepting HTTP 401 statuses using a `BehaviorSubject` refresh-lock pattern. Concurrent 401 requests block until the single in-flight refresh request resolves, re-issuing queued requests with the updated token or routing to login upon refresh rejection.

#### 4.2 Error Handling & Boundaries
- Frontend: Angular `ErrorHandler` provider forwarding runtime errors to telemetry sink while rendering accessible fallback components.
- Backend: Global `AllExceptionsFilter` implementing standard `ApiResponseEnvelope` mapping with scrubbed internal stack traces.

#### 4.3 Rate Limiting & Network Policies
- Rate Limiting: `@nestjs/throttler` configured with 100 requests per minute per IP for standard endpoints, 5 requests per minute for authentication endpoints.
- CORS Policy: Strict origins whitelist binding to Vercel deployment URL and local development hosts.
- Content Security Policy: Strict CSP headers enforced via Helmet middleware (`default-src 'self'`).

### 5. Local Development Environment

#### 5.1 Database Container (Docker Compose)
- A `docker-compose.yml` in the project root provisions a `postgres:16-alpine` container on port `5432` with a `pg_isready` healthcheck.
- Default credentials match `.env.example`: `POSTGRES_USER=neondb_owner`, `POSTGRES_PASSWORD=password`, `POSTGRES_DB=neondb`. Local `DATABASE_URL`: `postgresql://neondb_owner:password@localhost:5432/neondb`.
- Workflow: `docker compose up -d` (or `pnpm db:up`) → `pnpm db:migrate` (applies Drizzle migrations and seeds the dev identity) → `pnpm dev`.

#### 5.2 Development Identity Seeding (SEC-01)
- On database migration/initialization, an idempotent seed (`ON CONFLICT (id) DO NOTHING`) inserts the default development user into `users` with fixed UUID `00000000-0000-0000-0000-000000000000` (email `dev@local.internal`, firstName `Local`, lastName `Developer`), so all `user_id` foreign keys resolve in non-auth development mode.

#### 5.3 Atomic Optimistic Concurrency (DATA-01)
- All optimistic-concurrency writes enforce freshness in SQL via the atomic predicate `WHERE id = :id AND user_id = :userId AND updated_at = :clientUpdatedAt`; a 0-row result raises `ConflictError` (HTTP 409). No read-then-write TOCTOU window exists.
