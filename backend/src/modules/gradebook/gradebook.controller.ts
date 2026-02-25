import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, RoleName } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdviserSectionGuard } from './guards/adviser-section.guard';
import { GradebookService } from './gradebook.service';
import { GradebookSyncService } from './gradebook-sync.service';
import { CreateGradebookDto } from './DTO/create-gradebook.dto';
import { CreateCategoryDto } from './DTO/create-category.dto';
import { UpdateCategoryDto } from './DTO/update-category.dto';
import { CreateItemDto } from './DTO/create-item.dto';
import { UpdateItemDto } from './DTO/update-item.dto';
import { RecordScoreDto } from './DTO/record-score.dto';
import { BulkRecordScoresDto } from './DTO/bulk-record-scores.dto';

@Controller('gradebook')
@UseGuards(RolesGuard)
export class GradebookController {
  constructor(
    private readonly gradebookService: GradebookService,
    private readonly syncService: GradebookSyncService,
  ) {}

  // ── Gradebook ─────────────────────────────────────────────────────────────

  @Post()
  @Roles(RoleName.Teacher, RoleName.Admin)
  createGradebook(
    @Body() dto: CreateGradebookDto,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.gradebookService.createGradebook(dto, user.userId, user.roles);
  }

  @Get(':id')
  @Roles(RoleName.Teacher, RoleName.Admin)
  getGradebook(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.gradebookService.getGradebook(id, user.userId, user.roles);
  }

  @Get('by-class/:classId')
  @Roles(RoleName.Teacher, RoleName.Admin)
  listForClass(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.gradebookService.listGradebooksForClass(
      classId,
      user.userId,
      user.roles,
    );
  }

  // ── Categories ────────────────────────────────────────────────────────────

  @Post(':id/categories')
  @Roles(RoleName.Teacher, RoleName.Admin)
  addCategory(
    @Param('id', ParseUUIDPipe) gradebookId: string,
    @Body() dto: CreateCategoryDto,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.gradebookService.addCategory(gradebookId, dto, user.userId, user.roles);
  }

  @Patch('categories/:categoryId')
  @Roles(RoleName.Teacher, RoleName.Admin)
  updateCategory(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.gradebookService.updateCategory(categoryId, dto, user.userId, user.roles);
  }

  @Delete('categories/:categoryId')
  @Roles(RoleName.Teacher, RoleName.Admin)
  deleteCategory(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.gradebookService.deleteCategory(categoryId, user.userId, user.roles);
  }

  // ── Items ─────────────────────────────────────────────────────────────────

  @Post(':id/items')
  @Roles(RoleName.Teacher, RoleName.Admin)
  addItem(
    @Param('id', ParseUUIDPipe) gradebookId: string,
    @Body() dto: CreateItemDto,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.gradebookService.addItem(gradebookId, dto, user.userId, user.roles);
  }

  @Patch('items/:itemId')
  @Roles(RoleName.Teacher, RoleName.Admin)
  updateItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateItemDto,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.gradebookService.updateItem(itemId, dto, user.userId, user.roles);
  }

  @Delete('items/:itemId')
  @Roles(RoleName.Teacher, RoleName.Admin)
  deleteItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.gradebookService.deleteItem(itemId, user.userId, user.roles);
  }

  // ── Scores ────────────────────────────────────────────────────────────────

  @Post('items/:itemId/scores')
  @Roles(RoleName.Teacher, RoleName.Admin)
  recordScore(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: RecordScoreDto,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.gradebookService.recordScore(itemId, dto, user.userId, user.roles);
  }

  @Post('items/:itemId/scores/bulk')
  @Roles(RoleName.Teacher, RoleName.Admin)
  bulkRecordScores(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: BulkRecordScoresDto,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.gradebookService.bulkRecordScores(itemId, dto, user.userId, user.roles);
  }

  @Post('items/:itemId/sync-scores')
  @Roles(RoleName.Teacher, RoleName.Admin)
  syncScores(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.gradebookService.syncScoresFromAssessment(itemId, user.userId, user.roles);
  }

  // ── Grades ────────────────────────────────────────────────────────────────

  @Get(':id/preview-grades')
  @Roles(RoleName.Teacher, RoleName.Admin)
  previewGrades(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.gradebookService.previewGrades(id, user.userId, user.roles);
  }

  @Post(':id/finalize')
  @Roles(RoleName.Teacher, RoleName.Admin)
  finalizeGradebook(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.gradebookService.finalizeGradebook(id, user.userId, user.roles);
  }

  @Get(':id/final-grades')
  @Roles(RoleName.Teacher, RoleName.Admin)
  getFinalGrades(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.gradebookService.getFinalGrades(id, user.userId, user.roles);
  }

  @Get(':gradebookId/final-grades/:studentId')
  @Roles(RoleName.Teacher, RoleName.Admin, RoleName.Student)
  getStudentGrade(
    @Param('gradebookId', ParseUUIDPipe) gradebookId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.gradebookService.getStudentGrade(
      gradebookId,
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
    return this.gradebookService.listAdviserSection(sectionId, user.userId, user.roles);
  }

  // ── Reports ───────────────────────────────────────────────────────────────

  @Get(':id/reports/class-average')
  @Roles(RoleName.Teacher, RoleName.Admin)
  classAverage(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.gradebookService.getClassAverage(id, user.userId, user.roles);
  }

  @Get(':id/reports/distribution')
  @Roles(RoleName.Teacher, RoleName.Admin)
  gradeDistribution(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.gradebookService.getGradeDistribution(id, user.userId, user.roles);
  }

  @Get(':id/reports/intervention')
  @Roles(RoleName.Teacher, RoleName.Admin)
  interventionList(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.gradebookService.getInterventionList(id, user.userId, user.roles);
  }
}
