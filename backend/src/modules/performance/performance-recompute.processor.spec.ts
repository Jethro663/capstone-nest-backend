import { PerformanceRecomputeProcessor } from './performance-recompute.processor';

// Admission/lifetime behavior is covered by the dedicated reset regression suites.
jest.mock('../system-reset/system-reset.work', () => ({
  runSystemResetWork: (_modules: unknown, work: () => Promise<unknown>) =>
    work(),
}));

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

  it('completes as a no-op when a class was permanently erased', async () => {
    const localService = {
      recomputeFromAssessmentSubmission: jest.fn(),
      recomputeStudentsForClass: jest.fn(),
    };
    const localProcessor = new PerformanceRecomputeProcessor(
      localService as never,
      undefined,
      {
        db: {
          query: { classes: { findFirst: jest.fn().mockResolvedValue(null) } },
        },
      } as never,
    );

    await expect(
      localProcessor.process({
        name: 'recompute-class-scores',
        data: { classId: 'erased-class' },
      } as never),
    ).resolves.toBeUndefined();
    expect(localService.recomputeStudentsForClass).not.toHaveBeenCalled();
  });
});
