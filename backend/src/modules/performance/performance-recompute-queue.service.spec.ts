import { PerformanceRecomputeQueueService } from './performance-recompute-queue.service';

describe('PerformanceRecomputeQueueService', () => {
  const queue = { add: jest.fn().mockResolvedValue(undefined) };
  let service: PerformanceRecomputeQueueService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PerformanceRecomputeQueueService(queue as any);
    jest.spyOn(Date, 'now').mockReturnValue(30_000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not coalesce different student subsets in the same time window', async () => {
    await service.enqueueClassRecordScores('class-1', ['student-1'], 'manual');
    await service.enqueueClassRecordScores('class-1', ['student-2'], 'manual');

    const firstOptions = queue.add.mock.calls[0][2];
    const secondOptions = queue.add.mock.calls[1][2];

    expect(firstOptions.jobId).not.toEqual(secondOptions.jobId);
  });

  it('coalesces the same student set regardless of input order', async () => {
    await service.enqueueClassRecordScores(
      'class-1',
      ['student-2', 'student-1'],
      'manual',
    );
    await service.enqueueClassRecordScores(
      'class-1',
      ['student-1', 'student-2'],
      'manual',
    );

    const firstOptions = queue.add.mock.calls[0][2];
    const secondOptions = queue.add.mock.calls[1][2];

    expect(firstOptions.jobId).toEqual(secondOptions.jobId);
  });
});
