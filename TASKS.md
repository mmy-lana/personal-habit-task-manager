# Implementation Master Checklist

- [x] Task 1: Environment baseline, types, and DB client initializers
  - [x] Initialize monorepo workspace configuration using pnpm and Turborepo.
  - [x] Define shared TypeScript configuration presets in `packages/tsconfig`.
  - [x] Setup Drizzle ORM configuration and Neon PostgreSQL connection client in `packages/database`.
  - [x] Document application-layer transaction standard (zero DB triggers; `habit_streaks` zero-rows inserted in repository transaction).
  - [x] Configure environment variable validation schemas for both web and api projects.
  - [x] Implement database migration runner targeting Neon PostgreSQL.

- [x] Task 2: Core design system primitives and atomic UI components
  - [x] Establish modern corporate deep blue Tailwind v4 design tokens in `packages/tailwind-config`.
  - [x] Create `Button` primitive supporting variant hierarchy and touch-first hit targets (min 44x44px).
  - [x] Create `Card` primitive supporting corporate surface depths and active states.
  - [x] Create `Badge` primitive supporting priority, status, and streak tier visualization.
  - [x] Create `Input` and `Select` primitives with explicit focus rings and mobile-accessible targets.
  - [x] Create `Modal` accessible dialog container adhering to keyboard escape, backdrop click, and `@angular/cdk/a11y` focus trap.
  - [x] Create `MetricTile` primitive for dashboard performance telemetry.

- [x] Task 3: Feature Module 1 (Habit Management & Streak Tracking) end-to-end implementation
  - [x] Define Drizzle schemas for habits, habit completion logs, and streak metadata.
  - [x] Build shared DTOs: `CreateHabitDto`, `UpdateHabitDto`, `LogHabitDto`.
  - [x] Implement NestJS `HabitsModule` with repository, service, controller, and `ParseDatePipe`.
  - [x] Implement habit streak calculation algorithm with row-level locks on recalculation.
  - [x] Build Angular `HabitSignalStore` providing optimistic UI check-in handling.
  - [x] Assemble habit checklist and interactive habit card components responsive from 360px up.
  - [x] Write integration test assertions for duplicate check-in prevention and streak preservation.

- [x] Task 4: Feature Module 2 (Task & Project Pipeline) end-to-end implementation
  - [x] Define Drizzle schemas for projects, tasks, and task labels.
  - [x] Build shared DTOs: `CreateTaskDto`, `UpdateTaskDto`, `UpdateTaskStatusDto`, `CreateProjectDto`.
  - [x] Implement NestJS `TasksModule` and `ProjectsModule` with repositories, services, controllers, and priority queues.
  - [x] Build Angular `TaskSignalStore` with optimistic mutation handling and filtering logic.
  - [x] Call `fetchProjects()` alongside `fetchTasks()` during route initialization in the tasks page component.
  - [x] Assemble task list, task filtering toolbar, and task creation modal components.
  - [x] Implement touch-friendly mobile action sheets for task status transitions.
  - [x] Verify database constraint checks for cascading deletions and orphaned tasks.

- [x] Task 5: Feature Module 3 (Corporate Dashboard & Aggregated Analytics) end-to-end implementation
  - [x] Implement NestJS analytics aggregation service compiling daily completion metrics.
  - [x] Build Angular `DashboardSignalStore` consuming unified habits and tasks data feeds.
  - [x] Assemble responsive overview page displaying streak counters, pending task matrices, and habit completion rings.
  - [x] Integrate mobile navigation bottom drawer switching seamlessly to top navigation at 768px and desktop rail at 1024px.

- [x] Task 6: Routing shell, responsive page assembly, and production build verification
  - [x] Configure Angular router with standalone lazy routes and auth guards.
  - [x] Enforce responsive layouts across 360px, 390px, 430px, 768px, and 1024px+ viewports without hover-dependent triggers.
  - [x] Configure NestJS global exception filters, standard response envelopes, and Throttler guards.
  - [x] Configure Vercel frontend build outputs and Render backend containerization configurations.
  - [x] Execute full production pipeline build and schema verification check.

- [x] Task 7: Audit Defect Verification & Remediation
  - [x] [SEC-01] Seed default development user (`00000000-0000-0000-0000-000000000000`) on migration/bootstrap; guard against production execution.
  - [x] [DATA-01] Replace TOCTOU read-then-write checks with atomic `WHERE updated_at = :clientUpdatedAt` predicates in tasks repository.
  - [x] [DATA-02] Move task filtering (`projectId`, `status`, `priority`) into SQL via dynamic Drizzle `where` conditions.
  - [x] [DATA-03] Guard `removeLog`: verify deleted-row count before acquiring streak locks / recalculating streaks.
  - [x] [DATA-07] Enforce minimum height baseline on dashboard 7-day activity telemetry bars.
  - [x] [DATA-08] Reconcile PostgreSQL microsecond timestamp precision with JavaScript ISO strings via date_trunc in atomic CAS queries.
  - [x] [UX-01] Enforce 44px touch targets on `TaskCardComponent` status selector.
  - [x] [UX-04] Bind `[selected]="s === task.status"` on task card status selector options.
  - [x] [UX-05] Restructure task card layout to eliminate title truncation across desktop Kanban columns.
  - [x] [UX-06] Decouple error notification banners from board unmounting and add auto-dismiss timer.
  - [x] [UX-07] Add transient in-flight locking on task card status selector to prevent duplicate concurrent submissions.
  - [x] [HYG-01] Replace decorative fire emoji with monochrome inline SVG icon.
  - [x] [FE-02] Configure rootDir layout in `apps/web/tsconfig.json` and resolve TypeScript 6 deprecations.
  - [x] [SEC-03] Add safe-area inset fallback padding (`pb-4`) to mobile navigation shell.
  - [x] Provision local database via `docker-compose.yml` with healthcheck and seed integration.
  - [x] Verify: `pnpm turbo run typecheck` (zero errors), `pnpm --filter api test` (passing), headless browser e2e smoke test including 360px mobile viewport (passing), `pnpm turbo run build` (clean).
