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
import { RoleName, Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AcademicAuditService } from './academic-audit.service';
import { AcademicRepairService } from './academic-repair.service';
import { AcademicStateAlignmentService } from './academic-state-alignment.service';
import {
  AcademicRepairReasonDto,
  ClassifyAcademicSubjectDto,
  ExecuteAcademicStateAlignmentDto,
  PreviewAcademicStateAlignmentDto,
  RepairAcademicStateDto,
  RepairAssessmentPeriodDto,
  RepairWorkbookPolicyDto,
  RetireDuplicateClassDto,
} from './DTO/academic-maintenance.dto';

type Actor = { userId: string; roles: string[] };
@Controller('academic-state')
@UseGuards(RolesGuard)
@Roles(RoleName.Admin)
export class AcademicRepairController {
  constructor(
    private readonly audit: AcademicAuditService,
    private readonly repair: AcademicRepairService,
    private readonly alignment: AcademicStateAlignmentService,
  ) {}
  @Get('audit')
  async report(@Query('schoolYear') year?: string) {
    return {
      success: true,
      message: 'Read-only academic audit retrieved',
      data: await this.audit.report(year),
    };
  }
  @Post('repair/preserve-legacy')
  async preserveLegacy(
    @Body() dto: AcademicRepairReasonDto,
    @CurrentUser() user: Actor,
  ) {
    return {
      success: true,
      message: 'Legacy evidence preserved without certifying grades',
      data: await this.repair.preserveLegacy(
        dto.reason,
        user.userId,
        user.roles,
      ),
    };
  }
  @Post('repair/policies/:schoolYear/initialize')
  async initializePolicy(
    @Param('schoolYear') year: string,
    @Body() dto: AcademicRepairReasonDto,
    @CurrentUser() user: Actor,
  ) {
    return {
      success: true,
      message: 'School-year policy initialized',
      data: await this.repair.initializePolicy(
        year,
        dto.reason,
        user.userId,
        user.roles,
      ),
    };
  }
  @Post('repair/classes/:id/profile')
  async classify(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ClassifyAcademicSubjectDto,
    @CurrentUser() user: Actor,
  ) {
    return {
      success: true,
      message: 'Subject grading profile recorded',
      data: await this.repair.classifySubject(id, dto, user.userId, user.roles),
    };
  }
  @Post('repair/records/:id/exclude-historical-period')
  async exclude(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AcademicRepairReasonDto,
    @CurrentUser() user: Actor,
  ) {
    return {
      success: true,
      message: 'Incompatible historical period preserved separately',
      data: await this.repair.excludeHistoricalPeriod(
        id,
        dto.reason,
        user.userId,
        user.roles,
      ),
    };
  }
  @Post('repair/classes/:id/retire-duplicate')
  async retireDuplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RetireDuplicateClassDto,
    @CurrentUser() user: Actor,
  ) {
    return {
      success: true,
      message: 'Duplicate class retired with evidence retained',
      data: await this.repair.retireDuplicateClass(
        id,
        dto,
        user.userId,
        user.roles,
      ),
    };
  }
  @Post('repair/records/:id/policy')
  async workbookPolicy(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RepairWorkbookPolicyDto,
    @CurrentUser() user: Actor,
  ) {
    return {
      success: true,
      message: 'Workbook policy repaired without changing score values',
      data: await this.repair.repairWorkbookPolicy(
        id,
        dto,
        user.userId,
        user.roles,
      ),
    };
  }
  @Post('repair/assessments/:id/exclude-historical-period')
  async excludeAssessment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AcademicRepairReasonDto,
    @CurrentUser() user: Actor,
  ) {
    return {
      success: true,
      message: 'Historical assessment period preserved without moving results',
      data: await this.repair.excludeHistoricalAssessment(
        id,
        dto.reason,
        user.userId,
        user.roles,
      ),
    };
  }
  @Post('repair/assessments/:id/period')
  async assessmentPeriod(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RepairAssessmentPeriodDto,
    @CurrentUser() user: Actor,
  ) {
    return {
      success: true,
      message: 'Assessment period repaired with evidence retained',
      data: await this.repair.repairAssessmentPeriod(
        id,
        dto,
        user.userId,
        user.roles,
      ),
    };
  }
  @Post('repair/state')
  async state(@Body() dto: RepairAcademicStateDto, @CurrentUser() user: Actor) {
    return {
      success: true,
      message: 'Authoritative academic state reconciled',
      data: await this.repair.repairState(dto, user.userId, user.roles),
    };
  }

  @Post('repair/state-alignment/preview')
  async previewStateAlignment(@Body() dto: PreviewAcademicStateAlignmentDto) {
    return {
      success: true,
      message: 'Academic state alignment preview generated',
      data: await this.alignment.preview(dto),
    };
  }

  @Post('repair/state-alignment')
  async executeStateAlignment(
    @Body() dto: ExecuteAcademicStateAlignmentDto,
    @CurrentUser() user: Actor,
  ) {
    return {
      success: true,
      message: 'Academic state alignment repaired',
      data: await this.alignment.execute(dto, user.userId, user.roles),
    };
  }
}
