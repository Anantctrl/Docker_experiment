import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Check API health' })
  @ApiResponse({ status: 200, description: 'API is healthy' })
  async check() {
    const database = await this.healthService.checkDatabase();
    const status = database.status === 'up' ? 'ok' : 'degraded';
    return {
      status,
      timestamp: new Date().toISOString(),
      services: {
        database,
      },
    };
  }
}
