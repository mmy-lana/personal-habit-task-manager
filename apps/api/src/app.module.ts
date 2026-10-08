import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { validateEnvironment } from './config/index.js';
import { DatabaseModule } from './database/database.module.js';
import { HabitsModule } from './modules/habits/habits.module.js';
import { ProjectsModule } from './modules/projects/projects.module.js';
import { TasksModule } from './modules/tasks/tasks.module.js';
import { AnalyticsModule } from './modules/analytics/analytics.module.js';
import { HealthModule } from './modules/health/health.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // Resolved from apps/api, so the workspace-level .env lives two levels up.
      envFilePath: ['../../.env', '.env'],
      expandVariables: true,
      // Fails the boot with an aggregated report before any provider is constructed.
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    DatabaseModule,
    HabitsModule,
    ProjectsModule,
    TasksModule,
    AnalyticsModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
