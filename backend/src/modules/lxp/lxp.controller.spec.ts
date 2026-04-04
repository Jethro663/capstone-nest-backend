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
    assignIntervention: jest.fn(),
    resolveIntervention: jest.fn(),
    getClassReport: jest.fn(),
    submitSystemEvaluation: jest.fn(),
    listSystemEvaluations: jest.fn(),
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

  it('lists system evaluations for teachers/admins with optional module filter', async () => {
    const data = { targetModule: 'lxp', evaluations: [], count: 0 };
    mockLxpService.listSystemEvaluations.mockResolvedValue(data);

    const res = await controller.listEvaluations(ADMIN_USER, 'lxp');

    expect(mockLxpService.listSystemEvaluations).toHaveBeenCalledWith(
      ADMIN_USER,
      'lxp',
    );
    expect(res).toEqual({ success: true, data });
  });
});
