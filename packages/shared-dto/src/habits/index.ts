import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, Min, Max, Matches } from 'class-validator';

export type HabitFrequency = 'DAILY' | 'WEEKLY' | 'CUSTOM';

export interface HabitModel {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  frequency: HabitFrequency;
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
  loggedDate: string;
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

export class CreateHabitDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['DAILY', 'WEEKLY', 'CUSTOM'] as const)
  frequency!: HabitFrequency;

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
  frequency?: HabitFrequency;

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
