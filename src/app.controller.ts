import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'API root endpoint' })
  @ApiResponse({ status: 200, description: 'API is running' })
  getHello(): { message: string; version: string } {
    return {
      message: 'Task Manager API is running',
      version: 'v1',
    };
  }
}
