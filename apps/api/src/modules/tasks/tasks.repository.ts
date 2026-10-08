import { Injectable, Inject } from '@nestjs/common';
import { eq, and, desc } from '@repo/database';
import {
  type DatabaseClient,
  tasks as tasksTable,
} from '@repo/database';
import type { CreateTaskDto, UpdateTaskDto, UpdateTaskStatusDto, TaskStatus, TaskPriority } from '@repo/shared-dto';
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
    // DATA-02: filtering is pushed down into PostgreSQL as a dynamic `where`
    // predicate — no application-heap post-filtering over unbounded row sets.
    const conditions = [eq(tasksTable.userId, userId)];
    if (filters?.projectId) conditions.push(eq(tasksTable.projectId, filters.projectId));
    if (filters?.status) conditions.push(eq(tasksTable.status, filters.status as TaskStatus));
    if (filters?.priority) conditions.push(eq(tasksTable.priority, filters.priority as TaskPriority));

    return this.db
      .select()
      .from(tasksTable)
      .where(and(...conditions))
      .orderBy(desc(tasksTable.createdAt));
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

    // DATA-01: optimistic concurrency is enforced atomically in SQL. When
    // `clientUpdatedAt` is supplied it joins the `where` predicate, so the
    // compare-and-swap happens in a single statement — a concurrent writer
    // between the client's read and this write yields 0 affected rows, which
    // maps to ConflictError (HTTP 409) with no TOCTOU read-then-write window.
    const conditions = [eq(tasksTable.id, id), eq(tasksTable.userId, userId)];
    if (dto.clientUpdatedAt) conditions.push(eq(tasksTable.updatedAt, new Date(dto.clientUpdatedAt)));

    const result = await this.db
      .update(tasksTable)
      .set(updates)
      .where(and(...conditions))
      .returning();

    if (dto.clientUpdatedAt && result.length === 0) {
      const err = new Error('Conflict');
      err.name = 'ConflictError';
      throw err;
    }
    return result[0] ?? null;
  }

  async updateStatus(id: string, userId: string, dto: UpdateTaskStatusDto) {
    // DATA-01: same atomic compare-and-swap contract as `update`.
    const conditions = [eq(tasksTable.id, id), eq(tasksTable.userId, userId)];
    if (dto.clientUpdatedAt) conditions.push(eq(tasksTable.updatedAt, new Date(dto.clientUpdatedAt)));

    const completedAt = dto.status === 'COMPLETED' ? new Date() : null;
    const result = await this.db
      .update(tasksTable)
      .set({ status: dto.status, completedAt, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();

    if (dto.clientUpdatedAt && result.length === 0) {
      const err = new Error('Conflict');
      err.name = 'ConflictError';
      throw err;
    }
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