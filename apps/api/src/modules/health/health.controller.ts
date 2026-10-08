import { Controller, Get, HttpStatus } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data: { status: 'ok', uptime: process.uptime() },
      meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() },
    };
  }
}
