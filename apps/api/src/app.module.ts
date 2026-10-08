import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { validateEnvironment } from './config/index.js';
import { HabitsModule } from './modules/habits/habits.module.js';

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
    HabitsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
