import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { ApiResponseEnvelope } from '@repo/shared-dto';
import { environment } from '../../../../environments/environment.js';
import { HabitSignalStore } from '../../habits/state/habit-signal.store.js';
import { TaskSignalStore } from '../../tasks/state/task-signal.store.js';

export interface DailyMetrics {
  date: string;
  habitsCompleted: number;
  tasksCompleted: number;
}

export interface AnalyticsSummary {
  totalHabitsCompleted7d: number;
  totalTasksCompleted7d: number;
  dailyMetrics: DailyMetrics[];
}

@Injectable({ providedIn: 'root' })
export class DashboardSignalStore {
  private http = inject(HttpClient);
  private habitStore = inject(HabitSignalStore);
  private taskStore = inject(TaskSignalStore);
  private readonly analyticsUrl = `${environment.apiBaseUrl}/analytics/summary`;

  private analyticsState = signal<AnalyticsSummary>({
    totalHabitsCompleted7d: 0,
    totalTasksCompleted7d: 0,
    dailyMetrics: [],
  });
  private loadingState = signal(false);

  readonly summary = computed(() => this.analyticsState());
  readonly isLoading = computed(() => this.loadingState());
  readonly activeHabits = computed(() => this.habitStore.activeHabits());
  readonly completionRatio = computed(() => this.habitStore.completionRatio());
  readonly pendingTasks = computed(() =>
    this.taskStore.allTasks().filter((t) => t.status !== 'COMPLETED'),
  );
  readonly completedTasks = computed(() =>
    this.taskStore.allTasks().filter((t) => t.status === 'COMPLETED'),
  );

  async fetchAll(): Promise<void> {
    this.loadingState.set(true);
    await Promise.all([
      this.habitStore.fetchHabits(),
      this.taskStore.fetchProjects(),
      this.taskStore.fetchTasks(),
      this.fetchAnalytics(),
    ]);
    this.loadingState.set(false);
  }

  private async fetchAnalytics(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponseEnvelope<AnalyticsSummary>>(this.analyticsUrl),
      );
      this.analyticsState.set(response.data);
    } catch {
      // Analytics are non-critical; degrade gracefully
    }
  }
}