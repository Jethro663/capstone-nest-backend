import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth } from '@nestjs/swagger';
import { parseDateQuery } from '../../common/utils/parse-date-query.util';
import { parsePositiveIntQuery } from '../../common/utils/parse-positive-int-query.util';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles, RoleName } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuditService } from '../audit/audit.service';
import type { ReportQuery } from './dto/report-query.dto';
import { ReportsService } from './reports.service';

type AuthUser = { userId: string; roles: string[] };

@ApiBearerAuth('token')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly auditService: AuditService,
  ) {}

  private buildQuery(
    query: {
    classId?: string;
    sectionId?: string;
    gradingPeriod?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    studentId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
    limit?: string;
      export?: 'csv';
    },
    user: AuthUser,
  ): ReportQuery {
    const isAdmin = user.roles.includes(RoleName.Admin);
    const isTeacherOnly = user.roles.includes(RoleName.Teacher) && !isAdmin;

    return {
      classId: query.classId,
      sectionId: query.sectionId,
      gradingPeriod: query.gradingPeriod,
      studentId: query.studentId,
      teacherId: isTeacherOnly ? user.userId : undefined,
      dateFrom: parseDateQuery(query.dateFrom, 'dateFrom'),
      dateTo: parseDateQuery(query.dateTo, 'dateTo'),
      page: parsePositiveIntQuery(query.page, 'page'),
      limit: parsePositiveIntQuery(query.limit, 'limit'),
      export: query.export,
    };
  }

  private toExportAuditFilters(filters: ReportQuery) {
    return {
      classId: filters.classId,
      sectionId: filters.sectionId,
      gradingPeriod: filters.gradingPeriod,
      studentId: filters.studentId,
      dateFrom: filters.dateFrom?.toISOString() ?? null,
      dateTo: filters.dateTo?.toISOString() ?? null,
      page: filters.page ?? null,
      limit: filters.limit ?? null,
    };
  }

  private async sendCsvIfRequested(
    res: Response,
    exportFormat: 'csv' | undefined,
    user: AuthUser,
    reportKey: string,
    filters: ReportQuery,
    fileName: string,
    csv: string,
  ) {
    if (exportFormat !== 'csv') return false;

    await this.auditService.log({
      actorId: user.userId,
      action: 'reports.exported',
      targetType: 'report',
      targetId: reportKey,
      metadata: {
        exportFormat: 'csv',
        filters: this.toExportAuditFilters(filters),
      },
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(csv);
    return true;
  }

  @Get('student-master-list')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async getStudentMasterList(
    @Query() query: any,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const reportQuery = this.buildQuery(query, user);
    const result = await this.reportsService.getStudentMasterList(reportQuery);

    if (
      await this.sendCsvIfRequested(
        res,
        query.export,
        user,
        'student-master-list',
        reportQuery,
        'student-master-list.csv',
        result.csv,
      )
    )
      return;

    return res.json({ success: true, ...result });
  }

  @Get('class-enrollment')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async getClassEnrollment(
    @Query() query: any,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const reportQuery = this.buildQuery(query, user);
    const result = await this.reportsService.getClassEnrollment(reportQuery);

    if (
      await this.sendCsvIfRequested(
        res,
        query.export,
        user,
        'class-enrollment',
        reportQuery,
        'class-enrollment.csv',
        result.csv,
      )
    )
      return;

    return res.json({ success: true, ...result });
  }

  @Get('student-performance')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async getStudentPerformance(
    @Query() query: any,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const reportQuery = this.buildQuery(query, user);
    const result = await this.reportsService.getStudentPerformance(reportQuery);

    if (
      await this.sendCsvIfRequested(
        res,
        query.export,
        user,
        'student-performance',
        reportQuery,
        'student-performance.csv',
        result.csv,
      )
    )
      return;

    return res.json({ success: true, ...result });
  }

  @Get('intervention-participation')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async getInterventionParticipation(
    @Query() query: any,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const reportQuery = this.buildQuery(query, user);
    const result = await this.reportsService.getInterventionParticipation(
      reportQuery,
    );

    if (
      await this.sendCsvIfRequested(
        res,
        query.export,
        user,
        'intervention-participation',
        reportQuery,
        'intervention-participation.csv',
        result.csv,
      )
    )
      return;

    return res.json({ success: true, ...result });
  }

  @Get('assessment-summary')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async getAssessmentSummary(
    @Query() query: any,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const reportQuery = this.buildQuery(query, user);
    const result = await this.reportsService.getAssessmentSummary(reportQuery);

    if (
      await this.sendCsvIfRequested(
        res,
        query.export,
        user,
        'assessment-summary',
        reportQuery,
        'assessment-summary.csv',
        result.csv,
      )
    )
      return;

    return res.json({ success: true, ...result });
  }

  @Get('system-usage')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async getSystemUsage(
    @Query() query: any,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const reportQuery = this.buildQuery(query, user);
    const result = await this.reportsService.getSystemUsage(reportQuery);

    if (
      await this.sendCsvIfRequested(
        res,
        query.export,
        user,
        'system-usage',
        reportQuery,
        'system-usage.csv',
        result.csv,
      )
    )
      return;

    return res.json({ success: true, ...result });
  }
}
