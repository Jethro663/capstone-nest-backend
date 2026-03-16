import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth } from '@nestjs/swagger';
import { parseDateQuery } from '../../common/utils/parse-date-query.util';
import { parsePositiveIntQuery } from '../../common/utils/parse-positive-int-query.util';
import { Roles, RoleName } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ReportsService } from './reports.service';

@ApiBearerAuth('token')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  private buildQuery(query: {
    classId?: string;
    sectionId?: string;
    gradingPeriod?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    studentId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
    limit?: string;
    export?: 'csv';
  }) {
    return {
      classId: query.classId,
      sectionId: query.sectionId,
      gradingPeriod: query.gradingPeriod,
      studentId: query.studentId,
      dateFrom: parseDateQuery(query.dateFrom, 'dateFrom'),
      dateTo: parseDateQuery(query.dateTo, 'dateTo'),
      page: parsePositiveIntQuery(query.page, 'page'),
      limit: parsePositiveIntQuery(query.limit, 'limit'),
      export: query.export,
    };
  }

  private sendCsvIfRequested(
    res: Response,
    exportFormat: 'csv' | undefined,
    fileName: string,
    csv: string,
  ) {
    if (exportFormat !== 'csv') return false;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(csv);
    return true;
  }

  @Get('student-master-list')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async getStudentMasterList(@Query() query: any, @Res() res: Response) {
    const result = await this.reportsService.getStudentMasterList(
      this.buildQuery(query),
    );

    if (
      this.sendCsvIfRequested(
        res,
        query.export,
        'student-master-list.csv',
        result.csv,
      )
    )
      return;

    return res.json({ success: true, ...result });
  }

  @Get('class-enrollment')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async getClassEnrollment(@Query() query: any, @Res() res: Response) {
    const result = await this.reportsService.getClassEnrollment(
      this.buildQuery(query),
    );

    if (
      this.sendCsvIfRequested(
        res,
        query.export,
        'class-enrollment.csv',
        result.csv,
      )
    )
      return;

    return res.json({ success: true, ...result });
  }

  @Get('student-performance')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async getStudentPerformance(@Query() query: any, @Res() res: Response) {
    const result = await this.reportsService.getStudentPerformance(
      this.buildQuery(query),
    );

    if (
      this.sendCsvIfRequested(
        res,
        query.export,
        'student-performance.csv',
        result.csv,
      )
    )
      return;

    return res.json({ success: true, ...result });
  }

  @Get('intervention-participation')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async getInterventionParticipation(@Query() query: any, @Res() res: Response) {
    const result = await this.reportsService.getInterventionParticipation(
      this.buildQuery(query),
    );

    if (
      this.sendCsvIfRequested(
        res,
        query.export,
        'intervention-participation.csv',
        result.csv,
      )
    )
      return;

    return res.json({ success: true, ...result });
  }

  @Get('assessment-summary')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async getAssessmentSummary(@Query() query: any, @Res() res: Response) {
    const result = await this.reportsService.getAssessmentSummary(
      this.buildQuery(query),
    );

    if (
      this.sendCsvIfRequested(
        res,
        query.export,
        'assessment-summary.csv',
        result.csv,
      )
    )
      return;

    return res.json({ success: true, ...result });
  }

  @Get('system-usage')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async getSystemUsage(@Query() query: any, @Res() res: Response) {
    const result = await this.reportsService.getSystemUsage(
      this.buildQuery(query),
    );

    if (
      this.sendCsvIfRequested(
        res,
        query.export,
        'system-usage.csv',
        result.csv,
      )
    )
      return;

    return res.json({ success: true, ...result });
  }
}
