import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles, RoleName } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AnalyticsService } from './analytics.service';

@ApiBearerAuth('token')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('classes/:classId/intervention-outcomes')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async getInterventionOutcomes(
    @Param('classId') classId: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.analyticsService.getInterventionOutcomes(
      classId,
      user.userId,
      user.roles,
    );
    return { success: true, data };
  }

  @Get('classes/:classId/trends')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async getClassTrends(
    @Param('classId') classId: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.analyticsService.getClassTrends(
      classId,
      user.userId,
      user.roles,
    );
    return { success: true, data };
  }

  @Get('teachers/:teacherId/workload')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async getTeacherWorkload(
    @Param('teacherId') teacherId: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.analyticsService.getTeacherWorkload(teacherId, user);
    return { success: true, data };
  }

  @Get('admin/overview')
  @Roles(RoleName.Admin)
  async getAdminOverview() {
    const data = await this.analyticsService.getAdminOverview();
    return { success: true, data };
  }
}
