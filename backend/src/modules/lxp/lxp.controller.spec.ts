import { Test, TestingModule } from '@nestjs/testing';
import { LxpController } from './lxp.controller';
import { LxpService } from './lxp.service';
import { RoleName } from '../auth/decorators/roles.decorator';

const STUDENT_USER = {
  userId: '00000000-0000-0000-0000-000000000101',
  roles: [RoleName.Student],
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
});
