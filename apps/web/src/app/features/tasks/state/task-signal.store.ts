import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { ApiResponseEnvelope, TaskWithProjectDetail, ProjectModel, TaskStatus, TaskPriority } from '@repo/shared-dto';
import { environment } from '../../../../environments/environment.js';

export interface TaskFilterState {
  status: TaskStatus | 'ALL';
  priority: TaskPriority | 'ALL';
  projectId: string | 'ALL';
  searchQuery: string;
}

@Injectable({ providedIn: 'root' })
export class TaskSignalStore {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/tasks`;
  private readonly projectsUrl = `${environment.apiBaseUrl}/projects`;

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

  readonly allTasks = computed(() => this.tasksState());
  readonly projects = computed(() => this.projectsState());
  readonly isLoading = computed(() => this.loadingState());
  readonly errorMessage = computed(() => this.errorState());
  readonly currentFilter = computed(() => this.filterState());

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
        this.http.get<ApiResponseEnvelope<ProjectModel[]>>(this.projectsUrl),
      );
      this.projectsState.set(response.data);
    } catch {
      this.errorState.set('Failed to fetch projects.');
    }
  }

  async fetchTasks(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponseEnvelope<TaskWithProjectDetail[]>>(this.baseUrl),
      );
      this.tasksState.set(response.data);
    } catch {
      this.errorState.set('Failed to fetch tasks.');
    } finally {
      this.loadingState.set(false);
    }
  }

  async updateTaskStatus(taskId: string, newStatus: TaskStatus): Promise<void> {
    const targetTask = this.tasksState().find((t) => t.id === taskId);
    if (!targetTask) return;

    const previous = [...this.tasksState()];

    // Optimistic mutation
    this.tasksState.update((tasks) =>
      tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
    );

    try {
      const response = await firstValueFrom(
        this.http.patch<ApiResponseEnvelope<TaskWithProjectDetail>>(
          `${this.baseUrl}/${taskId}/status`,
          {
            status: newStatus,
            clientUpdatedAt: targetTask.updatedAt,
          },
        ),
      );
      this.tasksState.update((tasks) =>
        tasks.map((t) => (t.id === taskId ? response.data : t)),
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