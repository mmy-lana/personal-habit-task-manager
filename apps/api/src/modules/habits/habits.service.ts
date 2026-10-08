import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { HabitsRepository } from './habits.repository.js';
import type { CreateHabitDto, UpdateHabitDto, LogHabitDto } from '@repo/shared-dto';

@Injectable()
export class HabitsService {
  constructor(private readonly repo: HabitsRepository) {}

  async create(userId: string, dto: CreateHabitDto) {
    return this.repo.create(userId, dto);
  }

  async findAll(userId: string, includeArchived: boolean) {
    return this.repo.findAll(userId, includeArchived);
  }

  async findOne(id: string, userId: string) {
    const habit = await this.repo.findOne(id, userId);
    if (!habit) throw new NotFoundException('Habit not found');
    return habit;
  }

  async update(id: string, userId: string, dto: UpdateHabitDto) {
    const updated = await this.repo.update(id, userId, dto);
    if (!updated) throw new NotFoundException('Habit not found');
    return updated;
  }

  async remove(id: string, userId: string) {
    const deleted = await this.repo.remove(id, userId);
    if (!deleted) throw new NotFoundException('Habit not found');
    return { id, deleted: true };
  }

  async logHabit(habitId: string, userId: string, dto: LogHabitDto) {
    try {
      return await this.repo.logHabit(habitId, userId, dto);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'ConflictError') {
        throw new ConflictException('Already checked in for this date');
      }
      throw err;
    }
  }

  async removeLog(habitId: string, userId: string, date: string) {
    return this.repo.removeLog(habitId, userId, date);
  }
}