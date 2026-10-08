import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { HabitsService } from './habits.service.js';
import { ParseDatePipe } from '../../common/pipes/parse-date.pipe.js';
import { CreateHabitDto, UpdateHabitDto, LogHabitDto } from '@repo/shared-dto';

@Controller('habits')
export class HabitsController {
  constructor(private readonly habitsService: HabitsService) {}

  // Placeholder userId until auth module is wired
  private readonly defaultUserId = '00000000-0000-0000-0000-000000000000';

  /**
   * SEC-01: the zero-UUID dev identity is only allowed outside production.
   * In production an authenticated session is required; fail closed.
   */
  private resolveUserId(): string {
    if (process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException('Authentication required in production environment');
    }
    return this.defaultUserId;
  }

  @Post()
  async create(@Body() dto: CreateHabitDto) {
    const habit = await this.habitsService.create(this.resolveUserId(), dto);
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      data: habit,
      meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
    };
  }

  @Get()
  async findAll(@Query('includeArchived') includeArchived?: string) {
    const include = includeArchived === 'true';
    const habits = await this.habitsService.findAll(this.resolveUserId(), include);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data: habits,
      meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const habit = await this.habitsService.findOne(id, this.resolveUserId());
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data: habit,
      meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
    };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateHabitDto) {
    const habit = await this.habitsService.update(id, this.resolveUserId(), dto);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data: habit,
      meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    const result = await this.habitsService.remove(id, this.resolveUserId());
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data: result,
      meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
    };
  }

  @Post(':id/log')
  async logHabit(@Param('id') id: string, @Body() dto: LogHabitDto) {
    const streak = await this.habitsService.logHabit(id, this.resolveUserId(), dto);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data: streak,
      meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
    };
  }

  @Delete(':id/log/:date')
  @HttpCode(HttpStatus.OK)
  async removeLog(
    @Param('id') id: string,
    @Param('date', ParseDatePipe) date: string,
  ) {
    const streak = await this.habitsService.removeLog(id, this.resolveUserId(), date);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data: streak,
      meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
    };
  }
}