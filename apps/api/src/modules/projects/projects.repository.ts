import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from '@repo/database';
import {
  type DatabaseClient,
  projects as projectsTable,
} from '@repo/database';
import type { CreateProjectDto } from '@repo/shared-dto';
import { DATABASE_CLIENT } from '../habits/habits.repository.js';

@Injectable()
export class ProjectsRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: DatabaseClient) {}

  async create(userId: string, dto: CreateProjectDto) {
    const [project] = await this.db
      .insert(projectsTable)
      .values({
        userId,
        name: dto.name,
        description: dto.description ?? null,
        colorHex: dto.colorHex,
      })
      .returning();
    return project;
  }

  async findAll(userId: string) {
    return this.db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.userId, userId));
  }

  async remove(id: string, userId: string): Promise<boolean> {
    const result = await this.db
      .delete(projectsTable)
      .where(and(eq(projectsTable.id, id), eq(projectsTable.userId, userId)))
      .returning({ id: projectsTable.id });
    return result.length > 0;
  }
}