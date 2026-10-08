import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpStatus } from '@nestjs/common';
import { TasksService } from './tasks.service.js';
import type { CreateTaskDto, UpdateTaskDto, UpdateTaskStatusDto } from '@repo/shared-dto';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  private readonly defaultUserId = '00000000-0000-0000-0000-000000000000';

  @Post()
  async create(@Body() dto: CreateTaskDto) {
    const task = await this.tasksService.create(this.defaultUserId, dto);
    return {
      success: true, statusCode: HttpStatus.CREATED, data: task,
      meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
    };
  }

  @Get()
  async findAll(
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
  ) {
    const filters: Record<string, string> = {};
    if (projectId !== undefined) filters['projectId'] = projectId;
    if (status !== undefined) filters['status'] = status;
    if (priority !== undefined) filters['priority'] = priority;
    const tasks = await this.tasksService.findAll(this.defaultUserId, filters);
    return {
      success: true, statusCode: HttpStatus.OK, data: tasks,
      meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const task = await this.tasksService.findOne(id, this.defaultUserId);
    return {
      success: true, statusCode: HttpStatus.OK, data: task,
      meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
    };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    const task = await this.tasksService.update(id, this.defaultUserId, dto);
    return {
      success: true, statusCode: HttpStatus.OK, data: task,
      meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
    };
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateTaskStatusDto) {
    const task = await this.tasksService.updateStatus(id, this.defaultUserId, dto);
    return {
      success: true, statusCode: HttpStatus.OK, data: task,
      meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const result = await this.tasksService.remove(id, this.defaultUserId);
    return {
      success: true, statusCode: HttpStatus.OK, data: result,
      meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
    };
  }
}