import { ForbiddenException, Injectable } from '@nestjs/common';
import { AiProxyService } from './ai-proxy.service';
import { AuditService } from '../audit/audit.service';
import { AdminService } from '../admin/admin.service';
import { ReportsService } from '../reports/reports.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { PerformanceService } from '../performance/performance.service';
import { LxpService } from '../lxp/lxp.service';
import { AcademicPolicyService } from '../academic-state/academic-policy.service';
import type { ReportQuery } from '../reports/dto/report-query.dto';
import {
  AdminAnalyticsChatRequestDto,
  AdminAnalyticsSessionUpdateDto,
  AdminAssistantScopeDto,
} from './DTO/admin-chat.dto';
import {
  AdminAssistantSourceKey,
  selectAdminAssistantSources,
} from './admin-assistant-source-selector';

type AuthUser = {
  id: string;
  email: string;
  roles: string[];
};

type AdminAssistantProvenance = {
  source: string;
  label: string;
  href: string;
  fetchedAt: string;
  filters: Record<string, unknown>;
  recordCount: number;
  total: number | null;
  truncated: boolean;
};

type SourceResult = {
  key: AdminAssistantSourceKey;
  value: unknown;
  provenance: AdminAssistantProvenance;
};

const REPORT_ROW_LIMIT = 25;

@Injectable()
export class AdminAnalyticsChatService {
  constructor(
    private readonly proxy: AiProxyService,
    private readonly auditService: AuditService,
    private readonly adminService: AdminService,
    private readonly reportsService: ReportsService,
    private readonly analyticsService: AnalyticsService,
    private readonly performanceService: PerformanceService,
    private readonly lxpService: LxpService,
    private readonly academicPolicyService: AcademicPolicyService,
  ) {}

  private isAdmin(roles: string[] | undefined) {
    return Array.isArray(roles) && roles.includes('admin');
  }

  private assertAdmin(user: AuthUser) {
    if (!this.isAdmin(user.roles)) {
      throw new ForbiddenException(
        'Admin analytics chat is restricted to admin accounts.',
      );
    }
  }

  private trimRows<T>(rows: T[] | undefined, limit = 10) {
    return Array.isArray(rows) ? rows.slice(0, limit) : [];
  }

  private async getPerformanceAnalytics(user: AuthUser) {
    const performanceService = this.performanceService as PerformanceService & {
      getAdminAnalyticsSnapshot?: () => Promise<{
        conceptMasterySnapshots: unknown[];
        recommendationHistory: unknown[];
        performanceLogTransitions: {
          total: number;
          summary: Record<string, number>;
          rows: unknown[];
        };
      }>;
    };

    if (typeof performanceService.getAdminAnalyticsSnapshot === 'function') {
      return performanceService.getAdminAnalyticsSnapshot();
    }

    return this.performanceService.getAdminAnalytics(user.id, user.roles);
  }

  private toEvaluationRows(
    rows:
      | Array<{
          id: string;
          targetModule: string;
          feedback?: string | null;
          createdAt?: Date | string;
        }>
      | undefined,
  ) {
    return this.trimRows(rows, REPORT_ROW_LIMIT).map((row) => ({
      id: row.id,
      targetModule: row.targetModule,
      feedback: row.feedback ?? null,
      createdAt:
        row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : (row.createdAt ?? null),
    }));
  }

  private resolveScopeDates(
    timeRange: NonNullable<AdminAssistantScopeDto['timeRange']>,
    now: Date,
  ) {
    if (timeRange !== 'last_7_days' && timeRange !== 'last_30_days') {
      return {};
    }

    const days = timeRange === 'last_7_days' ? 7 : 30;
    const dateFrom = new Date(now);
    dateFrom.setUTCDate(dateFrom.getUTCDate() - days);
    return { dateFrom, dateTo: now };
  }

  private buildReportQuery(
    scope: AdminAssistantScopeDto,
    currentPeriod: 'Q1' | 'Q2' | 'Q3' | 'Q4',
    now: Date,
  ): ReportQuery {
    const timeRange = scope.timeRange ?? 'current_period';
    return {
      ...(scope.classId ? { classId: scope.classId } : {}),
      ...(scope.sectionId ? { sectionId: scope.sectionId } : {}),
      ...(scope.studentId ? { studentId: scope.studentId } : {}),
      ...(scope.teacherId ? { teacherId: scope.teacherId } : {}),
      ...(timeRange === 'current_period'
        ? { gradingPeriod: currentPeriod }
        : this.resolveScopeDates(timeRange, now)),
    };
  }

  private provenance(
    source: string,
    label: string,
    href: string,
    fetchedAt: string,
    filters: object,
    recordCount: number,
    total: number | null,
  ): AdminAssistantProvenance {
    return {
      source,
      label,
      href,
      fetchedAt,
      filters: { ...filters },
      recordCount,
      total,
      truncated: total !== null && total > recordCount,
    };
  }

  private async loadSource(
    source: AdminAssistantSourceKey,
    user: AuthUser,
    query: ReportQuery,
    fetchedAt: string,
  ): Promise<SourceResult> {
    switch (source) {
      case 'overview': {
        const value = await this.adminService.getDashboardOverview();
        return {
          key: source,
          value,
          provenance: this.provenance(
            'admin-dashboard-overview',
            'Admin dashboard overview',
            '/dashboard/admin',
            value.fetchedAt ?? fetchedAt,
            {},
            1,
            1,
          ),
        };
      }
      case 'audit': {
        const auditQuery = {
          ...('dateFrom' in query ? { dateFrom: query.dateFrom } : {}),
          ...('dateTo' in query ? { dateTo: query.dateTo } : {}),
          page: 1,
          limit: REPORT_ROW_LIMIT,
        };
        const value = await this.adminService.getAuditLogs(auditQuery);
        const rows = this.trimRows(value.data, REPORT_ROW_LIMIT);
        return {
          key: source,
          value: { total: value.total, rows },
          provenance: this.provenance(
            'audit-log',
            'Audit trail',
            '/dashboard/admin/audit',
            fetchedAt,
            auditQuery,
            rows.length,
            value.total,
          ),
        };
      }
      case 'studentPerformance': {
        const reportQuery = { ...query, page: 1, limit: REPORT_ROW_LIMIT };
        const value =
          await this.reportsService.getStudentPerformance(reportQuery);
        const rows = this.trimRows(value.data, REPORT_ROW_LIMIT);
        return {
          key: source,
          value: {
            filters: value.filters,
            generatedAt: value.generatedAt,
            total: value.total,
            rows,
          },
          provenance: this.provenance(
            'student-performance-report',
            'Student performance report',
            '/dashboard/admin/reports',
            value.generatedAt,
            value.filters,
            rows.length,
            value.total,
          ),
        };
      }
      case 'assessmentSummary': {
        const reportQuery = { ...query, limit: REPORT_ROW_LIMIT };
        const value =
          await this.reportsService.getAssessmentSummary(reportQuery);
        const rows = this.trimRows(value.data, REPORT_ROW_LIMIT);
        return {
          key: source,
          value: {
            filters: value.filters,
            generatedAt: value.generatedAt,
            total: rows.length,
            rows,
          },
          provenance: this.provenance(
            'assessment-summary-report',
            'Assessment summary report',
            '/dashboard/admin/reports',
            value.generatedAt,
            value.filters,
            rows.length,
            rows.length,
          ),
        };
      }
      case 'interventionParticipation': {
        const reportQuery = { ...query, page: 1, limit: REPORT_ROW_LIMIT };
        const value =
          await this.reportsService.getInterventionParticipation(reportQuery);
        const rows = this.trimRows(value.data, REPORT_ROW_LIMIT);
        return {
          key: source,
          value: {
            filters: value.filters,
            generatedAt: value.generatedAt,
            total: value.total,
            rows,
          },
          provenance: this.provenance(
            'intervention-participation-report',
            'Intervention participation report',
            '/dashboard/admin/reports',
            value.generatedAt,
            value.filters,
            rows.length,
            value.total,
          ),
        };
      }
      case 'systemUsage': {
        const value = await this.reportsService.getSystemUsage(query);
        return {
          key: source,
          value: {
            filters: value.filters,
            generatedAt: value.generatedAt,
            data: value.data,
          },
          provenance: this.provenance(
            'system-usage-report',
            'System usage report',
            '/dashboard/admin/reports',
            value.generatedAt,
            value.filters,
            Object.keys(value.data ?? {}).length,
            null,
          ),
        };
      }
      case 'analytics': {
        const value = await this.analyticsService.getAdminOverview();
        return {
          key: source,
          value,
          provenance: this.provenance(
            'admin-overview-analytics',
            'Admin analytics overview',
            '/dashboard/admin',
            fetchedAt,
            {},
            1,
            1,
          ),
        };
      }
      case 'performance': {
        const value = await this.getPerformanceAnalytics(user);
        const conceptMasterySnapshots = this.trimRows(
          value.conceptMasterySnapshots,
          REPORT_ROW_LIMIT,
        );
        const recommendationHistory = this.trimRows(
          value.recommendationHistory,
          REPORT_ROW_LIMIT,
        );
        const transitionRows = this.trimRows(
          value.performanceLogTransitions.rows,
          REPORT_ROW_LIMIT,
        );
        const recordCount =
          conceptMasterySnapshots.length +
          recommendationHistory.length +
          transitionRows.length;
        const total =
          conceptMasterySnapshots.length +
          recommendationHistory.length +
          value.performanceLogTransitions.total;
        return {
          key: source,
          value: {
            conceptMasterySnapshots,
            recommendationHistory,
            performanceLogTransitions: {
              total: value.performanceLogTransitions.total,
              summary: value.performanceLogTransitions.summary,
              rows: transitionRows,
            },
          },
          provenance: this.provenance(
            'performance-admin-analytics',
            'Performance analytics',
            '/dashboard/admin/reports',
            fetchedAt,
            query,
            recordCount,
            total,
          ),
        };
      }
      case 'evaluations': {
        const evaluationQuery = {
          ...(query.classId ? { aiClassId: query.classId } : {}),
          ...(query.dateFrom ? { from: query.dateFrom.toISOString() } : {}),
          ...(query.dateTo ? { to: query.dateTo.toISOString() } : {}),
        };
        const value = await this.lxpService.listSystemEvaluations(
          { userId: user.id, roles: user.roles },
          evaluationQuery,
        );
        const rows = this.toEvaluationRows(value.rows);
        return {
          key: source,
          value: { count: value.count, summary: value.summary, rows },
          provenance: this.provenance(
            'system-evaluations',
            'System evaluations',
            '/dashboard/admin/evaluations',
            fetchedAt,
            evaluationQuery,
            rows.length,
            value.count,
          ),
        };
      }
    }
  }

  async buildScopedAnalyticsContext(
    user: AuthUser,
    message: string,
    requestedScope: AdminAssistantScopeDto = {},
  ) {
    this.assertAdmin(user);

    const currentAcademicState =
      await this.academicPolicyService.currentState();
    const now = new Date();
    const fetchedAt = now.toISOString();
    const timeRange = requestedScope.timeRange ?? 'current_period';
    const currentPeriod = currentAcademicState.quarter;
    const periodLabel =
      currentAcademicState.periods.find(
        (period) => period.key === currentPeriod,
      )?.label ?? currentPeriod;
    const query = this.buildReportQuery(requestedScope, currentPeriod, now);
    const selectedSources = selectAdminAssistantSources(message);
    const results = await Promise.all(
      selectedSources.map((source) =>
        this.loadSource(source, user, query, fetchedAt),
      ),
    );

    const context: Record<string, unknown> = {
      requestedBy: {
        id: user.id,
        email: user.email,
        roles: user.roles,
      },
      fetchedAt,
      selectedSources,
      scope: {
        timeRange,
        schoolYear: currentAcademicState.schoolYear,
        gradingPeriod: currentPeriod,
        periodLabel,
        ...requestedScope,
      },
      provenance: results.map((result) => result.provenance),
    };

    const reports: Record<string, unknown> = {};
    for (const result of results) {
      if (
        result.key === 'studentPerformance' ||
        result.key === 'assessmentSummary' ||
        result.key === 'interventionParticipation' ||
        result.key === 'systemUsage'
      ) {
        reports[result.key] = result.value;
      } else {
        context[result.key] = result.value;
      }
    }
    if (Object.keys(reports).length > 0) {
      context.reports = reports;
    }

    return context;
  }

  async chat(user: AuthUser, dto: AdminAnalyticsChatRequestDto) {
    this.assertAdmin(user);
    const context = await this.buildScopedAnalyticsContext(
      user,
      dto.message,
      dto.scope,
    );

    return this.proxy.forward('POST', '/admin/chat', user, {
      message: dto.message,
      sessionId: dto.sessionId,
      context,
    });
  }

  async history(user: AuthUser) {
    this.assertAdmin(user);
    return this.proxy.forward('GET', '/admin/history', user);
  }

  async getSession(user: AuthUser, sessionId: string) {
    this.assertAdmin(user);
    return this.proxy.forward('GET', `/admin/sessions/${sessionId}`, user);
  }

  async renameSession(
    user: AuthUser,
    sessionId: string,
    dto: AdminAnalyticsSessionUpdateDto,
  ) {
    this.assertAdmin(user);
    const result = await this.proxy.forward(
      'PATCH',
      `/admin/sessions/${sessionId}`,
      user,
      { title: dto.title.trim() },
    );
    await this.auditService.log({
      actorId: user.id,
      action: 'admin_ai_session_renamed',
      targetType: 'ai_admin_chat',
      targetId: sessionId,
      metadata: { occurredAt: new Date().toISOString() },
    });
    return result;
  }

  async deleteSession(user: AuthUser, sessionId: string) {
    this.assertAdmin(user);
    const result = await this.proxy.forward(
      'DELETE',
      `/admin/sessions/${sessionId}`,
      user,
    );
    await this.auditService.log({
      actorId: user.id,
      action: 'admin_ai_session_deleted',
      targetType: 'ai_admin_chat',
      targetId: sessionId,
      metadata: { occurredAt: new Date().toISOString() },
    });
    return result;
  }

  async logDeniedAttempt(user: AuthUser, route: string) {
    await this.auditService.log({
      actorId: user.id,
      action: 'admin_ai_access_denied',
      targetType: 'ai_admin_chat',
      targetId: user.id,
      metadata: {
        attemptedRoute: route,
        roles: user.roles,
        reason: 'admin_ai_access_denied',
        occurredAt: new Date().toISOString(),
      },
    });
  }
}
