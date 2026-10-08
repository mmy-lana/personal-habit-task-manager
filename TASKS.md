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
  - [ ] Write integration test assertions for duplicate check-in prevention and streak preservation.

- [ ] Task 4: Feature Module 2 (Task & Project Pipeline) end-to-end implementation
  - [ ] Define Drizzle schemas for projects, tasks, and task labels.
  - [ ] Build shared DTOs: `CreateTaskDto`, `UpdateTaskDto`, `UpdateTaskStatusDto`, `CreateProjectDto`.
  - [ ] Implement NestJS `TasksModule` and `ProjectsModule` with repositories, services, controllers, and priority queues.
  - [ ] Build Angular `TaskSignalStore` with optimistic mutation handling and filtering logic.
  - [ ] Call `fetchProjects()` alongside `fetchTasks()` during route initialization in the tasks page component.
  - [ ] Assemble task list, task filtering toolbar, and task creation modal components.
  - [ ] Implement touch-friendly mobile action sheets for task status transitions.
  - [ ] Verify database constraint checks for cascading deletions and orphaned tasks.

- [ ] Task 5: Feature Module 3 (Corporate Dashboard & Aggregated Analytics) end-to-end implementation
  - [ ] Implement NestJS analytics aggregation service compiling daily completion metrics.
  - [ ] Build Angular `DashboardSignalStore` consuming unified habits and tasks data feeds.
  - [ ] Assemble responsive overview page displaying streak counters, pending task matrices, and habit completion rings.
  - [ ] Integrate mobile navigation bottom drawer switching seamlessly to top navigation at 768px and desktop rail at 1024px.

- [ ] Task 6: Routing shell, responsive page assembly, and production build verification
  - [ ] Configure Angular router with standalone lazy routes and auth guards.
  - [ ] Enforce responsive layouts across 360px, 390px, 430px, 768px, and 1024px+ viewports without hover-dependent triggers.
  - [ ] Configure NestJS global exception filters, standard response envelopes, and Throttler guards.
  - [ ] Configure Vercel frontend build outputs and Render backend containerization configurations.
  - [ ] Execute full production pipeline build and schema verification check.
