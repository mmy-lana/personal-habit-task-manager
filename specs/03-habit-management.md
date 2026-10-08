# Habit Management & Streak Tracking Specification

### 1. Domain Data Models

```typescript
export interface HabitModel {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  frequency: 'DAILY' | 'WEEKLY' | 'CUSTOM';
  targetCountPerPeriod: number;
  targetPeriodDays: number;
  colorHex: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HabitLogModel {
  id: string;
  habitId: string;
  userId: string;
  loggedDate: string; // YYYY-MM-DD format
  count: number;
  notes: string | null;
  createdAt: string;
}

export interface HabitStreakModel {
  habitId: string;
  currentStreak: number;
  longestStreak: number;
  lastLoggedDate: string | null;
  updatedAt: string;
}

export interface HabitWithStreakDetail extends HabitModel {
  streak: HabitStreakModel;
  completedToday: boolean;
  totalLogsThisPeriod: number;
}

// Transactional Contract: HabitsRepository.create() must atomically insert a zero-value
// habit_streaks record (current_streak: 0, longest_streak: 0, last_logged_date: null)
// within the same database transaction.
```

### 2. Angular Signal State Lifecycle

```typescript
import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiResponseEnvelope } from './api-response.interface';
import { HabitWithStreakDetail, HabitStreakModel } from './habit.models';

export interface HabitState {
  habits: HabitWithStreakDetail[];
  selectedDate: string; // Format: YYYY-MM-DD
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
  private readonly baseUrl = '/api/v1/habits';

  // Internal reactive state
  private state = signal<HabitState>({
    habits: [],
    selectedDate: getTodayDateString(),
    filter: 'ACTIVE',
    isLoading: false,
    error: null,
  });

  // Selectors
  readonly habits = computed(() => this.state().habits);
  readonly isLoading = computed(() => this.state().isLoading);
  readonly error = computed(() => this.state().error);
  readonly activeHabits = computed(() =>
    this.state().habits.filter((h) => !h.isArchived)
  );
  readonly completionRatio = computed(() => {
    const list = this.activeHabits();
    if (list.length === 0) return 0;
    const completed = list.filter((h) => h.completedToday).length;
    return Math.round((completed / list.length) * 100);
  });

  async fetchHabits(): Promise<void> {
    this.state.update((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponseEnvelope<HabitWithStreakDetail[]>>(this.baseUrl)
      );
      this.state.update((s) => ({
        ...s,
        habits: response.data,
        isLoading: false,
      }));
    } catch (err: unknown) {
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

    // Optimistic Update: toggle completion status immediately; defer unlog streak recalculation to server
    this.state.update((s) => ({
      ...s,
      habits: s.habits.map((h) => {
        if (h.id !== habitId) return h;
        return {
          ...h,
          completedToday: isNowCompleted,
          streak: {
            ...h.streak,
            currentStreak: isNowCompleted ? h.streak.currentStreak + 1 : h.streak.currentStreak,
          },
        };
      }),
    }));

    try {
      if (isNowCompleted) {
        const res = await firstValueFrom(
          this.http.post<ApiResponseEnvelope<HabitStreakModel>>(`${this.baseUrl}/${habitId}/log`, {
            date: targetDate,
            count: 1,
          })
        );
        this.state.update((s) => ({
          ...s,
          habits: s.habits.map((h) => (h.id === habitId ? { ...h, streak: res.data } : h)),
        }));
      } else {
        const res = await firstValueFrom(
          this.http.delete<ApiResponseEnvelope<HabitStreakModel>>(`${this.baseUrl}/${habitId}/log/${targetDate}`)
        );
        this.state.update((s) => ({
          ...s,
          habits: s.habits.map((h) => (h.id === habitId ? { ...h, streak: res.data } : h)),
        }));
      }
    } catch (err: unknown) {
      // Rollback on rejection
      this.state.update((s) => ({
        ...s,
        habits: previousState,
        error: 'Habit synchronization failure. Reverted.',
      }));
    }
  }
}
```

### 3. API Endpoints & Request Specifications

- `GET /api/v1/habits`
  - Query params: `includeArchived=boolean`
  - Returns: `ApiResponseEnvelope<HabitWithStreakDetail[]>`
- `POST /api/v1/habits`
  - Body: `CreateHabitDto`
  - Returns: `ApiResponseEnvelope<HabitModel>`
- `GET /api/v1/habits/:id`
  - Returns: `ApiResponseEnvelope<HabitWithStreakDetail>`
- `PATCH /api/v1/habits/:id`
  - Body: `UpdateHabitDto`
  - Returns: `ApiResponseEnvelope<HabitModel>`
- `DELETE /api/v1/habits/:id`
  - Returns: `ApiResponseEnvelope<{ id: string; deleted: boolean }>`
- `POST /api/v1/habits/:id/log`
  - Body: `LogHabitDto`
  - Returns: `ApiResponseEnvelope<HabitStreakModel>`
- `DELETE /api/v1/habits/:id/log/:date`
  - Path Parameter: `date` validated by `ParseDatePipe` enforcing format `YYYY-MM-DD` and strict calendar bounds.
  - Returns: `ApiResponseEnvelope<HabitStreakModel>`

### 4. Validation Schemas & Shared DTOs

```typescript
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, Min, Max, Matches } from 'class-validator';

export class CreateHabitDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['DAILY', 'WEEKLY', 'CUSTOM'] as const)
  frequency!: 'DAILY' | 'WEEKLY' | 'CUSTOM';

  @IsInt()
  @Min(1)
  @Max(100)
  targetCountPerPeriod: number = 1;

  @IsInt()
  @Min(1)
  @Max(365)
  targetPeriodDays: number = 1;

  @IsString()
  @Matches(/^#(?:[0-9a-fA-F]{3}){1,2}$/, { message: 'Invalid hex color code' })
  colorHex: string = '#0077b6';
}

export class UpdateHabitDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['DAILY', 'WEEKLY', 'CUSTOM'] as const)
  @IsOptional()
  frequency?: 'DAILY' | 'WEEKLY' | 'CUSTOM';

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  targetCountPerPeriod?: number;

  @IsString()
  @Matches(/^#(?:[0-9a-fA-F]{3}){1,2}$/, { message: 'Invalid hex color code' })
  @IsOptional()
  colorHex?: string;

  @IsOptional()
  isArchived?: boolean;
}

export class LogHabitDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be formatted YYYY-MM-DD' })
  date!: string;

  @IsInt()
  @Min(1)
  count: number = 1;

  @IsString()
  @IsOptional()
  notes?: string;
}

// Architectural Location: apps/api/src/common/pipes/parse-date.pipe.ts
// Exported via apps/api/src/common/pipes/index.ts for use in HabitsController and generic date parameter validation.
@Injectable()
export class ParseDatePipe implements PipeTransform<string, string> {
  transform(value: string): string {
    const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoDatePattern.test(value)) {
      throw new BadRequestException('Invalid date format. Expected YYYY-MM-DD.');
    }
    const timestamp = Date.parse(value);
    if (isNaN(timestamp)) {
      throw new BadRequestException('Invalid calendar date value.');
    }
    return value;
  }
}
```

### 5. Edge Cases & Error Boundaries

- **Timezone Drift Protection**: The backend enforces date calculations against the user localized timezone offset passed in the JWT or stored in the user profile table. `logged_date` is strictly formatted and stored as standard ISO `DATE` (`YYYY-MM-DD`) rather than UTC timestamps.
- **Duplicate Log Guard**: PostgreSQL uniqueness constraint `uq_habit_log_date UNIQUE (habit_id, logged_date)` blocks double writes. The NestJS service converts DB error code `23505` into a controlled HTTP 409 Conflict.
- **Streak Recalculation Resiliency**: If a historic log entry is removed, the backend triggers an idempotent window re-evaluation of streaks across the preceding 365 calendar days within a database transaction. The recalculation acquires a row-level lock via `SELECT id FROM habit_streaks WHERE habit_id = $1 FOR UPDATE` to prevent concurrent recalculation race conditions.
- **No-Op Deletion Guard (DATA-03)**: `removeLog` MUST first delete the targeted log row with `.returning({ id: habitLogsTable.id })` and verify at least one row was actually deleted. If 0 rows were deleted, the repository MUST return the existing streak row immediately — without acquiring the `FOR UPDATE` streak lock and without recalculating streaks. This prevents unnecessary lock contention and spurious streak rewrites on idempotent deletions.

### 6. Mobile-First Layout & Touch Ergonomics

- **360px Viewport**: Cards occupy 100% viewport width. Habit title stacks above frequency badge. Action button spans 48x48px circle located in the rightmost quadrant to ensure thumb reach without accidental click slips.
- **390px Viewport**: Habit row introduces inline completion count indicator (`1/1 Done`). Margin padding: 16px.
- **430px Viewport**: Streak counter expands with descriptive badge (`7 Days Streak`).
- **768px Viewport**: 2-column masonry grid. Habit description displayed inline with 2-line clamp.
- **1024px+ Viewport**: Full dashboard matrix. Inline micro-heatmaps showing the past 14 days of logged check-ins per habit item. Touch target remains minimum 44px regardless of desktop cursor presence.
