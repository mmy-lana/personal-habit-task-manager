import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDatabaseClient, type DatabaseClient } from '@repo/database';
import { HabitsController } from './habits.controller.js';
import { HabitsService } from './habits.service.js';
import { HabitsRepository, DATABASE_CLIENT } from './habits.repository.js';

@Module({
  controllers: [HabitsController],
  providers: [
    {
      provide: DATABASE_CLIENT,
      useFactory: (config: ConfigService): DatabaseClient => {
        const url = config.get<string>('DATABASE_URL') ?? '';
        return createDatabaseClient(url);
      },
      inject: [ConfigService],
    },
    HabitsRepository,
    HabitsService,
  ],
  exports: [HabitsService],
})
export class HabitsModule {}