# Enterprise Task & Project Pipeline Specification

### 1. Domain Data Models

```typescript
export interface TaskModel {
  id: string;
  userId: string;
  projectId: string | null;
  title: string;
  description: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED';
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectModel {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  colorHex: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskWithProjectDetail extends TaskModel {
  project?: ProjectModel | null;
}
```

### 2. Angular Signal State Lifecycle

```typescript
import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiResponseEnvelope } from './api-response.interface';
import { TaskWithProjectDetail, TaskStatus, TaskPriority, ProjectModel } from './task.models';

export interface TaskFilterState {
  status: TaskStatus | 'ALL';
  priority: TaskPriority | 'ALL';
  projectId: string | 'ALL';
  searchQuery: string;
}

@Injectable({ providedIn: 'root' })
export class TaskSignalStore {
  private http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/tasks';
  private readonly projectsUrl = '/api/v1/projects';

  private tasksState = signal<TaskWithProjectDetail[]>([]);
  private projectsState = signal<ProjectModel[]>([]);
  private filterState = signal<TaskFilterState>({
    status: 'ALL',
    priority: 'ALL',
    projectId: 'ALL',
    searchQuery: '',
  });
  private loadingState = signal<boolean>(false);
  private errorState = signal<string | null>(null);

  // Computed views
  readonly allTasks = computed(() => this.tasksState());
  readonly projects = computed(() => this.projectsState());
  readonly isLoading = computed(() => this.loadingState());
  readonly errorMessage = computed(() => this.errorState());

  readonly filteredTasks = computed(() => {
    const list = this.tasksState();
    const filter = this.filterState();

    return list.filter((task) => {
      const matchesStatus = filter.status === 'ALL' || task.status === filter.status;
      const matchesPriority = filter.priority === 'ALL' || task.priority === filter.priority;
      const matchesProject = filter.projectId === 'ALL' || task.projectId === filter.projectId;
      const matchesSearch =
        filter.searchQuery.trim() === '' ||
        task.title.toLowerCase().includes(filter.searchQuery.toLowerCase());

      return matchesStatus && matchesPriority && matchesProject && matchesSearch;
    });
  });

  readonly tasksByStatus = computed(() => {
    const filtered = this.filteredTasks();
    return {
      backlog: filtered.filter((t) => t.status === 'BACKLOG'),
      todo: filtered.filter((t) => t.status === 'TODO'),
      inProgress: filtered.filter((t) => t.status === 'IN_PROGRESS'),
      inReview: filtered.filter((t) => t.status === 'IN_REVIEW'),
      completed: filtered.filter((t) => t.status === 'COMPLETED'),
    };
  });

  setFilter(updates: Partial<TaskFilterState>): void {
    this.filterState.update((current) => ({ ...current, ...updates }));
  }

  async fetchProjects(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponseEnvelope<ProjectModel[]>>(this.projectsUrl)
      );
      this.projectsState.set(response.data);
    } catch (err: unknown) {
      this.errorState.set('Failed to fetch projects.');
    }
  }

  async fetchTasks(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponseEnvelope<TaskWithProjectDetail[]>>(this.baseUrl)
      );
      this.tasksState.set(response.data);
    } catch (err: unknown) {
      this.errorState.set('Failed to fetch tasks.');
    } finally {
      this.loadingState.set(false);
    }
  }

  async updateTaskStatus(taskId: string, newStatus: TaskStatus): Promise<void> {
    const targetTask = this.tasksState().find((t) => t.id === taskId);
    if (!targetTask) return;

    const previous = [...this.tasksState()];

    // Optimistic Mutation
    this.tasksState.update((tasks) =>
      tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: newStatus,
            }
          : t
      )
    );

    try {
      const response = await firstValueFrom(
        this.http.patch<ApiResponseEnvelope<TaskWithProjectDetail>>(
          `${this.baseUrl}/${taskId}/status`,
          {
            status: newStatus,
            clientUpdatedAt: targetTask.updatedAt,
          }
        )
      );
      // Reconcile with authoritative server timestamp and completion record
      this.tasksState.update((tasks) =>
        tasks.map((t) => (t.id === taskId ? response.data : t))
      );
    } catch (err: unknown) {
      this.tasksState.set(previous);
      if (err instanceof HttpErrorResponse && err.status === 409) {
        await this.fetchTasks();
        this.errorState.set('Task state conflict detected. Reloaded authoritative data.');
      } else {
        this.errorState.set('Status update failed. Reverting changes.');
      }
    }
  }
}
```

### 3. API Endpoints & Queries

- `GET /api/v1/projects`
  - Returns: `ApiResponseEnvelope<ProjectModel[]>`
- `POST /api/v1/projects`
  - Body: `CreateProjectDto`
  - Returns: `ApiResponseEnvelope<ProjectModel>`
- `DELETE /api/v1/projects/:id`
  - Returns: `ApiResponseEnvelope<{ id: string; deleted: boolean }>`
- `GET /api/v1/tasks`
  - Query parameters: `projectId?`, `status?`, `priority?`, `page?`, `limit?`
  - Returns: `ApiResponseEnvelope<PaginatedResult<TaskWithProjectDetail>>`
- `POST /api/v1/tasks`
  - Body: `CreateTaskDto`
  - Returns: `ApiResponseEnvelope<TaskWithProjectDetail>`
- `GET /api/v1/tasks/:id`
  - Returns: `ApiResponseEnvelope<TaskWithProjectDetail>`
- `PATCH /api/v1/tasks/:id`
  - Body: `UpdateTaskDto`
  - Returns: `ApiResponseEnvelope<TaskWithProjectDetail>`
- `PATCH /api/v1/tasks/:id/status`
  - Body: `UpdateTaskStatusDto`
  - Returns: `ApiResponseEnvelope<TaskWithProjectDetail>`
- `DELETE /api/v1/tasks/:id`
  - Returns: `ApiResponseEnvelope<{ id: string; deleted: boolean }>`

### 4. Validation Schemas & Shared DTOs

```typescript
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID, IsDateString, Matches } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const)
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';

  @IsEnum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'] as const)
  status: 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' = 'TODO';

  @IsUUID()
  @IsOptional()
  projectId?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;
}

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const)
  @IsOptional()
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @IsEnum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'] as const)
  @IsOptional()
  status?: 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED';

  @IsUUID()
  @IsOptional()
  projectId?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsDateString()
  @IsOptional()
  clientUpdatedAt?: string;
}

export class UpdateTaskStatusDto {
  @IsEnum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'] as const)
  status!: 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED';

  @IsDateString()
  @IsOptional()
  clientUpdatedAt?: string;
}

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @Matches(/^#(?:[0-9a-fA-F]{3}){1,2}$/, { message: 'Invalid hex color code' })
  colorHex: string = '#0077b6';
}
```

### 5. Edge Cases & Error Boundaries

- **Cascade Invalidation**: If an associated Project is soft-deleted or removed, foreign key integrity sets `tasks.project_id` to `NULL` via `ON DELETE SET NULL`, retaining existing task items without data loss.
- **Stale State Recovery**: Both general task modifications (`PATCH /api/v1/tasks/:id` using `UpdateTaskDto`) and status transitions (`PATCH /api/v1/tasks/:id/status` using `UpdateTaskStatusDto`) enforce optimistic concurrency atomically: when `clientUpdatedAt` is provided, it is applied directly in the `UPDATE ... WHERE id = :id AND user_id = :userId AND updated_at = :clientUpdatedAt` predicate. If the update affects 0 rows, the backend aborts with HTTP 409 Conflict, directing the Angular Signal Store to revert local optimistic state and re-fetch latest server records.
- **SQL-Side Filtering & Pagination (DATA-02)**: Task filtering (`projectId`, `status`, `priority`) and pagination MUST be evaluated in SQL by the database engine via dynamic Drizzle `where` conditions (`and(...)`), never by filtering rows in application heap memory after an unbounded `SELECT`. PostgreSQL performs the projection and row selection.
- **Overdue Date Handling**: Server filters evaluate overdue tasks where `due_date < NOW()` AND `status != 'COMPLETED'` to generate explicit priority warnings without relying on client local clocks.

### 6. Mobile-First Responsive Layout & Interactions

- **360px Viewport**: Single column vertical flow. Tasks render as self-contained tiles with status toggling triggered via a bottom action drawer (native touch sheet). Tap target for completion checkbox is locked to `48x48px`. No multi-column boards allowed.
- **390px Viewport**: Adds priority badge inline alongside task due date with a minimum touch surface of 44x44px per clickable interactive item.
- **430px Viewport**: Project label and priority badge sit side-by-side without line wrapping.
- **768px Viewport**: Dual mode toggle made available: "List View" or "Compact Board" (2 columns: To Do / Done).
- **1024px+ Viewport**: High-density 5-column corporate Kanban board layout (Backlog, Todo, In Progress, In Review, Completed). Drag-and-drop handles maintain keyboard accessible buttons alongside pointer listeners.

### 7. Mobile Touch Target Requirements (UX-01)

- The `TaskCardComponent` status `<select>` element MUST maintain a minimum interactive height of 44px (`h-11 min-h-[44px] min-w-[44px]`), replacing the legacy 36px (`h-9`) sizing, to guarantee a compliant touch target on mobile viewports from 360px up.
