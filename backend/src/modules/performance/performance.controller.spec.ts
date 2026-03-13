import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceController } from './performance.controller';
import { PerformanceService } from './performance.service';

describe('PerformanceController', () => {
  let controller: PerformanceController;
  let service: jest.Mocked<PerformanceService>;

  beforeEach(async () => {
    const mockService = {
      recomputeClass: jest.fn(),
      getClassSummary: jest.fn(),
      getAtRiskStudents: jest.fn(),
      getClassLogs: jest.fn(),
      getStudentOwnSummary: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PerformanceController],
      providers: [{ provide: PerformanceService, useValue: mockService }],
    }).compile();

    controller = module.get<PerformanceController>(PerformanceController);
    service = module.get(PerformanceService);
  });

  it('should wrap recomputeClass result in success envelope', async () => {
    service.recomputeClass.mockResolvedValue({
      classId: 'class-1',
      recomputed: 10,
      atRiskCount: 4,
      totalStudents: 10,
    } as any);

    const result = await controller.recomputeClass('class-1', {
      userId: 'teacher-1',
      roles: ['teacher'],
    });

    expect(result.success).toBe(true);
    expect(result.data.recomputed).toBe(10);
    expect(service.recomputeClass).toHaveBeenCalledWith(
      'class-1',
      'teacher-1',
      ['teacher'],
    );
  });

  it('should return student own summary', async () => {
    service.getStudentOwnSummary.mockResolvedValue({
      student: { id: 'student-1' },
      threshold: 74,
      classes: [],
      overall: {
        totalClasses: 0,
        classesWithData: 0,
        atRiskClasses: 0,
        averageBlendedScore: null,
      },
    } as any);

    const result = await controller.getStudentSummary({ userId: 'student-1' });

    expect(result.success).toBe(true);
    expect(result.data.threshold).toBe(74);
    expect(service.getStudentOwnSummary).toHaveBeenCalledWith('student-1');
  });
});
