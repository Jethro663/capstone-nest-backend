import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get('live')
  @ApiOperation({
    summary: 'Liveness check - returns 200 when the server process is up',
  })
  @ApiResponse({ status: 200, description: 'Server is healthy' })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Alias of the liveness check for compatibility',
  })
  aliasCheck() {
    return this.check();
  }

  @Public()
  @Get('ready')
  @ApiOperation({
    summary: 'Readiness check covering database, Redis, and AI-service dependencies',
  })
  @ApiResponse({ status: 200, description: 'Server is ready to receive traffic' })
  @ApiResponse({ status: 503, description: 'One or more dependencies are not ready' })
  async readiness() {
    const status = await this.healthService.getReadiness();

    if (!status.ready) {
      throw new ServiceUnavailableException({
        success: false,
        message: 'Service dependencies are not ready',
        data: status,
      });
    }

    return {
      success: true,
      message: 'Service is ready',
      data: status,
    };
  }
}
