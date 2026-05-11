import { Test, TestingModule } from '@nestjs/testing';
import { LxpController } from './lxp.controller';
import { LxpService } from './lxp.service';
import { RoleName } from '../auth/decorators/roles.decorator';

const STUDENT_USER = {
  userId: '00000000-0000-0000-0000-000000000101',
  roles: [RoleName.Student],
};
const TEACHER_USER = {
  userId: '00000000-0000-0000-0000-000000000111',
  roles: [RoleName.Teacher],
};
const ADMIN_USER = {
  userId: '00000000-0000-0000-0000-000000000121',
  roles: [RoleName.Admin],
};

describe('LxpController', () => {
  let controller: LxpController;

  const mockLxpService = {
    getStudentEligibility: jest.fn(),
    getStudentPlaylist: jest.fn(),
    getStudentOverview: jest.fn(),
    completeCheckpoint: jest.fn(),
    getTeacherQueue: jest.fn(),
    getTeacherPendingInterventionCount: jest.fn(),
    assignIntervention: jest.fn(),
    activateIntervention: jest.fn(),
    resolveIntervention: jest.fn(),
    getTeacherInterventionCase: jest.fn(),
    getTeacherInterventionCaseDetail: jest.fn(),
    getTeacherInterventionHistory: jest.fn(),
    regenerateInterventionPath: jest.fn(),
    getClassReport: jest.fn(),
    getStudentTeacherEvaluationDashboard: jest.fn(),
    submitTeacherEvaluation: jest.fn(),
    submitSystemEvaluation: jest.fn(),
    listSystemEvaluations: jest.fn(),
    getMySystemEvaluationDashboard: jest.fn(),
    submitAssignedSystemEvaluation: jest.fn(),
    createSystemEvaluationCampaign: jest.fn(),
    listSystemEvaluationCampaigns: jest.fn(),
    updateSystemEvaluationCampaignStatus: jest.fn(),
    getTeacherEvaluationSummary: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LxpController],
      providers: [{ provide: LxpService, useValue: mockLxpService }],
    }).compile();

    controller = module.get<LxpController>(LxpController);
  });

  it('returns a success envelope for the student overview route', async () => {
    const data = {
      selectedClass: { classId: '00000000-0000-0000-0000-000000000201' },
      interventionStatus: { caseId: '00000000-0000-0000-0000-000000000301' },
    };
    mockLxpService.getStudentOverview.mockResolvedValue(data);

    const res = await controller.getOverview(
      '00000000-0000-0000-0000-000000000201',
      STUDENT_USER,
    );

    expect(mockLxpService.getStudentOverview).toHaveBeenCalledWith(
      STUDENT_USER.userId,
      '00000000-0000-0000-0000-000000000201',
    );
    expect(res).toEqual({ success: true, data });
  });

  it('returns student eligibility in a success envelope', async () => {
    const data = {
      eligibleClasses: [],
      thresholdApplied: 74,
    };
    mockLxpService.getStudentEligibility.mockResolvedValue(data);

    const res = await controller.getEligibility(STUDENT_USER);

    expect(mockLxpService.getStudentEligibility).toHaveBeenCalledWith(
      STUDENT_USER.userId,
    );
    expect(res).toEqual({ success: true, data });
  });

  it('returns teacher intervention queue in a success envelope', async () => {
    const data = {
      classId: '00000000-0000-0000-0000-000000000201',
      queue: [],
      count: 0,
      generatedAt: '2026-04-03T15:00:00.000Z',
    };
    mockLxpService.getTeacherQueue.mockResolvedValue(data);

    const res = await controller.getTeacherQueue(
      '00000000-0000-0000-0000-000000000201',
      TEACHER_USER,
    );

    expect(mockLxpService.getTeacherQueue).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000201',
      TEACHER_USER,
    );
    expect(res).toEqual({ success: true, data });
  });

  it('submits system evaluation using current user context', async () => {
    const dto = {
      targetModule: 'lxp',
      usabilityScore: 4,
      functionalityScore: 4,
      performanceScore: 3,
      satisfactionScore: 4,
      feedback: 'Useful intervention flow',
    };
    const data = { submitted: true };
    mockLxpService.submitSystemEvaluation.mockResolvedValue(data);

    const res = await controller.submitEvaluation(STUDENT_USER, dto);

    expect(mockLxpService.submitSystemEvaluation).toHaveBeenCalledWith(
      STUDENT_USER,
      dto,
    );
    expect(res).toEqual({ success: true, data });
  });

  it('returns the student teacher-evaluation dashboard in a success envelope', async () => {
    const data = {
      currentAcademicState: { schoolYear: '2025-2026', quarter: 'Q2' },
      pending: [],
      completed: [],
    };
    mockLxpService.getStudentTeacherEvaluationDashboard.mockResolvedValue(data);

    const res = await controller.getTeacherEvaluationDashboard(STUDENT_USER);

    expect(
      mockLxpService.getStudentTeacherEvaluationDashboard,
    ).toHaveBeenCalledWith(STUDENT_USER.userId);
    expect(res).toEqual({ success: true, data });
  });

  it('submits teacher evaluation using current student context', async () => {
    const dto = {
      classId: '00000000-0000-0000-0000-000000000201',
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
    };
    const data = { submitted: true };
    mockLxpService.submitTeacherEvaluation.mockResolvedValue(data);

    const res = await controller.submitTeacherEvaluation(STUDENT_USER, dto);

    expect(mockLxpService.submitTeacherEvaluation).toHaveBeenCalledWith(
      STUDENT_USER,
      dto,
    );
    expect(res).toEqual({ success: true, data });
  });

  it('returns pending intervention count for teacher/admin', async () => {
    const data = {
      pendingCount: 2,
      classBreakdown: [
        {
          classId: '00000000-0000-0000-0000-000000000201',
          subjectName: 'Mathematics 7',
          subjectCode: 'MATH-7',
          pendingCount: 2,
        },
      ],
    };
    mockLxpService.getTeacherPendingInterventionCount.mockResolvedValue(data);

    const res =
      await controller.getTeacherPendingInterventionCount(TEACHER_USER);

    expect(
      mockLxpService.getTeacherPendingInterventionCount,
    ).toHaveBeenCalledWith(TEACHER_USER);
    expect(res).toEqual({ success: true, data });
  });

  it('returns intervention case detail in a success envelope', async () => {
    const data = {
      id: '00000000-0000-0000-0000-000000000501',
      classId: '00000000-0000-0000-0000-000000000201',
      studentId: '00000000-0000-0000-0000-000000000101',
      weakConcepts: [],
      recentRiskTransitions: [],
      assignments: [],
    };
    mockLxpService.getTeacherInterventionCaseDetail.mockResolvedValue(data);

    const res = await controller.getTeacherInterventionCaseDetail(
      '00000000-0000-0000-0000-000000000501',
      TEACHER_USER,
    );

    expect(
      mockLxpService.getTeacherInterventionCaseDetail,
    ).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000501',
      TEACHER_USER,
    );
    expect(res).toEqual({ success: true, data });
  });

  it('returns teacher intervention history in a success envelope', async () => {
    const data = {
      classId: '00000000-0000-0000-0000-000000000201',
      scoreThreshold: 60,
      history: [],
    };
    mockLxpService.getTeacherInterventionHistory.mockResolvedValue(data);

    const res = await controller.getTeacherInterventionHistory(
      '00000000-0000-0000-0000-000000000201',
      TEACHER_USER,
    );

    expect(mockLxpService.getTeacherInterventionHistory).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000201',
      TEACHER_USER,
    );
    expect(res).toEqual({ success: true, data });
  });

  it('regenerates an intervention path in a success envelope', async () => {
    const data = {
      sourceCaseId: '00000000-0000-0000-0000-000000000501',
      reusedExisting: false,
      scoreThreshold: 60,
      pathScore: { scorePercent: 58 },
      case: { id: '00000000-0000-0000-0000-000000000601' },
    };
    mockLxpService.regenerateInterventionPath.mockResolvedValue(data);

    const res = await controller.regenerateInterventionPath(
      '00000000-0000-0000-0000-000000000501',
      TEACHER_USER,
    );

    expect(mockLxpService.regenerateInterventionPath).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000501',
      TEACHER_USER,
    );
    expect(res).toEqual({ success: true, data });
  });

  it('lists system evaluations for admins with optional module filter', async () => {
    const data = { targetModule: 'lxp', evaluations: [], count: 0 };
    mockLxpService.listSystemEvaluations.mockResolvedValue(data);

    const res = await controller.listEvaluations(ADMIN_USER, {
      targetModule: 'lxp',
    });

    expect(mockLxpService.listSystemEvaluations).toHaveBeenCalledWith(
      ADMIN_USER,
      { targetModule: 'lxp' },
    );
    expect(res).toEqual({ success: true, data });
  });

  it('returns assigned system evaluations for the current respondent', async () => {
    const data = {
      pending: [{ id: 'assignment-1', formType: 'system' }],
      completed: [],
    };
    mockLxpService.getMySystemEvaluationDashboard.mockResolvedValue(data);

    const res = await controller.getMySystemEvaluations(STUDENT_USER);

    expect(mockLxpService.getMySystemEvaluationDashboard).toHaveBeenCalledWith(
      STUDENT_USER,
    );
    expect(res).toEqual({ success: true, data });
  });

  it('submits an assigned system evaluation using the current respondent', async () => {
    const dto = {
      questionRatings: {
        system_navigation: 0,
        system_features: 5,
        system_speed: 4,
        system_efficiency: 5,
        system_satisfaction: 4,
      },
      feedback: 'Works well enough',
    };
    const data = { id: 'evaluation-1' };
    mockLxpService.submitAssignedSystemEvaluation.mockResolvedValue(data);

    const res = await controller.submitAssignedSystemEvaluation(
      '00000000-0000-0000-0000-000000000701',
      STUDENT_USER,
      dto,
    );

    expect(mockLxpService.submitAssignedSystemEvaluation).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000701',
      STUDENT_USER,
      dto,
    );
    expect(res).toEqual({ success: true, data });
  });

  it('creates a system evaluation campaign for admin/teacher users', async () => {
    const dto = {
      formType: 'system',
      audienceRole: 'student',
      classId: '00000000-0000-0000-0000-000000000201',
      title: 'Quarter System Pulse',
      startsAt: '2026-05-01T00:00:00.000Z',
      endsAt: '2026-05-10T00:00:00.000Z',
      status: 'active',
    };
    const data = { id: 'campaign-1', assignmentCount: 2 };
    mockLxpService.createSystemEvaluationCampaign.mockResolvedValue(data);

    const res = await controller.createSystemEvaluationCampaign(
      TEACHER_USER,
      dto as any,
    );

    expect(mockLxpService.createSystemEvaluationCampaign).toHaveBeenCalledWith(
      TEACHER_USER,
      dto,
    );
    expect(res).toEqual({ success: true, data });
  });

  it('lists system evaluation campaigns for admin/teacher users', async () => {
    const data = { campaigns: [], count: 0 };
    mockLxpService.listSystemEvaluationCampaigns.mockResolvedValue(data);

    const res = await controller.listSystemEvaluationCampaigns(ADMIN_USER, {
      status: 'active',
    } as any);

    expect(mockLxpService.listSystemEvaluationCampaigns).toHaveBeenCalledWith(
      ADMIN_USER,
      { status: 'active' },
    );
    expect(res).toEqual({ success: true, data });
  });

  it('updates a system evaluation campaign status', async () => {
    const data = { id: 'campaign-1', status: 'closed' };
    mockLxpService.updateSystemEvaluationCampaignStatus.mockResolvedValue(data);

    const res = await controller.updateSystemEvaluationCampaignStatus(
      '00000000-0000-0000-0000-000000000801',
      ADMIN_USER,
      { status: 'closed' } as any,
    );

    expect(
      mockLxpService.updateSystemEvaluationCampaignStatus,
    ).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000801', ADMIN_USER, {
      status: 'closed',
    });
    expect(res).toEqual({ success: true, data });
  });

  it('returns teacher evaluation summary for teacher/admin', async () => {
    const data = {
      classes: [],
      periods: ['Q1'],
      evaluationType: 'teacher_class',
      overview: { responseCount: 0, eligibleCount: 0, responseRate: 0 },
      categoryAverages: [],
      comments: [],
      trends: [],
    };
    const query = { evaluationType: 'teacher_class', classId: undefined };
    mockLxpService.getTeacherEvaluationSummary.mockResolvedValue(data);

    const res = await controller.getTeacherEvaluationSummary(
      TEACHER_USER,
      query as any,
    );

    expect(mockLxpService.getTeacherEvaluationSummary).toHaveBeenCalledWith(
      TEACHER_USER,
      query,
    );
    expect(res).toEqual({ success: true, data });
  });
});
