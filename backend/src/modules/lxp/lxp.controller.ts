import {
  Patch,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles, RoleName } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  ApproveGeneratedArtifactsDto,
  AssignInterventionDto,
  CreateSystemEvaluationCampaignDto,
  ListSystemEvaluationCampaignsQueryDto,
  ListTeacherEvaluationSummaryQueryDto,
  ListSystemEvaluationsQueryDto,
  ResolveInterventionDto,
  SubmitAssignedSystemEvaluationDto,
  SubmitGuidedAssessmentDto,
  SubmitSystemEvaluationDto,
  SubmitTeacherEvaluationDto,
  UpdateSystemEvaluationCampaignStatusDto,
  UpdateGuidedAssessmentProgressDto,
} from './dto/lxp.dto';
import { LxpService } from './lxp.service';

@Controller('lxp')
@UseGuards(RolesGuard)
export class LxpController {
  constructor(private readonly lxpService: LxpService) {}

  @Get('me/eligibility')
  @Roles(RoleName.Student)
  async getEligibility(
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.lxpService.getStudentEligibility(user.userId);
    return { success: true, data };
  }

  @Get('me/intervention-alerts')
  @Roles(RoleName.Student)
  async getInterventionAlerts(
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.lxpService.getStudentInterventionAlerts(
      user.userId,
    );
    return { success: true, data };
  }

  @Get('me/playlist/:classId')
  @Roles(RoleName.Student)
  async getPlaylist(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.lxpService.getStudentPlaylist(user.userId, classId);
    return { success: true, data };
  }

  @Get('me/overview/:classId')
  @Roles(RoleName.Student)
  async getOverview(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.lxpService.getStudentOverview(user.userId, classId);
    return { success: true, data };
  }

  @Post('me/playlist/:classId/checkpoints/:assignmentId/complete')
  @Roles(RoleName.Student)
  async completeCheckpoint(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.lxpService.completeCheckpoint(
      user.userId,
      classId,
      assignmentId,
    );
    return { success: true, data };
  }

  @Get('me/playlist/:classId/generated-lessons/:assignmentId')
  @Roles(RoleName.Student)
  async getGeneratedLesson(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.lxpService.getGeneratedLesson(
      user.userId,
      classId,
      assignmentId,
    );
    return { success: true, data };
  }

  @Post('me/playlist/:classId/guided-assessments/:assignmentId/start')
  @Roles(RoleName.Student)
  async startGuidedAssessment(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.lxpService.startGuidedAssessment(
      user.userId,
      classId,
      assignmentId,
    );
    return { success: true, data };
  }

  @Patch('me/playlist/:classId/guided-assessments/:assignmentId/progress')
  @Roles(RoleName.Student)
  async updateGuidedAssessmentProgress(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() dto: UpdateGuidedAssessmentProgressDto,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.lxpService.updateGuidedAssessmentProgress(
      user.userId,
      classId,
      assignmentId,
      dto,
    );
    return { success: true, data };
  }

  @Post('me/playlist/:classId/guided-assessments/:assignmentId/submit')
  @Roles(RoleName.Student)
  async submitGuidedAssessment(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() dto: SubmitGuidedAssessmentDto,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.lxpService.submitGuidedAssessment(
      user.userId,
      classId,
      assignmentId,
      dto,
    );
    return { success: true, data };
  }

  @Get('me/playlist/:classId/guided-assessments/:assignmentId/result')
  @Roles(RoleName.Student)
  async getGuidedAssessmentResult(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.lxpService.getGuidedAssessmentResult(
      user.userId,
      classId,
      assignmentId,
    );
    return { success: true, data };
  }

  @Get('me/teacher-evaluations')
  @Roles(RoleName.Student)
  async getTeacherEvaluationDashboard(
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.lxpService.getStudentTeacherEvaluationDashboard(
      user.userId,
    );
    return { success: true, data };
  }

  @Post('me/teacher-evaluations')
  @Roles(RoleName.Student)
  async submitTeacherEvaluation(
    @CurrentUser() user: { userId: string; roles: string[] },
    @Body() dto: SubmitTeacherEvaluationDto,
  ) {
    const data = await this.lxpService.submitTeacherEvaluation(user, dto);
    return { success: true, data };
  }

  @Get('teacher/classes/:classId/interventions')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async getTeacherQueue(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.lxpService.getTeacherQueue(classId, user);
    return { success: true, data };
  }

  @Get('teacher/classes/:classId/interventions/history')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async getTeacherInterventionHistory(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.lxpService.getTeacherInterventionHistory(
      classId,
      user,
    );
    return { success: true, data };
  }

  @Get('teacher/interventions/pending-count')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async getTeacherPendingInterventionCount(
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.lxpService.getTeacherPendingInterventionCount(user);
    return { success: true, data };
  }

  @Post('teacher/interventions/:caseId/assign')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async assignIntervention(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Body() dto: AssignInterventionDto,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.lxpService.assignIntervention(caseId, dto, user);
    return { success: true, data };
  }

  @Post('teacher/interventions/:caseId/resolve')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async resolveIntervention(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Body() dto: ResolveInterventionDto,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.lxpService.resolveIntervention(caseId, dto, user);
    return { success: true, data };
  }

  @Post('teacher/interventions/:caseId/activate')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async activateIntervention(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.lxpService.activateIntervention(caseId, user);
    return { success: true, data };
  }

  @Post('teacher/interventions/:caseId/regenerate')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async regenerateInterventionPath(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.lxpService.regenerateInterventionPath(caseId, user);
    return { success: true, data };
  }

  @Get('teacher/interventions/:caseId')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async getTeacherInterventionCase(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.lxpService.getTeacherInterventionCase(caseId, user);
    return { success: true, data };
  }

  @Get('teacher/interventions/:caseId/detail')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async getTeacherInterventionCaseDetail(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.lxpService.getTeacherInterventionCaseDetail(
      caseId,
      user,
    );
    return { success: true, data };
  }

  @Get('teacher/classes/:classId/reports/summary')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async getClassReport(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.lxpService.getClassReport(classId, user);
    return { success: true, data };
  }

  @Post('evaluations')
  @Roles(RoleName.Student, RoleName.Teacher, RoleName.Admin)
  async submitEvaluation(
    @CurrentUser() user: { userId: string; roles: string[] },
    @Body() dto: SubmitSystemEvaluationDto,
  ) {
    const data = await this.lxpService.submitSystemEvaluation(user, dto);
    return { success: true, data };
  }

  @Get('evaluations')
  @Roles(RoleName.Admin)
  async listEvaluations(
    @CurrentUser() user: { userId: string; roles: string[] },
    @Query() query?: ListSystemEvaluationsQueryDto,
  ) {
    const data = await this.lxpService.listSystemEvaluations(user, query);
    return { success: true, data };
  }

  @Get('me/system-evaluations')
  @Roles(RoleName.Student, RoleName.Teacher)
  async getMySystemEvaluations(
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.lxpService.getMySystemEvaluationDashboard(user);
    return { success: true, data };
  }

  @Post('me/system-evaluations/:assignmentId/submit')
  @Roles(RoleName.Student, RoleName.Teacher)
  async submitAssignedSystemEvaluation(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
    @Body() dto: SubmitAssignedSystemEvaluationDto,
  ) {
    const data = await this.lxpService.submitAssignedSystemEvaluation(
      assignmentId,
      user,
      dto,
    );
    return { success: true, data };
  }

  @Post('system-evaluation-campaigns')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async createSystemEvaluationCampaign(
    @CurrentUser() user: { userId: string; roles: string[] },
    @Body() dto: CreateSystemEvaluationCampaignDto,
  ) {
    const data = await this.lxpService.createSystemEvaluationCampaign(
      user,
      dto,
    );
    return { success: true, data };
  }

  @Get('system-evaluation-campaigns')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async listSystemEvaluationCampaigns(
    @CurrentUser() user: { userId: string; roles: string[] },
    @Query() query?: ListSystemEvaluationCampaignsQueryDto,
  ) {
    const data = await this.lxpService.listSystemEvaluationCampaigns(
      user,
      query,
    );
    return { success: true, data };
  }

  @Patch('system-evaluation-campaigns/:campaignId/status')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async updateSystemEvaluationCampaignStatus(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
    @Body() dto: UpdateSystemEvaluationCampaignStatusDto,
  ) {
    const data = await this.lxpService.updateSystemEvaluationCampaignStatus(
      campaignId,
      user,
      dto,
    );
    return { success: true, data };
  }

  @Post('teacher/interventions/:caseId/generated-content/approve')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async approveGeneratedArtifacts(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Body() dto: ApproveGeneratedArtifactsDto,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.lxpService.approveGeneratedArtifacts(
      caseId,
      dto,
      user,
    );
    return { success: true, data };
  }

  @Post('teacher/interventions/:caseId/generated-content/reject')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async rejectGeneratedArtifacts(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Body() dto: ApproveGeneratedArtifactsDto,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.lxpService.rejectGeneratedArtifacts(
      caseId,
      dto,
      user,
    );
    return { success: true, data };
  }

  @Get('teacher/evaluations/summary')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async getTeacherEvaluationSummary(
    @CurrentUser() user: { userId: string; roles: string[] },
    @Query() query: ListTeacherEvaluationSummaryQueryDto,
  ) {
    const data = await this.lxpService.getTeacherEvaluationSummary(user, query);
    return { success: true, data };
  }
}
