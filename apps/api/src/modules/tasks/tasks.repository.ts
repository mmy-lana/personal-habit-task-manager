import { Injectable, Inject } from '@nestjs/common';
import { eq, and, desc } from '@repo/database';
import {
  type DatabaseClient,
  tasks as tasksTable,
} from '@repo/database';
import type { CreateTaskDto, UpdateTaskDto, UpdateTaskStatusDto } from '@repo/shared-dto';
import { DATABASE_CLIENT } from '../habits/habits.repository.js';

@Injectable()
export class TasksRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: DatabaseClient) {}

  async create(userId: string, dto: CreateTaskDto) {
    const [task] = await this.db
      .insert(tasksTable)
      .values({
        userId,
        title: dto.title,
        description: dto.description ?? null,
        priority: dto.priority,
        status: dto.status,
        projectId: dto.projectId ?? null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      })
      .returning();
    return task;
  }

  async findAll(userId: string, filters?: { projectId?: string; status?: string; priority?: string }) {
    const allTasks = await this.db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.userId, userId))
      .orderBy(desc(tasksTable.createdAt));

    return allTasks.filter((t) => {
      if (filters?.projectId && t.projectId !== filters.projectId) return false;
      if (filters?.status && t.status !== filters.status) return false;
      if (filters?.priority && t.priority !== filters.priority) return false;
      return true;
    });
  }

  async findOne(id: string, userId: string) {
    const result = await this.db
      .select()
      .from(tasksTable)
      .where(and(eq(tasksTable.id, id), eq(tasksTable.userId, userId)))
      .limit(1);
    return result[0] ?? null;
  }

  async update(id: string, userId: string, dto: UpdateTaskDto) {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.title !== undefined) updates['title'] = dto.title;
    if (dto.description !== undefined) updates['description'] = dto.description;
    if (dto.priority !== undefined) updates['priority'] = dto.priority;
    if (dto.status !== undefined) updates['status'] = dto.status;
    if (dto.projectId !== undefined) updates['projectId'] = dto.projectId;
    if (dto.dueDate !== undefined) updates['dueDate'] = dto.dueDate ? new Date(dto.dueDate) : null;

    if (dto.clientUpdatedAt) {
      const existing = await this.findOne(id, userId);
      if (existing && existing.updatedAt > new Date(dto.clientUpdatedAt)) {
        const err = new Error('Conflict');
        err.name = 'ConflictError';
        throw err;
      }
    }

    const result = await this.db
      .update(tasksTable)
      .set(updates)
      .where(and(eq(tasksTable.id, id), eq(tasksTable.userId, userId)))
      .returning();
    return result[0] ?? null;
  }

  async updateStatus(id: string, userId: string, dto: UpdateTaskStatusDto) {
    if (dto.clientUpdatedAt) {
      const existing = await this.findOne(id, userId);
      if (existing && existing.updatedAt > new Date(dto.clientUpdatedAt)) {
        const err = new Error('Conflict');
        err.name = 'ConflictError';
        throw err;
      }
    }

    const completedAt = dto.status === 'COMPLETED' ? new Date() : null;
    const result = await this.db
      .update(tasksTable)
      .set({ status: dto.status, completedAt, updatedAt: new Date() })
      .where(and(eq(tasksTable.id, id), eq(tasksTable.userId, userId)))
      .returning();
    return result[0] ?? null;
  }

  async remove(id: string, userId: string): Promise<boolean> {
    const result = await this.db
      .delete(tasksTable)
      .where(and(eq(tasksTable.id, id), eq(tasksTable.userId, userId)))
      .returning({ id: tasksTable.id });
    return result.length > 0;
  }
}