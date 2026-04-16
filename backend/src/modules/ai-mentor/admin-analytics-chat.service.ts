import { ForbiddenException, Injectable } from '@nestjs/common';
import { AiProxyService } from './ai-proxy.service';
import { AuditService } from '../audit/audit.service';
import { AdminService } from '../admin/admin.service';
import { ReportsService } from '../reports/reports.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { PerformanceService } from '../performance/performance.service';
import { LxpService } from '../lxp/lxp.service';
import { AdminAnalyticsChatRequestDto } from './DTO/admin-chat.dto';

type AuthUser = {
  id: string;
  email: string;
  roles: string[];
};

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
    return this.trimRows(rows, 12).map((row) => ({
      id: row.id,
      targetModule: row.targetModule,
      feedback: row.feedback ?? null,
      createdAt:
        row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : (row.createdAt ?? null),
    }));
  }

  async buildScopedAnalyticsContext(user: AuthUser) {
    this.assertAdmin(user);

    const [
      overview,
      auditLogs,
      studentPerformance,
      assessmentSummary,
      interventionParticipation,
      systemUsage,
      analyticsOverview,
      performanceAnalytics,
      evaluations,
    ] = await Promise.all([
      this.adminService.getDashboardOverview(),
      this.adminService.getAuditLogs({ limit: 10, page: 1 }),
      this.reportsService.getStudentPerformance({ limit: 12 }),
      this.reportsService.getAssessmentSummary({ limit: 12 }),
      this.reportsService.getInterventionParticipation({ limit: 12 }),
      this.reportsService.getSystemUsage({}),
      this.analyticsService.getAdminOverview(),
      this.getPerformanceAnalytics(user),
      this.lxpService.listSystemEvaluations(
        { userId: user.id, roles: user.roles },
        {},
      ),
    ]);

    return {
      requestedBy: {
        id: user.id,
        email: user.email,
        roles: user.roles,
      },
      fetchedAt: new Date().toISOString(),
      overview,
      audit: {
        total: auditLogs.total,
        rows: this.trimRows(auditLogs.data, 10),
      },
      reports: {
        studentPerformance: {
          filters: studentPerformance.filters,
          generatedAt: studentPerformance.generatedAt,
          rows: this.trimRows(studentPerformance.data, 12),
        },
        assessmentSummary: {
          filters: assessmentSummary.filters,
          generatedAt: assessmentSummary.generatedAt,
          rows: this.trimRows(assessmentSummary.data, 12),
        },
        interventionParticipation: {
          filters: interventionParticipation.filters,
          generatedAt: interventionParticipation.generatedAt,
          rows: this.trimRows(interventionParticipation.data, 12),
        },
        systemUsage: {
          filters: systemUsage.filters,
          generatedAt: systemUsage.generatedAt,
          data: systemUsage.data,
        },
      },
      analytics: analyticsOverview,
      performance: {
        conceptMasterySnapshots: this.trimRows(
          performanceAnalytics.conceptMasterySnapshots,
          20,
        ),
        recommendationHistory: this.trimRows(
          performanceAnalytics.recommendationHistory,
          20,
        ),
        performanceLogTransitions: {
          total: performanceAnalytics.performanceLogTransitions.total,
          summary: performanceAnalytics.performanceLogTransitions.summary,
          rows: this.trimRows(
            performanceAnalytics.performanceLogTransitions.rows,
            20,
          ),
        },
      },
      evaluations: {
        count: evaluations.count,
        summary: evaluations.summary,
        rows: this.toEvaluationRows(evaluations.rows),
      },
    };
  }

  async chat(user: AuthUser, dto: AdminAnalyticsChatRequestDto) {
    this.assertAdmin(user);
    const context = await this.buildScopedAnalyticsContext(user);

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
