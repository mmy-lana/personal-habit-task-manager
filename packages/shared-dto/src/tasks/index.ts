import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID, IsDateString, Matches } from 'class-validator';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TaskStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED';

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

export interface TaskModel {
  id: string;
  userId: string;
  projectId: string | null;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskWithProjectDetail extends TaskModel {
  project?: ProjectModel | null;
}

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const)
  priority: TaskPriority = 'MEDIUM';

  @IsEnum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'] as const)
  status: TaskStatus = 'TODO';

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
  priority?: TaskPriority;

  @IsEnum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'] as const)
  @IsOptional()
  status?: TaskStatus;

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
  status!: TaskStatus;

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
