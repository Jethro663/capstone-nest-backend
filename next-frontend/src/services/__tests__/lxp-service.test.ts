import { lxpService } from '@/services/lxp-service';
import { api } from '@/lib/api-client';

jest.mock('@/lib/api-client', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('lxpService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests evaluation list with targetModule filter when provided', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: { count: 1, rows: [{ id: 'eval-1', targetModule: 'lxp' }] },
      },
    });

    const result = await lxpService.getEvaluations({ targetModule: 'lxp' });

    expect(mockedApi.get).toHaveBeenCalledWith('/lxp/evaluations', {
      params: { targetModule: 'lxp' },
    });
    expect(result.data.count).toBe(1);
  });

  it('preserves backend evaluation summary payload when provided', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          count: 2,
          rows: [],
          summary: {
            averages: {
              usabilityScore: 4.5,
              functionalityScore: 4.0,
              performanceScore: 4.0,
              satisfactionScore: 4.5,
            },
            feedbackCount: 1,
            moduleBreakdown: [
              {
                targetModule: 'lxp',
                count: 2,
                averages: {
                  usabilityScore: 4.5,
                  functionalityScore: 4.0,
                  performanceScore: 4.0,
                  satisfactionScore: 4.5,
                },
              },
            ],
          },
        },
      },
    });

    const result = await lxpService.getEvaluations();

    expect(result.data.summary?.feedbackCount).toBe(1);
    expect(result.data.summary?.moduleBreakdown[0].targetModule).toBe('lxp');
  });

  it('requests evaluation list without params when no filter is provided', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: { count: 0, rows: [] },
      },
    });

    await lxpService.getEvaluations();

    expect(mockedApi.get).toHaveBeenCalledWith('/lxp/evaluations', {
      params: undefined,
    });
  });

  it('requests evaluation list with ai mentor metadata filters when provided', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: { count: 0, rows: [] },
      },
    });

    await lxpService.getEvaluations({
      targetModule: 'ai_mentor',
      aiClassId: 'class-1',
      aiSessionType: 'mistake_explanation',
      aiSourceFlow: 'assessment_results',
    });

    expect(mockedApi.get).toHaveBeenCalledWith('/lxp/evaluations', {
      params: {
        targetModule: 'ai_mentor',
        aiClassId: 'class-1',
        aiSessionType: 'mistake_explanation',
        aiSourceFlow: 'assessment_results',
      },
    });
  });

  it('requests assigned system evaluations for the current respondent', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: { pending: [], completed: [] },
      },
    });

    const result = await lxpService.getMySystemEvaluations();

    expect(mockedApi.get).toHaveBeenCalledWith('/lxp/me/system-evaluations');
    expect(result.data.pending).toEqual([]);
  });

  it('submits assigned system evaluation responses', async () => {
    mockedApi.post.mockResolvedValue({
      data: {
        success: true,
        data: { id: 'evaluation-1' },
      },
    });

    await lxpService.submitAssignedSystemEvaluation('assignment-1', {
      questionRatings: {
        system_navigation: 0,
        system_features: 5,
        system_speed: 4,
        system_efficiency: 5,
        system_satisfaction: 4,
      },
      feedback: 'Useful',
    });

    expect(mockedApi.post).toHaveBeenCalledWith(
      '/lxp/me/system-evaluations/assignment-1/submit',
      {
        questionRatings: {
          system_navigation: 0,
          system_features: 5,
          system_speed: 4,
          system_efficiency: 5,
          system_satisfaction: 4,
        },
        feedback: 'Useful',
      },
    );
  });

  it('creates a system evaluation campaign', async () => {
    mockedApi.post.mockResolvedValue({
      data: {
        success: true,
        data: { id: 'campaign-1', assignmentCount: 3 },
      },
    });

    await lxpService.createSystemEvaluationCampaign({
      formType: 'system',
      audienceRole: 'student',
      title: 'System Pulse',
      startsAt: '2026-05-01T00:00:00.000Z',
      endsAt: '2026-05-20T00:00:00.000Z',
      status: 'active',
    });

    expect(mockedApi.post).toHaveBeenCalledWith(
      '/lxp/system-evaluation-campaigns',
      {
        formType: 'system',
        audienceRole: 'student',
        title: 'System Pulse',
        startsAt: '2026-05-01T00:00:00.000Z',
        endsAt: '2026-05-20T00:00:00.000Z',
        status: 'active',
      },
    );
  });

  it('lists system evaluation campaigns', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: { campaigns: [], count: 0 },
      },
    });

    await lxpService.getSystemEvaluationCampaigns({ status: 'active' });

    expect(mockedApi.get).toHaveBeenCalledWith(
      '/lxp/system-evaluation-campaigns',
      { params: { status: 'active' } },
    );
  });

  it('normalizes non-envelope evaluation submit responses', async () => {
    mockedApi.post.mockResolvedValue({
      data: {
        id: 'eval-2',
        targetModule: 'overall',
      },
    });

    const result = await lxpService.submitEvaluation({
      targetModule: 'overall',
      usabilityScore: 5,
      functionalityScore: 4,
      performanceScore: 4,
      satisfactionScore: 5,
      aiContextMetadata: {
        sessionType: 'mistake_explanation',
        attemptId: 'attempt-1',
      },
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/lxp/evaluations', {
      targetModule: 'overall',
      usabilityScore: 5,
      functionalityScore: 4,
      performanceScore: 4,
      satisfactionScore: 5,
      aiContextMetadata: {
        sessionType: 'mistake_explanation',
        attemptId: 'attempt-1',
      },
    });
    expect(result).toEqual({
      data: {
        id: 'eval-2',
        targetModule: 'overall',
      },
    });
  });

  it('submits intervention assignment payload to teacher endpoint', async () => {
    mockedApi.post.mockResolvedValue({
      data: {
        success: true,
        data: { classId: 'class-1', threshold: 74, count: 0, queue: [] },
      },
    });

    await lxpService.assignIntervention('case-1', {
      lessonAssignments: [{ lessonId: 'lesson-1', xpAwarded: 20 }],
      assessmentAssignments: [{ assessmentId: 'assessment-1', xpAwarded: 30 }],
      note: 'AI adjusted plan',
    });

    expect(mockedApi.post).toHaveBeenCalledWith(
      '/lxp/teacher/interventions/case-1/assign',
      {
        lessonAssignments: [{ lessonId: 'lesson-1', xpAwarded: 20 }],
        assessmentAssignments: [
          { assessmentId: 'assessment-1', xpAwarded: 30 },
        ],
        note: 'AI adjusted plan',
      },
    );
  });

  it('loads teacher pending intervention count', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          pendingCount: 3,
          classBreakdown: [
            {
              classId: 'class-1',
              subjectName: 'Math',
              subjectCode: 'MATH-7',
              pendingCount: 3,
            },
          ],
        },
      },
    });

    const result = await lxpService.getTeacherPendingInterventionCount();

    expect(mockedApi.get).toHaveBeenCalledWith(
      '/lxp/teacher/interventions/pending-count',
    );
    expect(result.data.pendingCount).toBe(3);
  });

  it('loads teacher intervention case detail payload', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          id: 'case-1',
          classId: 'class-1',
          studentId: 'student-1',
          status: 'pending',
          openedAt: '2026-01-01T00:00:00.000Z',
          closedAt: null,
          triggerScore: 55,
          thresholdApplied: 74,
          note: null,
          completion: {
            totalCheckpoints: 2,
            completedCheckpoints: 1,
            completionPercent: 50,
          },
          progress: {
            xpTotal: 20,
            starsTotal: 0,
            streakDays: 1,
            checkpointsCompleted: 1,
            lastActivityAt: null,
          },
          assignments: [],
          latestSnapshot: null,
          weakConcepts: [],
          recentRiskTransitions: [],
          links: {
            performancePage: '/dashboard/teacher/performance',
          },
        },
      },
    });

    const result = await lxpService.getTeacherCaseDetail('case-1');

    expect(mockedApi.get).toHaveBeenCalledWith(
      '/lxp/teacher/interventions/case-1/detail',
    );
    expect(result.data.id).toBe('case-1');
  });

  it('loads the student teacher-evaluation dashboard', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          currentAcademicState: { schoolYear: '2025-2026', quarter: 'Q2' },
          pending: [],
          completed: [],
        },
      },
    });

    const result = await lxpService.getStudentTeacherEvaluationDashboard();

    expect(mockedApi.get).toHaveBeenCalledWith('/lxp/me/teacher-evaluations');
    expect(result.data.currentAcademicState.quarter).toBe('Q2');
  });

  it('submits teacher evaluation payload', async () => {
    mockedApi.post.mockResolvedValue({
      data: {
        success: true,
        data: { id: 'submission-1' },
      },
    });

    await lxpService.submitTeacherEvaluation({
      classId: 'class-1',
      gradingPeriod: 'Q1',
      evaluationType: 'teacher_class',
      ratings: {
        teaching_clarity: 5,
        subject_mastery: 4,
        pacing: 4,
        fairness: 5,
        responsiveness: 5,
        materials: 4,
      },
      comment: 'Helpful class',
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/lxp/me/teacher-evaluations', {
      classId: 'class-1',
      gradingPeriod: 'Q1',
      evaluationType: 'teacher_class',
      ratings: {
        teaching_clarity: 5,
        subject_mastery: 4,
        pacing: 4,
        fairness: 5,
        responsiveness: 5,
        materials: 4,
      },
      comment: 'Helpful class',
    });
  });

  it('requests teacher evaluation summary filters', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          classes: [],
          periods: ['Q1'],
          evaluationType: 'teacher_class',
          tabTitle: 'My Teaching',
          tabDescription: 'Anonymous teaching feedback',
          overview: {
            responseCount: 0,
            eligibleCount: 0,
            responseRate: 0,
            averageOverall: 0,
            latestSubmittedAt: null,
          },
          categoryAverages: [],
          comments: [],
          trends: [],
        },
      },
    });

    await lxpService.getTeacherEvaluationSummary({
      evaluationType: 'teacher_class',
      classId: 'class-1',
      gradingPeriod: 'Q1',
    });

    expect(mockedApi.get).toHaveBeenCalledWith(
      '/lxp/teacher/evaluations/summary',
      {
        params: {
          evaluationType: 'teacher_class',
          classId: 'class-1',
          gradingPeriod: 'Q1',
        },
      },
    );
  });
});
