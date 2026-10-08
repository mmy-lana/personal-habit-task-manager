import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { TasksRepository } from './tasks.repository.js';
import type { CreateTaskDto, UpdateTaskDto, UpdateTaskStatusDto } from '@repo/shared-dto';

@Injectable()
export class TasksService {
  constructor(private readonly repo: TasksRepository) {}

  async create(userId: string, dto: CreateTaskDto) {
    return this.repo.create(userId, dto);
  }

  async findAll(userId: string, filters?: { projectId?: string; status?: string; priority?: string }) {
    return this.repo.findAll(userId, filters);
  }

  async findOne(id: string, userId: string) {
    const task = await this.repo.findOne(id, userId);
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async update(id: string, userId: string, dto: UpdateTaskDto) {
    try {
      const updated = await this.repo.update(id, userId, dto);
      if (!updated) throw new NotFoundException('Task not found');
      return updated;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'ConflictError') {
        throw new ConflictException('Task was modified by another session');
      }
      throw err;
    }
  }

  async updateStatus(id: string, userId: string, dto: UpdateTaskStatusDto) {
    try {
      const updated = await this.repo.updateStatus(id, userId, dto);
      if (!updated) throw new NotFoundException('Task not found');
      return updated;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'ConflictError') {
        throw new ConflictException('Task was modified by another session');
      }
      throw err;
    }
  }

  async remove(id: string, userId: string) {
    const deleted = await this.repo.remove(id, userId);
    if (!deleted) throw new NotFoundException('Task not found');
    return { id, deleted: true };
  }
}