import {
  Body,
  Controller,
  Get,
  Post,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { RoleName, Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  ActivateAdminDemoModeDto,
  DeactivateAdminDemoModeDto,
  type AdminDemoModeStatusDto,
} from './DTO/admin-demo-mode.dto';

@Controller('admin/demo-mode')
@UseGuards(RolesGuard)
@Roles(RoleName.Admin)
export class AdminDemoModeController {
  private response(message: string, data: unknown) {
    return { success: true, message, data };
  }

  private retiredStatus(): AdminDemoModeStatusDto {
    return {
      available: false,
      active: false,
      state: 'unavailable',
      version: 0,
      serverTime: new Date().toISOString(),
      activatedAt: null,
      expiresAt: null,
      reason: 'Demo mode has been retired. Use Maintenance Access instead.',
      activatedBy: null,
      relaxedRules: [],
      protectedRules: [],
    };
  }

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  status() {
    return this.response('Demo mode status retrieved', this.retiredStatus());
  }

  @Post('activate')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async activate(@Body() _dto: ActivateAdminDemoModeDto) {
    throw new ServiceUnavailableException(
      'Demo mode has been retired. Open Maintenance Access instead.',
    );
  }

  @Post('deactivate')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  deactivate(@Body() _dto: DeactivateAdminDemoModeDto) {
    return this.response('Demo mode deactivated', this.retiredStatus());
  }
}
