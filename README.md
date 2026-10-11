# Personal Habit & Task Manager

A full-stack, enterprise-modular personal habit tracking and task pipeline application built in a Turborepo monorepo with Angular, NestJS, Drizzle ORM, and PostgreSQL.

---

## Tech Stack

- Frontend (`apps/web`): Angular (Standalone Components, Signals State Stores), Tailwind CSS v4, PostCSS, `@angular/cdk/a11y`.
- Backend (`apps/api`): NestJS, `@nestjs/throttler`, `@nestjs/config`, `class-validator`, `class-transformer`, Helmet.
- Data Layer (`packages/database`): PostgreSQL (Local Docker / Neon Serverless), Drizzle ORM, Drizzle Kit.
- Shared Contracts (`packages/shared-dto`): TypeScript interfaces, DTOs with validation rules.
- UI Design System (`packages/ui`): Reusable atomic components (Button, Card, Badge, Input, Modal, Metric Tile, Select).
- Styling Tokens (`packages/tailwind-config`): Modern corporate deep blue theme with Tailwind v4 `@theme` directives.
- Toolchain: Turborepo, pnpm (strict workspace isolation), TypeScript strict mode.

---

## Architecture Highlights

- Spec-Driven Architecture: Formal domain specifications defined under `specs/` and `ARCHITECTURE.md`.
- Zero Database Triggers: Application-layer transactional guarantees for habit streaks and check-in logging.
- Atomic Optimistic Concurrency: Task updates enforce compare-and-swap checks in SQL with millisecond date truncation (`date_trunc('milliseconds', ...)`), preventing lost updates without lock contention.
- SQL-Side Filtering: Dynamic Drizzle query builder predicates for task filtering (`projectId`, `status`, `priority`) to protect server heap memory.
- Mobile-First Ergonomics: Verified responsive behavior across 360px, 390px, 430px, 768px, and 1024px+ viewports with minimum 44x44px touch targets.

---

## Monorepo Layout

```
personal-habit-task-manager/
├── apps/
│   ├── api/                 # NestJS REST API server (port 3000)
│   └── web/                 # Angular standalone SPA (port 4200)
├── packages/
│   ├── database/            # Drizzle schema, connection clients, migrations, seed runners
│   ├── shared-dto/          # Shared DTO classes and TypeScript API contracts
│   ├── tailwind-config/     # Tailwind CSS v4 corporate theme tokens
│   ├── tsconfig/            # Shared base, Angular, and NestJS TypeScript presets
│   └── ui/                  # Reusable design system primitives
├── specs/                   # Module specifications (core, ui, habits, tasks)
├── test/
│   └── e2e/                 # Puppeteer headless Chrome smoke tests
├── docker-compose.yml       # Local PostgreSQL 16 container definition
└── turbo.json               # Monorepo build and task execution pipeline
```

---

## Prerequisites

- Node.js >= 22.12.0 LTS
- pnpm >= 9.x / 10.x / 11.x
- Docker and Docker Compose (for local database container)
- Google Chrome or Chromium (for headless E2E smoke tests)

---

## Getting Started

### 1. Clone & Install Dependencies

```bash
git clone <repository-url>
cd personal-habit-task-manager
pnpm install
```

### 2. Configure Environment Variables

Copy the example environment configuration to `.env`:

```bash
cp .env.example .env
```

Default local database connection values in `.env`:
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://neondb_owner:password@localhost:5432/neondb
DATABASE_POOL_MAX_CONNECTIONS=10
CORS_ORIGIN=http://localhost:4200
API_BASE_URL=http://localhost:3000
WEB_BASE_URL=http://localhost:4200
```

### 3. Start Local PostgreSQL Database

Launch the PostgreSQL container defined in `docker-compose.yml`:

```bash
pnpm db:up
```

*Note: Verify container health status using `docker compose ps`.*

### 4. Run Migrations & Seed Development Identity

Apply Drizzle database migrations and insert the default development user (`00000000-0000-0000-0000-000000000000`):

```bash
pnpm db:migrate
```

To run only the development identity seed independently:
```bash
pnpm db:seed
```

### 5. Build Workspace Packages

Compile shared packages (`@repo/shared-dto`, `@repo/database`):

```bash
pnpm build
```

### 6. Start Development Servers

Start both the NestJS API and Angular Web application in watch mode:

```bash
pnpm dev
```

Application endpoints:
- Web Application: `http://localhost:4200`
- API Health Check: `http://localhost:3000/api/v1/health`
- API Base Path: `http://localhost:3000/api/v1`

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Starts API (`:3000`) and Web (`:4200`) in parallel development watch mode. |
| `pnpm build` | Compiles all packages and applications via Turborepo. |
| `pnpm typecheck` | Executes TypeScript type checking across all monorepo workspaces. |
| `pnpm test` | Runs backend unit and regression test suites. |
| `pnpm test:e2e` | Runs headless Chrome Puppeteer E2E tests against built artifacts. |
| `pnpm db:up` | Starts local PostgreSQL 16 container via Docker Compose. |
| `pnpm db:migrate` | Runs Drizzle migrations and seeds the development identity. |
| `pnpm db:seed` | Seeds the development user identity without re-running migrations. |
| `pnpm db:generate` | Generates new SQL migration files from Drizzle schema definitions. |

---

## Testing & Quality Assurance

### Backend Unit & Integration Tests

Executes unit assertions for habit check-in duplicate prevention (`23505`), streak preservation, and task CAS concurrency:

```bash
pnpm --filter api test
```

### Headless Browser E2E Tests

Executes end-to-end tests validating:
1. Dashboard metric tile rendering.
2. Shell navigation across Dashboard, Habits, and Tasks.
3. Habit check-in toggle and streak increments.
4. SQL-side task priority filtering.
5. Mobile viewport (360px) responsive layout with zero horizontal overflow.

```bash
pnpm test:e2e
```

---

## API Endpoints Reference

All routes are mounted under `/api/v1`:

### Habits
- `GET /api/v1/habits` - List all active habits (supports `?includeArchived=true`).
- `POST /api/v1/habits` - Create a new habit.
- `GET /api/v1/habits/:id` - Retrieve a habit by ID with streak telemetry.
- `PATCH /api/v1/habits/:id` - Update habit properties.
- `DELETE /api/v1/habits/:id` - Soft or hard delete a habit.
- `POST /api/v1/habits/:id/log` - Log a completion check-in for a date (`YYYY-MM-DD`).
- `DELETE /api/v1/habits/:id/log/:date` - Revert a completion check-in for a date (`YYYY-MM-DD`).

### Tasks & Projects
- `GET /api/v1/projects` - List all projects.
- `POST /api/v1/projects` - Create a new project.
- `DELETE /api/v1/projects/:id` - Delete a project (sets `tasks.project_id` to `NULL`).
- `GET /api/v1/tasks` - List tasks with query filters (`projectId`, `status`, `priority`).
- `POST /api/v1/tasks` - Create a new task.
- `GET /api/v1/tasks/:id` - Retrieve task details.
- `PATCH /api/v1/tasks/:id` - Update task with optimistic concurrency check (`clientUpdatedAt`).
- `PATCH /api/v1/tasks/:id/status` - Transition task status with optimistic concurrency check.
- `DELETE /api/v1/tasks/:id` - Delete a task.

### Analytics & Health
- `GET /api/v1/analytics/summary` - Aggregated 7-day completion velocity metrics.
- `GET /api/v1/health` - API uptime and health indicator.
