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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles, RoleName } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  AssignInterventionDto,
  ResolveInterventionDto,
  SubmitSystemEvaluationDto,
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

  @Get('me/playlist/:classId')
  @Roles(RoleName.Student)
  async getPlaylist(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.lxpService.getStudentPlaylist(user.userId, classId);
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

  @Get('teacher/classes/:classId/interventions')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async getTeacherQueue(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.lxpService.getTeacherQueue(classId, user);
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
  @Roles(RoleName.Teacher, RoleName.Admin)
  async listEvaluations(
    @CurrentUser() user: { userId: string; roles: string[] },
    @Query('targetModule') targetModule?: string,
  ) {
    const data = await this.lxpService.listSystemEvaluations(
      user,
      targetModule,
    );
    return { success: true, data };
  }
}
