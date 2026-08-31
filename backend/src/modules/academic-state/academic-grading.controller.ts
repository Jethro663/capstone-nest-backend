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
import { AnnualGradesService } from './annual-grades.service';
import {
  ClearBackSubjectDto,
  ReferencedEvidenceDto,
  ExternalPeriodGradeDto,
  RecordRemediationDto,
  ScheduleBackSubjectDto,
  SelectAnnualSourceDto,
} from './DTO/academic-grade-repair.dto';

type AdminActor = { userId: string; roles: string[] };

@Controller('academic-grading')
@UseGuards(RolesGuard)
@Roles(RoleName.Admin)
export class AcademicGradingController {
  constructor(private readonly grades: AnnualGradesService) {}

  @Post('classes/:classId/external-period-grades')
  async external(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: ExternalPeriodGradeDto,
    @CurrentUser() user: AdminActor,
  ) {
    return {
      success: true,
      message: 'Verified external grade recorded',
      data: await this.grades.recordExternalGrade(
        classId,
        dto,
        user.userId,
        user.roles,
      ),
    };
  }
  @Post('classes/:classId/source-selection')
  async select(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: SelectAnnualSourceDto,
    @CurrentUser() user: AdminActor,
  ) {
    return {
      success: true,
      message: 'Authoritative period source selected',
      data: await this.grades.selectSource(
        classId,
        dto,
        user.userId,
        user.roles,
      ),
    };
  }
  @Post('annual-grades/:id/remediation')
  async remediation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordRemediationDto,
    @CurrentUser() user: AdminActor,
  ) {
    return {
      success: true,
      message: 'SRC evidence recorded',
      data: await this.grades.recordRemediation(
        id,
        dto,
        user.userId,
        user.roles,
      ),
    };
  }
  @Get('grade-10-completions')
  async completions(@CurrentUser() user: AdminActor) {
    return {
      success: true,
      message: 'Grade 10 completion evidence',
      data: await this.grades.listGrade10Completions(user.userId, user.roles),
    };
  }
  @Post('students/:studentId/complete-grade-10')
  async completeGrade10(
    @Param('studentId', ParseUUIDPipe) id: string,
    @Body() dto: ReferencedEvidenceDto,
    @CurrentUser() user: AdminActor,
  ) {
    return {
      success: true,
      message: 'Grade 10 completion recorded',
      data: await this.grades.completeGrade10(id, dto, user.userId, user.roles),
    };
  }
  @Get('back-subjects')
  async obligations(
    @Query('studentId', new ParseUUIDPipe({ optional: true }))
    studentId: string | undefined,
    @CurrentUser() user: AdminActor,
  ) {
    return {
      success: true,
      message: 'Back-subject obligations and history',
      data: await this.grades.listBackSubjects(
        user.userId,
        user.roles,
        studentId,
      ),
    };
  }
  @Post('back-subjects/:id/schedule')
  async schedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ScheduleBackSubjectDto,
    @CurrentUser() user: AdminActor,
  ) {
    return {
      success: true,
      message: 'Back subject scheduled',
      data: await this.grades.scheduleBackSubject(
        id,
        dto,
        user.userId,
        user.roles,
      ),
    };
  }
  @Post('back-subjects/:id/clear')
  async clear(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ClearBackSubjectDto,
    @CurrentUser() user: AdminActor,
  ) {
    return {
      success: true,
      message: 'Back subject cleared with evidence',
      data: await this.grades.clearBackSubject(
        id,
        dto,
        user.userId,
        user.roles,
      ),
    };
  }
}
