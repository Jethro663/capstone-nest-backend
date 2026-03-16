import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, RoleName } from '../auth/decorators/roles.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';
import { parsePositiveIntQuery } from '../../common/utils/parse-positive-int-query.util';

@ApiBearerAuth('token')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('dashboard/stats')
  @Roles(RoleName.Admin)
  async getDashboardStats() {
    const stats = await this.adminService.getDashboardStats();
    return {
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('audit-logs')
  @Roles(RoleName.Admin)
  async getAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('actorId') actorId?: string,
  ) {
    const result = await this.adminService.getAuditLogs({
      page: parsePositiveIntQuery(page, 'page'),
      limit: parsePositiveIntQuery(limit, 'limit'),
      action,
      actorId,
    });

    return { success: true, ...result };
  }
}
