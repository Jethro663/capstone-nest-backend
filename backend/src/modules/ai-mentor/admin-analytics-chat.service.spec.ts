import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminAnalyticsChatService } from './admin-analytics-chat.service';
import { AiProxyService } from './ai-proxy.service';
import { AuditService } from '../audit/audit.service';
import { AdminService } from '../admin/admin.service';
import { ReportsService } from '../reports/reports.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { PerformanceService } from '../performance/performance.service';
import { LxpService } from '../lxp/lxp.service';

const ADMIN_USER = {
  id: 'admin-1',
  email: 'admin@school.edu',
  roles: ['admin'],
};

describe('AdminAnalyticsChatService', () => {
  let service: AdminAnalyticsChatService;

  const mockProxy = { forward: jest.fn() };
  const mockAudit = { log: jest.fn() };
  const mockAdminService = {
    getDashboardOverview: jest.fn(),
    getAuditLogs: jest.fn(),
    getUsageSummary: jest.fn(),
  };
  const mockReportsService = {
    getStudentPerformance: jest.fn(),
    getAssessmentSummary: jest.fn(),
    getInterventionParticipation: jest.fn(),
    getSystemUsage: jest.fn(),
  };
  const mockAnalyticsService = {
    getAdminOverview: jest.fn(),
  };
  const mockPerformanceService = {
    getAdminAnalytics: jest.fn(),
  };
  const mockLxpService = {
    listSystemEvaluations: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockAudit.log.mockResolvedValue(undefined);
    mockAdminService.getDashboardOverview.mockResolvedValue({
      stats: { totalUsers: 12, activeClasses: 4 },
      usageSummary: { topActions: [] },
      analyticsOverview: { totals: { atRiskStudents: 2 } },
      readiness: { ready: true },
      fetchedAt: '2026-04-13T00:00:00.000Z',
    });
    mockAdminService.getAuditLogs.mockResolvedValue({
      data: [
        {
          id: 'audit-1',
          action: 'reports.exported',
          targetType: 'report',
          targetId: 'student-performance',
          createdAt: '2026-04-13T00:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });
    mockReportsService.getStudentPerformance.mockResolvedValue({
      data: [
        {
          classId: 'class-1',
          subjectCode: 'MATH-7',
          blendedScore: 72,
          isAtRisk: true,
        },
      ],
      filters: {},
      generatedAt: '2026-04-13T00:00:00.000Z',
    });
    mockReportsService.getAssessmentSummary.mockResolvedValue({
      data: [
        {
          id: 'assessment-1',
          title: 'Quarter 1 Quiz',
          subjectCode: 'MATH-7',
          averageScore: 78,
        },
      ],
      filters: {},
      generatedAt: '2026-04-13T00:00:00.000Z',
    });
    mockReportsService.getInterventionParticipation.mockResolvedValue({
      data: [],
      filters: {},
      generatedAt: '2026-04-13T00:00:00.000Z',
    });
    mockReportsService.getSystemUsage.mockResolvedValue({
      data: {
        lessonCompletions: 4,
        assessmentSubmissions: 9,
        interventionOpens: 2,
        interventionClosures: 1,
        topActions: [{ action: 'reports.exported', total: 3 }],
      },
      filters: {},
      generatedAt: '2026-04-13T00:00:00.000Z',
    });
    mockAnalyticsService.getAdminOverview.mockResolvedValue({
      totals: {
        teachers: 3,
        students: 8,
        classes: 5,
        activeInterventions: 1,
        atRiskStudents: 2,
      },
      action: 'Monitor interventions',
    });
    mockPerformanceService.getAdminAnalytics.mockResolvedValue({
      conceptMasterySnapshots: [],
      recommendationHistory: [],
      performanceLogTransitions: {
        total: 0,
        summary: { riskIncrements: 0, riskRecoveries: 0, otherTransitions: 0 },
        rows: [],
      },
    });
    mockLxpService.listSystemEvaluations.mockResolvedValue({
      count: 1,
      rows: [{ id: 'evaluation-1', targetModule: 'lxp', feedback: 'Useful' }],
      summary: {
        averages: {
          usabilityScore: 4.5,
          functionalityScore: 4.25,
          performanceScore: 4.0,
          satisfactionScore: 4.5,
        },
        feedbackCount: 1,
        moduleBreakdown: [],
      },
    });
    mockProxy.forward.mockResolvedValue({
      success: true,
      message: 'Admin analytics response generated.',
      data: {
        reply: '2 students are currently flagged as at risk.',
        sessionId: 'admin-session-1',
        chart: null,
        sources: [],
      },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAnalyticsChatService,
        { provide: AiProxyService, useValue: mockProxy },
        { provide: AuditService, useValue: mockAudit },
        { provide: AdminService, useValue: mockAdminService },
        { provide: ReportsService, useValue: mockReportsService },
        { provide: AnalyticsService, useValue: mockAnalyticsService },
        { provide: PerformanceService, useValue: mockPerformanceService },
        { provide: LxpService, useValue: mockLxpService },
      ],
    }).compile();

    service = module.get(AdminAnalyticsChatService);
  });

  it('builds scoped analytics context and forwards admin chat to ai-service', async () => {
    const result = await service.chat(ADMIN_USER, {
      message: 'Show me current at-risk trends.',
    });

    expect(mockAdminService.getDashboardOverview).toHaveBeenCalled();
    expect(mockAdminService.getAuditLogs).toHaveBeenCalledWith({
      limit: 10,
      page: 1,
    });
    expect(mockReportsService.getStudentPerformance).toHaveBeenCalledWith({
      limit: 12,
    });
    expect(mockReportsService.getAssessmentSummary).toHaveBeenCalledWith({
      limit: 12,
    });
    expect(
      mockReportsService.getInterventionParticipation,
    ).toHaveBeenCalledWith({ limit: 12 });
    expect(mockReportsService.getSystemUsage).toHaveBeenCalledWith({});
    expect(mockAnalyticsService.getAdminOverview).toHaveBeenCalled();
    expect(mockPerformanceService.getAdminAnalytics).toHaveBeenCalledWith(
      ADMIN_USER.id,
      ADMIN_USER.roles,
    );
    expect(mockLxpService.listSystemEvaluations).toHaveBeenCalledWith(
      { userId: ADMIN_USER.id, roles: ADMIN_USER.roles },
      {},
    );
    expect(mockProxy.forward).toHaveBeenCalledWith(
      'POST',
      '/admin/chat',
      ADMIN_USER,
      expect.objectContaining({
        message: 'Show me current at-risk trends.',
        context: expect.objectContaining({
          overview: expect.any(Object),
          audit: expect.any(Object),
          reports: expect.any(Object),
          evaluations: expect.any(Object),
          performance: expect.any(Object),
        }),
      }),
    );
    expect(result).toEqual({
      success: true,
      message: 'Admin analytics response generated.',
      data: {
        reply: '2 students are currently flagged as at risk.',
        sessionId: 'admin-session-1',
        chart: null,
        sources: [],
      },
    });
  });

  it('rejects non-admin users before building context', async () => {
    await expect(
      service.chat(
        { id: 'student-1', email: 'student@school.edu', roles: ['student'] },
        { message: 'Show me platform usage.' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(mockProxy.forward).not.toHaveBeenCalled();
    expect(mockReportsService.getStudentPerformance).not.toHaveBeenCalled();
  });
});
