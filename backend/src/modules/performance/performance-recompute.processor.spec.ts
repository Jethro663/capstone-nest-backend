import { PerformanceRecomputeProcessor } from './performance-recompute.processor';

describe('PerformanceRecomputeProcessor', () => {
  const performanceService = {
    recomputeFromAssessmentSubmission: jest.fn(),
    recomputeStudentsForClass: jest.fn(),
  };
  const processor = new PerformanceRecomputeProcessor(
    performanceService as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unsupported queue contracts without recomputing', async () => {
    await expect(
      processor.process({ name: 'unknown-job', data: {} } as any),
    ).rejects.toThrow('Unsupported performance-recompute job: unknown-job');
    expect(
      performanceService.recomputeFromAssessmentSubmission,
    ).not.toHaveBeenCalled();
    expect(performanceService.recomputeStudentsForClass).not.toHaveBeenCalled();
  });
});
