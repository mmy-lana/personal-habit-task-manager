import { Module } from '@nestjs/common';
import { HabitsController } from './habits.controller.js';
import { HabitsService } from './habits.service.js';
import { HabitsRepository } from './habits.repository.js';

@Module({
  controllers: [HabitsController],
  // DATABASE_CLIENT is provided globally by `DatabaseModule` (apps/api/src/database).
  providers: [HabitsRepository, HabitsService],
  exports: [HabitsService],
})
export class HabitsModule {}