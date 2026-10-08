import { Injectable, NotFoundException } from '@nestjs/common';
import { ProjectsRepository } from './projects.repository.js';
import type { CreateProjectDto } from '@repo/shared-dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly repo: ProjectsRepository) {}

  async create(userId: string, dto: CreateProjectDto) {
    return this.repo.create(userId, dto);
  }

  async findAll(userId: string) {
    return this.repo.findAll(userId);
  }

  async remove(id: string, userId: string) {
    const deleted = await this.repo.remove(id, userId);
    if (!deleted) throw new NotFoundException('Project not found');
    return { id, deleted: true };
  }
}