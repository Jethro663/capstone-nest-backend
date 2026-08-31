import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoleName, Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ImpactPreviewQueryDto } from './DTO/impact-preview-query.dto';
import { TransitionAcademicStateDto } from './DTO/transition-academic-state.dto';
import { AcademicStateService } from './academic-state.service';
import { AcademicPolicyService } from './academic-policy.service';
import { AcademicPeriodService } from './academic-period.service';
import { ActivateAcademicPeriodDto } from './DTO/activate-academic-period.dto';
import { AcademicTransitionReadinessService } from './academic-transition-readiness.service';
import type { PeriodKey } from './academic-policy';

@ApiTags('Academic State')
@ApiBearerAuth('token')
@Controller('academic-state')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AcademicStateController {
  constructor(
    private readonly academicStateService: AcademicStateService,
    private readonly policyService: AcademicPolicyService,
    private readonly periodService: AcademicPeriodService,
    private readonly readinessService: AcademicTransitionReadinessService,
  ) {}

  @Get('policy')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async getPolicy(@Query('schoolYear') schoolYear: string) {
    return {
      success: true,
      message: 'School-year policy retrieved',
      data: await this.policyService.forYear(schoolYear),
    };
  }

  @Get('transition-readiness')
  @Roles(RoleName.Admin)
  async getTransitionReadiness() {
    return {
      success: true,
      message: 'Academic transition readiness retrieved',
      data: await this.readinessService.getReadiness(),
    };
  }

  @Get('current')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async getCurrent() {
    const state = await this.policyService.currentState();
    const data = {
      ...state,
      transitionConfirmationText:
        AcademicStateService.TRANSITION_CONFIRMATION_TEXT,
    };
    return {
      success: true,
      message: 'Current academic state retrieved',
      data,
    };
  }

  @Post('activate-period')
  @Roles(RoleName.Admin)
  async activatePeriod(
    @Body() dto: ActivateAcademicPeriodDto,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return {
      success: true,
      message: 'Academic period activated',
      data: await this.periodService.activate(dto, user.userId, user.roles),
    };
  }

  @Get('quarter-readiness')
  @Roles(RoleName.Admin)
  async previewPeriod(@Query('targetQuarter') targetQuarter: PeriodKey) {
    return {
      success: true,
      message: 'Academic period activation preview retrieved',
      data: await this.periodService.preview(targetQuarter),
    };
  }

  @Get('impact-preview')
  @Roles(RoleName.Admin)
  async getImpactPreview(@Query() query: ImpactPreviewQueryDto) {
    const data = await this.academicStateService.getImpactPreview(
      query.schoolYear,
    );
    return {
      success: true,
      message: 'Academic transition impact preview retrieved',
      data,
    };
  }

  @Post('notify-teachers')
  @Roles(RoleName.Admin)
  async notifyUnfinalizedTeachers(@CurrentUser() user: any) {
    const actorId = user?.userId ?? user?.id;
    const data =
      await this.academicStateService.notifyUnfinalizedTeachers(actorId);
    return {
      success: true,
      message: data.message,
      data,
    };
  }

  @Post('transition')
  @Roles(RoleName.Admin)
  async transition(
    @Body() dto: TransitionAcademicStateDto,
    @CurrentUser() user: any,
  ) {
    const actorId = user?.userId ?? user?.id;
    const data = await this.academicStateService.transition(dto, actorId);
    return {
      success: true,
      message: 'Academic state updated',
      data,
    };
  }
}
