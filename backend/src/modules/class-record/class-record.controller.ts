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
  generateClassRecord(
    @Body() dto: CreateClassRecordDto,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.classRecordService.generateClassRecord(
      dto,
      user.userId,
      user.roles,
    );
  }

  @Get(':id')
  @Roles(RoleName.Teacher, RoleName.Admin)
  getClassRecord(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.classRecordService.getClassRecord(id, user.userId, user.roles);
  }

  @Get('by-class/:classId')
  @Roles(RoleName.Teacher, RoleName.Admin)
  listForClass(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.classRecordService.listForClass(
      classId,
      user.userId,
      user.roles,
    );
  }

  // ── Spreadsheet ──────────────────────────────────────────────────────────

  @Get(':id/spreadsheet')
  @Roles(RoleName.Teacher, RoleName.Admin)
  getSpreadsheet(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.classRecordService.getSpreadsheet(
      id,
      user.userId,
      user.roles,
    );
  }

  // ── Scores ────────────────────────────────────────────────────────────────

  @Post('items/:itemId/scores')
  @Roles(RoleName.Teacher, RoleName.Admin)
  recordScore(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: RecordScoreDto,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.classRecordService.recordScore(
      itemId,
      dto,
      user.userId,
      user.roles,
    );
  }

  @Post('items/:itemId/scores/bulk')
  @Roles(RoleName.Teacher, RoleName.Admin)
  bulkRecordScores(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: BulkRecordScoresDto,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.classRecordService.bulkRecordScores(
      itemId,
      dto,
      user.userId,
      user.roles,
    );
  }

  @Post('items/:itemId/sync-scores')
  @Roles(RoleName.Teacher, RoleName.Admin)
  syncScores(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.classRecordService.syncScoresFromAssessment(
      itemId,
      user.userId,
      user.roles,
    );
  }

  // ── Grades ────────────────────────────────────────────────────────────────

  @Get(':id/preview-grades')
  @Roles(RoleName.Teacher, RoleName.Admin)
  previewGrades(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.classRecordService.previewGrades(id, user.userId, user.roles);
  }

  @Post(':id/finalize')
  @Roles(RoleName.Teacher, RoleName.Admin)
  finalizeClassRecord(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.classRecordService.finalizeClassRecord(
      id,
      user.userId,
      user.roles,
    );
  }

  @Get(':id/final-grades')
  @Roles(RoleName.Teacher, RoleName.Admin)
  getFinalGrades(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.classRecordService.getFinalGrades(
      id,
      user.userId,
      user.roles,
    );
  }

  @Get(':classRecordId/final-grades/:studentId')
  @Roles(RoleName.Teacher, RoleName.Admin, RoleName.Student)
  getStudentGrade(
    @Param('classRecordId', ParseUUIDPipe) classRecordId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.classRecordService.getStudentGrade(
      classRecordId,
      studentId,
      user.userId,
      user.roles,
    );
  }

  // ── Adviser Section View ──────────────────────────────────────────────────

  @Get('adviser/section/:sectionId')
  @Roles(RoleName.Admin, RoleName.Teacher)
  listAdviserSection(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.classRecordService.listAdviserSection(
      sectionId,
      user.userId,
      user.roles,
    );
  }

  // ── Reports ───────────────────────────────────────────────────────────────

  @Get(':id/reports/class-average')
  @Roles(RoleName.Teacher, RoleName.Admin)
  classAverage(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.classRecordService.getClassAverage(
      id,
      user.userId,
      user.roles,
    );
  }

  @Get(':id/reports/distribution')
  @Roles(RoleName.Teacher, RoleName.Admin)
  gradeDistribution(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.classRecordService.getGradeDistribution(
      id,
      user.userId,
      user.roles,
    );
  }

  @Get(':id/reports/intervention')
  @Roles(RoleName.Teacher, RoleName.Admin)
  interventionList(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.classRecordService.getInterventionList(
      id,
      user.userId,
      user.roles,
    );
  }
}
