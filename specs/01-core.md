# Core Specification: Data Layer & Shared Contracts

### 1. Database Schema (Neon PostgreSQL / DDL)

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE habit_frequency_type AS ENUM ('DAILY', 'WEEKLY', 'CUSTOM');
CREATE TYPE task_priority_type AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE task_status_type AS ENUM ('BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    color_hex VARCHAR(7) NOT NULL DEFAULT '#0077b6',
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    priority task_priority_type NOT NULL DEFAULT 'MEDIUM',
    status task_status_type NOT NULL DEFAULT 'TODO',
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    frequency habit_frequency_type NOT NULL DEFAULT 'DAILY',
    target_count_per_period INT NOT NULL DEFAULT 1,
    target_period_days INT NOT NULL DEFAULT 1,
    color_hex VARCHAR(7) NOT NULL DEFAULT '#1282a2',
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE habit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    logged_date DATE NOT NULL,
    count INT NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_habit_log_date UNIQUE (habit_id, logged_date)
);

CREATE TABLE habit_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID NOT NULL UNIQUE REFERENCES habits(id) ON DELETE CASCADE,
    current_streak INT NOT NULL DEFAULT 0,
    longest_streak INT NOT NULL DEFAULT 0,
    last_logged_date DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_user_due ON tasks(user_id, due_date) WHERE status != 'COMPLETED';
CREATE INDEX idx_habits_user_archived ON habits(user_id, is_archived);
CREATE INDEX idx_habit_logs_habit_date ON habit_logs(habit_id, logged_date);
CREATE INDEX idx_habit_logs_user_id ON habit_logs(user_id);

-- Note: habit_streaks row initialization is strictly an application-layer atomic transaction
-- in HabitsRepository.create(). No PostgreSQL trigger is used, preserving ORM transaction control.
```

### 2. Global Interfaces & Shared Envelopes

```typescript
export type HabitFrequency = 'DAILY' | 'WEEKLY' | 'CUSTOM';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TaskStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED';

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### 3. Core Shared DTOs & Barrel Exports

#### 3.1 Barrel Export Structure
- `packages/shared-dto/src/common/index.ts`: Exports `ApiResponseEnvelope`, `BaseEntity`, `PaginationQuery`, `PaginatedResult`, `PaginationDto`.
- `packages/shared-dto/src/users/index.ts`: Exports `UserProfileDto`, `AuthTokenResponseDto`, `RefreshTokenRequestDto`.
- `packages/shared-dto/src/habits/index.ts`: Exports `HabitModel`, `HabitLogModel`, `HabitStreakModel`, `HabitWithStreakDetail`, `CreateHabitDto`, `UpdateHabitDto`, `LogHabitDto`.
- `packages/shared-dto/src/tasks/index.ts`: Exports `TaskModel`, `ProjectModel`, `TaskWithProjectDetail`, `CreateTaskDto`, `UpdateTaskDto`, `UpdateTaskStatusDto`, `CreateProjectDto`.
- `packages/shared-dto/src/index.ts`: Re-exports all submodule indexes for `NodeNext` compatibility.

#### 3.2 DTO Definitions

```typescript
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

export interface UserProfileDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  timezone: string;
}

export interface AuthTokenResponseDto {
  accessToken: string;
  expiresIn: number;
}

export interface RefreshTokenRequestDto {
  refreshToken?: string;
}
```
