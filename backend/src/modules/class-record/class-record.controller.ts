import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, RoleName } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClassRecordService } from './class-record.service';
import { ClassRecordSyncService } from './class-record-sync.service';
import { CreateClassRecordDto } from './DTO/create-class-record.dto';
import { RecordScoreDto } from './DTO/record-score.dto';
import { BulkRecordScoresDto } from './DTO/bulk-record-scores.dto';

@Controller('class-record')
@UseGuards(RolesGuard)
export class ClassRecordController {
  constructor(
    private readonly classRecordService: ClassRecordService,
    private readonly syncService: ClassRecordSyncService,
  ) {}

  // ── Class Record ─────────────────────────────────────────────────────────

  @Post()
  @Roles(RoleName.Teacher, RoleName.Admin)
  async generateClassRecord(
    @Body() dto: CreateClassRecordDto,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.classRecordService.generateClassRecord(
      dto,
      user.userId,
      user.roles,
    );
    return { success: true, data };
  }

  @Get(':id')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async getClassRecord(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.classRecordService.getClassRecord(
      id,
      user.userId,
      user.roles,
    );
    return { success: true, data };
  }

  @Get('by-class/:classId')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async listForClass(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.classRecordService.listForClass(
      classId,
      user.userId,
      user.roles,
    );
    return { success: true, data };
  }

  // ── Spreadsheet ──────────────────────────────────────────────────────────

  @Get(':id/spreadsheet')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async getSpreadsheet(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.classRecordService.getSpreadsheet(
      id,
      user.userId,
      user.roles,
    );
    return { success: true, data };
  }

  // ── Scores ────────────────────────────────────────────────────────────────

  @Post('items/:itemId/scores')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async recordScore(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: RecordScoreDto,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.classRecordService.recordScore(
      itemId,
      dto,
      user.userId,
      user.roles,
    );
    return { success: true, data };
  }

  @Post('items/:itemId/scores/bulk')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async bulkRecordScores(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: BulkRecordScoresDto,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.classRecordService.bulkRecordScores(
      itemId,
      dto,
      user.userId,
      user.roles,
    );
    return { success: true, data };
  }

  @Post('items/:itemId/sync-scores')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async syncScores(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.classRecordService.syncScoresFromAssessment(
      itemId,
      user.userId,
      user.roles,
    );
    return { success: true, data };
  }

  // ── Grades ────────────────────────────────────────────────────────────────

  @Get(':id/preview-grades')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async previewGrades(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.classRecordService.previewGrades(
      id,
      user.userId,
      user.roles,
    );
    return { success: true, data };
  }

  @Post(':id/finalize')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async finalizeClassRecord(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.classRecordService.finalizeClassRecord(
      id,
      user.userId,
      user.roles,
    );
    return { success: true, data };
  }

  @Get(':id/final-grades')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async getFinalGrades(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.classRecordService.getFinalGrades(
      id,
      user.userId,
      user.roles,
    );
    return { success: true, data };
  }

  @Get(':classRecordId/final-grades/:studentId')
  @Roles(RoleName.Teacher, RoleName.Admin, RoleName.Student)
  async getStudentGrade(
    @Param('classRecordId', ParseUUIDPipe) classRecordId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.classRecordService.getStudentGrade(
      classRecordId,
      studentId,
      user.userId,
      user.roles,
    );
    return { success: true, data };
  }

  // ── Adviser Section View ──────────────────────────────────────────────────

  @Get('adviser/section/:sectionId')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async listAdviserSection(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.classRecordService.listAdviserSection(
      sectionId,
      user.userId,
      user.roles,
    );
    return { success: true, data };
  }

  // ── Reports ───────────────────────────────────────────────────────────────

  @Get(':id/reports/class-average')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async classAverage(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.classRecordService.getClassAverage(
      id,
      user.userId,
      user.roles,
    );
    return { success: true, data };
  }

  @Get(':id/reports/distribution')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async gradeDistribution(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.classRecordService.getGradeDistribution(
      id,
      user.userId,
      user.roles,
    );
    return { success: true, data };
  }

  @Get(':id/reports/intervention')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async interventionList(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.classRecordService.getInterventionList(
      id,
      user.userId,
      user.roles,
    );
    return { success: true, data };
  }
}
