import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { ApiResponseEnvelope, HabitWithStreakDetail, HabitStreakModel } from '@repo/shared-dto';
import { environment } from '../../../../environments/environment.js';

export interface HabitState {
  habits: HabitWithStreakDetail[];
  selectedDate: string;
  filter: 'ALL' | 'ACTIVE' | 'ARCHIVED';
  isLoading: boolean;
  error: string | null;
}

function getTodayDateString(): string {
  const parts = new Date().toISOString().split('T');
  return parts[0] ?? '';
}

@Injectable({ providedIn: 'root' })
export class HabitSignalStore {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/habits`;

  private state = signal<HabitState>({
    habits: [],
    selectedDate: getTodayDateString(),
    filter: 'ACTIVE',
    isLoading: false,
    error: null,
  });

  readonly habits = computed(() => this.state().habits);
  readonly isLoading = computed(() => this.state().isLoading);
  readonly error = computed(() => this.state().error);
  readonly selectedDate = computed(() => this.state().selectedDate);
  readonly filter = computed(() => this.state().filter);

  readonly activeHabits = computed(() =>
    this.state().habits.filter((h) => !h.isArchived),
  );

  readonly filteredHabits = computed(() => {
    const f = this.state().filter;
    const list = this.state().habits;
    if (f === 'ACTIVE') return list.filter((h) => !h.isArchived);
    if (f === 'ARCHIVED') return list.filter((h) => h.isArchived);
    return list;
  });

  readonly completionRatio = computed(() => {
    const list = this.activeHabits();
    if (list.length === 0) return 0;
    const completed = list.filter((h) => h.completedToday).length;
    return Math.round((completed / list.length) * 100);
  });

  setFilter(filter: 'ALL' | 'ACTIVE' | 'ARCHIVED'): void {
    this.state.update((s) => ({ ...s, filter }));
  }

  setSelectedDate(date: string): void {
    this.state.update((s) => ({ ...s, selectedDate: date }));
  }

  async fetchHabits(): Promise<void> {
    this.state.update((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponseEnvelope<HabitWithStreakDetail[]>>(this.baseUrl),
      );
      this.state.update((s) => ({
        ...s,
        habits: response.data,
        isLoading: false,
      }));
    } catch {
      this.state.update((s) => ({
        ...s,
        isLoading: false,
        error: 'Failed to retrieve habits.',
      }));
    }
  }

  async toggleCompletion(habitId: string, targetDate: string): Promise<void> {
    const current = this.state().habits.find((h) => h.id === habitId);
    if (!current) return;

    const previousState = [...this.state().habits];
    const isNowCompleted = !current.completedToday;

    // Optimistic update
    this.state.update((s) => ({
      ...s,
      habits: s.habits.map((h) => {
        if (h.id !== habitId) return h;
        return {
          ...h,
          completedToday: isNowCompleted,
          streak: {
            ...h.streak,
            currentStreak: isNowCompleted
              ? h.streak.currentStreak + 1
              : Math.max(0, h.streak.currentStreak - 1),
          },
        };
      }),
    }));

    try {
      if (isNowCompleted) {
        const res = await firstValueFrom(
          this.http.post<ApiResponseEnvelope<HabitStreakModel>>(
            `${this.baseUrl}/${habitId}/log`,
            { date: targetDate, count: 1 },
          ),
        );
        this.state.update((s) => ({
          ...s,
          habits: s.habits.map((h) =>
            h.id === habitId ? { ...h, streak: res.data } : h,
          ),
        }));
      } else {
        const res = await firstValueFrom(
          this.http.delete<ApiResponseEnvelope<HabitStreakModel>>(
            `${this.baseUrl}/${habitId}/log/${targetDate}`,
          ),
        );
        this.state.update((s) => ({
          ...s,
          habits: s.habits.map((h) =>
            h.id === habitId ? { ...h, streak: res.data } : h,
          ),
        }));
      }
    } catch {
      // Rollback on failure
      this.state.update((s) => ({
        ...s,
        habits: previousState,
        error: 'Habit synchronization failure. Reverted.',
      }));
    }
  }
}