import { Controller, Get, Post, Delete, Body, Param, HttpStatus } from '@nestjs/common';
import { ProjectsService } from './projects.service.js';
// Value import (not `import type`): the ValidationPipe needs the runtime DTO
// class to read class-validator metadata; a type-only import erases it.
import { CreateProjectDto } from '@repo/shared-dto';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  private readonly defaultUserId = '00000000-0000-0000-0000-000000000000';

  @Post()
  async create(@Body() dto: CreateProjectDto) {
    const project = await this.projectsService.create(this.defaultUserId, dto);
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      data: project,
      meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
    };
  }

  @Get()
  async findAll() {
    const projects = await this.projectsService.findAll(this.defaultUserId);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data: projects,
      meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const result = await this.projectsService.remove(id, this.defaultUserId);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data: result,
      meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
    };
  }
}