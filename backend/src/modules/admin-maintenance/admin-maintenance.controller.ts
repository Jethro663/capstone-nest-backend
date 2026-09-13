import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoleName, Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OpenAdminMaintenanceSessionDto } from './DTO/admin-maintenance.dto';
import { AdminMaintenanceService } from './admin-maintenance.service';

type Actor = { userId: string; roles: string[] };

@Controller('admin/maintenance')
@UseGuards(RolesGuard)
@Roles(RoleName.Admin)
export class AdminMaintenanceController {
  constructor(private readonly maintenance: AdminMaintenanceService) {}

  private response(message: string, data: unknown) {
    return { success: true, message, data };
  }

  @Get('session')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async status(@CurrentUser() actor: Actor) {
    return this.response(
      'Maintenance Access status retrieved',
      await this.maintenance.getStatus(actor.userId, actor.roles),
    );
  }

  @Post('session')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async open(
    @Body() dto: OpenAdminMaintenanceSessionDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.response(
      'Maintenance Access opened',
      await this.maintenance.open(dto, actor.userId, actor.roles),
    );
  }

  @Delete('session')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async close(@CurrentUser() actor: Actor) {
    return this.response(
      'Maintenance Access closed',
      await this.maintenance.close(actor.userId, actor.roles),
    );
  }
}
