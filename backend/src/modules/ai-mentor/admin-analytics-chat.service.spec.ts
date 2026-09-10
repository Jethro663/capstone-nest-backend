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
import { AcademicPolicyService } from '../academic-state/academic-policy.service';

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
  const mockAcademicPolicyService = {
    currentState: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockAudit.log.mockResolvedValue(undefined);
    mockAcademicPolicyService.currentState.mockResolvedValue({
      id: 'academic-state',
      schoolYear: '2026-2027',
      quarter: 'Q3',
      policy: {
        periods: [
          { key: 'Q1', label: 'Term 1' },
          { key: 'Q2', label: 'Term 2' },
          { key: 'Q3', label: 'Term 3' },
        ],
      },
      periods: [
        { key: 'Q1', label: 'Term 1' },
        { key: 'Q2', label: 'Term 2' },
        { key: 'Q3', label: 'Term 3' },
      ],
    });
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
      total: 1,
      page: 1,
      limit: 25,
      totalPages: 1,
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
      total: 1,
    });
    mockReportsService.getInterventionParticipation.mockResolvedValue({
      data: [],
      filters: {},
      generatedAt: '2026-04-13T00:00:00.000Z',
      total: 0,
      page: 1,
      limit: 25,
      totalPages: 0,
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
        {
          provide: AcademicPolicyService,
          useValue: mockAcademicPolicyService,
        },
      ],
    }).compile();

    service = module.get(AdminAnalyticsChatService);
  });

  it('fetches only relevant data and forwards provenance with server-derived scope', async () => {
    const result = await service.chat(ADMIN_USER, {
      message: 'Show unusual audit activity this week.',
      scope: { timeRange: 'last_7_days' },
    });

    expect(mockAcademicPolicyService.currentState).toHaveBeenCalled();
    expect(mockAdminService.getAuditLogs).toHaveBeenCalledWith({
      dateFrom: expect.any(Date),
      dateTo: expect.any(Date),
      limit: 25,
      page: 1,
    });
    expect(mockReportsService.getSystemUsage).toHaveBeenCalledWith({
      dateFrom: expect.any(Date),
      dateTo: expect.any(Date),
    });
    expect(mockAdminService.getDashboardOverview).not.toHaveBeenCalled();
    expect(mockReportsService.getStudentPerformance).not.toHaveBeenCalled();
    expect(mockReportsService.getAssessmentSummary).not.toHaveBeenCalled();
    expect(
      mockReportsService.getInterventionParticipation,
    ).not.toHaveBeenCalled();
    expect(mockAnalyticsService.getAdminOverview).not.toHaveBeenCalled();
    expect(mockPerformanceService.getAdminAnalytics).not.toHaveBeenCalled();
    expect(mockLxpService.listSystemEvaluations).not.toHaveBeenCalled();
    expect(mockProxy.forward).toHaveBeenCalledWith(
      'POST',
      '/admin/chat',
      ADMIN_USER,
      expect.objectContaining({
        message: 'Show unusual audit activity this week.',
        context: expect.objectContaining({
          selectedSources: ['audit', 'systemUsage'],
          audit: expect.any(Object),
          reports: {
            systemUsage: expect.any(Object),
          },
          scope: expect.objectContaining({
            timeRange: 'last_7_days',
            schoolYear: '2026-2027',
            gradingPeriod: 'Q3',
            periodLabel: 'Term 3',
          }),
          provenance: expect.arrayContaining([
            expect.objectContaining({
              source: 'audit-log',
              href: '/dashboard/admin/audit',
              recordCount: 1,
              total: 1,
              truncated: false,
            }),
            expect.objectContaining({
              source: 'system-usage-report',
              href: '/dashboard/admin/reports',
            }),
          ]),
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

  it('applies date and class scope to evaluation evidence', async () => {
    await service.chat(ADMIN_USER, {
      message: 'Summarize evaluation feedback from last week.',
      scope: {
        timeRange: 'last_7_days',
        classId: '11111111-1111-4111-8111-111111111111',
      },
    });

    expect(mockLxpService.listSystemEvaluations).toHaveBeenCalledWith(
      { userId: ADMIN_USER.id, roles: ADMIN_USER.roles },
      {
        aiClassId: '11111111-1111-4111-8111-111111111111',
        from: expect.any(String),
        to: expect.any(String),
      },
    );
    expect(mockProxy.forward).toHaveBeenCalledWith(
      'POST',
      '/admin/chat',
      ADMIN_USER,
      expect.objectContaining({
        context: expect.objectContaining({
          provenance: expect.arrayContaining([
            expect.objectContaining({
              source: 'system-evaluations',
              filters: expect.objectContaining({
                aiClassId: '11111111-1111-4111-8111-111111111111',
                from: expect.any(String),
                to: expect.any(String),
              }),
            }),
          ]),
        }),
      }),
    );
  });

  it('renames an owned conversation through the AI service and writes an audit event', async () => {
    mockProxy.forward.mockResolvedValueOnce({
      success: true,
      message: 'Admin assistant conversation renamed.',
      data: {
        sessionId: '11111111-1111-1111-1111-111111111111',
        title: 'Weekly operations',
      },
    });

    await service.renameSession(
      ADMIN_USER,
      '11111111-1111-1111-1111-111111111111',
      { title: 'Weekly operations' },
    );

    expect(mockProxy.forward).toHaveBeenCalledWith(
      'PATCH',
      '/admin/sessions/11111111-1111-1111-1111-111111111111',
      ADMIN_USER,
      { title: 'Weekly operations' },
    );
    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: ADMIN_USER.id,
        action: 'admin_ai_session_renamed',
        targetType: 'ai_admin_chat',
        targetId: '11111111-1111-1111-1111-111111111111',
      }),
    );
  });

  it('deletes an owned conversation through the AI service and writes an audit event', async () => {
    mockProxy.forward.mockResolvedValueOnce({
      success: true,
      message: 'Admin assistant conversation deleted.',
      data: { sessionId: '11111111-1111-1111-1111-111111111111' },
    });

    await service.deleteSession(
      ADMIN_USER,
      '11111111-1111-1111-1111-111111111111',
    );

    expect(mockProxy.forward).toHaveBeenCalledWith(
      'DELETE',
      '/admin/sessions/11111111-1111-1111-1111-111111111111',
      ADMIN_USER,
    );
    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: ADMIN_USER.id,
        action: 'admin_ai_session_deleted',
        targetType: 'ai_admin_chat',
        targetId: '11111111-1111-1111-1111-111111111111',
      }),
    );
  });
});
