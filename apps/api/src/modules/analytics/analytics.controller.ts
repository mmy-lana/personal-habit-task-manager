import { Controller, Get, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

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

  @Get('summary')
  async getSummary() {
    const data = await this.analyticsService.getSummary(this.resolveUserId());
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data,
      meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
    };
  }
}