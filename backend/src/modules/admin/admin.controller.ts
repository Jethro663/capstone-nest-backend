import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, RoleName } from '../auth/decorators/roles.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';
import { parsePositiveIntQuery } from '../../common/utils/parse-positive-int-query.util';
import { parseDateQuery } from '../../common/utils/parse-date-query.util';
import { Res } from '@nestjs/common';
import type { Response } from 'express';

@ApiBearerAuth('token')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('overview')
  @Roles(RoleName.Admin)
  async getOverview() {
    const data = await this.adminService.getDashboardOverview();
    return {
      success: true,
      message: 'Admin overview retrieved successfully.',
      data,
    };
  }

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
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const result = await this.adminService.getAuditLogs({
      page: parsePositiveIntQuery(page, 'page'),
      limit: parsePositiveIntQuery(limit, 'limit'),
      action,
      actorId,
      dateFrom: parseDateQuery(dateFrom, 'dateFrom'),
      dateTo: parseDateQuery(dateTo, 'dateTo'),
    });

    return { success: true, ...result };
  }

  @Get('usage-summary')
  @Roles(RoleName.Admin)
  async getUsageSummary(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const data = await this.adminService.getUsageSummary({
      dateFrom: parseDateQuery(dateFrom, 'dateFrom'),
      dateTo: parseDateQuery(dateTo, 'dateTo'),
    });

    return { success: true, data };
  }

  @Get('activity-export')
  @Roles(RoleName.Admin)
  async exportActivity(
    @Query('dateFrom') dateFrom: string | undefined,
    @Query('dateTo') dateTo: string | undefined,
    @Res() res: Response,
  ) {
    const data = await this.adminService.getUsageSummary({
      dateFrom: parseDateQuery(dateFrom, 'dateFrom'),
      dateTo: parseDateQuery(dateTo, 'dateTo'),
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="activity-export.csv"',
    );
    return res.send(data.csv);
  }
}
