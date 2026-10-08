import { Controller, Get, HttpStatus } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  private readonly defaultUserId = '00000000-0000-0000-0000-000000000000';

  @Get('summary')
  async getSummary() {
    const data = await this.analyticsService.getSummary(this.defaultUserId);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data,
      meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
    };
  }
}