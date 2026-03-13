import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, RoleName } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { QueryPerformanceLogsDto } from './DTO/query-performance-logs.dto';
import { PerformanceService } from './performance.service';

@Controller('performance')
@UseGuards(RolesGuard)
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  @Post('classes/:classId/recompute')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async recomputeClass(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.performanceService.recomputeClass(
      classId,
      user.userId,
      user.roles,
    );
    return { success: true, data };
  }

  @Get('classes/:classId/summary')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async getClassSummary(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.performanceService.getClassSummary(
      classId,
      user.userId,
      user.roles,
    );
    return { success: true, data };
  }

  @Get('classes/:classId/at-risk')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async getAtRiskStudents(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.performanceService.getAtRiskStudents(
      classId,
      user.userId,
      user.roles,
    );
    return { success: true, data };
  }

  @Get('classes/:classId/logs')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async getClassLogs(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Query() query: QueryPerformanceLogsDto,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.performanceService.getClassLogs(
      classId,
      user.userId,
      user.roles,
      query,
    );
    return { success: true, data };
  }

  @Get('students/me/summary')
  @Roles(RoleName.Student)
  async getStudentSummary(@CurrentUser() user: { userId: string }) {
    const data = await this.performanceService.getStudentOwnSummary(
      user.userId,
    );
    return { success: true, data };
  }
}
