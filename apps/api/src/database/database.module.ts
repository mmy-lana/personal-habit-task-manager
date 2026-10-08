import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDatabaseClient, type DatabaseClient } from '@repo/database';
import { DATABASE_CLIENT } from '../modules/habits/habits.repository.js';

/**
 * Global database client provider.
 *
 * Every feature module (habits, tasks, projects, analytics) injects the same
 * `DATABASE_CLIENT` symbol, so the client is registered once here and exported
 * globally instead of being re-declared per feature module.
 */
@Global()
@Module({
  providers: [
    {
      provide: DATABASE_CLIENT,
      useFactory: (config: ConfigService): DatabaseClient => {
        const url = config.get<string>('DATABASE_URL') ?? '';
        return createDatabaseClient(url);
      },
      inject: [ConfigService],
    },
  ],
  exports: [DATABASE_CLIENT],
})
export class DatabaseModule {}
