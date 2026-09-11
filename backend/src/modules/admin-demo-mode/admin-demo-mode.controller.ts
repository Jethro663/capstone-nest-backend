import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoleName, Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  ActivateAdminDemoModeDto,
  DeactivateAdminDemoModeDto,
} from './DTO/admin-demo-mode.dto';
import { AdminDemoModeService } from './admin-demo-mode.service';

type Actor = { userId: string; roles: string[] };

@Controller('admin/demo-mode')
@UseGuards(RolesGuard)
@Roles(RoleName.Admin)
export class AdminDemoModeController {
  constructor(private readonly demoMode: AdminDemoModeService) {}

  private response(message: string, data: unknown) {
    return { success: true, message, data };
  }

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async status() {
    return this.response(
      'Demo mode status retrieved',
      await this.demoMode.getStatus(),
    );
  }

  @Post('activate')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async activate(
    @Body() dto: ActivateAdminDemoModeDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.response(
      'Demo mode activated',
      await this.demoMode.activate(dto, actor.userId),
    );
  }

  @Post('deactivate')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async deactivate(
    @Body() dto: DeactivateAdminDemoModeDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.response(
      'Demo mode deactivated',
      await this.demoMode.deactivate(dto, actor.userId),
    );
  }
}
