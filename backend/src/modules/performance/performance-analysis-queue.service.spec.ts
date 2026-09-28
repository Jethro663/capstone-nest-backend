import { runSystemResetWork } from '../system-reset/system-reset.work';
import { PerformanceAnalysisQueueService } from './performance-analysis-queue.service';

jest.mock('../system-reset/system-reset.work', () => ({
  runSystemResetWork: jest.fn(
    (_modules: unknown, work: () => Promise<unknown>) => work(),
  ),
}));

describe('PerformanceAnalysisQueueService', () => {
  const queue = { add: jest.fn() };
  const findMany = jest.fn();
  const databaseService = {
    db: {
      query: {
        aiGenerationJobs: { findMany },
      },
    },
  };
  const modules = { get: jest.fn() };
  let service: PerformanceAnalysisQueueService;

  beforeEach(() => {
    jest.clearAllMocks();
    queue.add.mockResolvedValue(undefined);
    findMany.mockResolvedValue([]);
    service = new PerformanceAnalysisQueueService(
      queue as never,
      databaseService as never,
      modules as never,
    );
  });

  it('enqueues deterministic durable work inside the reset barrier', async () => {
    await service.enqueue({
      jobId: 'job-1',
      classId: 'class-1',
      teacherId: 'teacher-1',
      studentId: 'student-1',
      note: 'Focus on fractions',
    });

    expect(runSystemResetWork).toHaveBeenCalledWith(
      modules,
      expect.any(Function),
    );
    expect(queue.add).toHaveBeenCalledWith(
      'performance-analysis',
      {
        jobId: 'job-1',
        classId: 'class-1',
        teacherId: 'teacher-1',
        studentId: 'student-1',
        note: 'Focus on fractions',
      },
      expect.objectContaining({
        jobId: 'performance-analysis-job-1',
        attempts: 3,
      }),
    );
  });

  it('propagates enqueue failure so callers cannot report false queued state', async () => {
    queue.add.mockRejectedValueOnce(new Error('redis unavailable'));

    await expect(
      service.enqueue({
        jobId: 'job-1',
        classId: 'class-1',
        teacherId: 'teacher-1',
      }),
    ).rejects.toThrow('redis unavailable');
  });

  it('re-enqueues persisted nonterminal diagnostics during bootstrap', async () => {
    findMany.mockResolvedValue([
      {
        id: 'job-1',
        classId: 'class-1',
        teacherId: 'teacher-1',
        sourceFilters: {
          studentId: 'student-1',
          note: 'Check proportional reasoning',
        },
      },
      {
        id: 'job-2',
        classId: 'class-2',
        teacherId: 'teacher-2',
        sourceFilters: null,
      },
    ]);

    await service.onApplicationBootstrap();

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        columns: {
          id: true,
          classId: true,
          teacherId: true,
          sourceFilters: true,
        },
      }),
    );
    expect(queue.add).toHaveBeenNthCalledWith(
      1,
      'performance-analysis',
      {
        jobId: 'job-1',
        classId: 'class-1',
        teacherId: 'teacher-1',
        studentId: 'student-1',
        note: 'Check proportional reasoning',
      },
      expect.objectContaining({ jobId: 'performance-analysis-job-1' }),
    );
    expect(queue.add).toHaveBeenNthCalledWith(
      2,
      'performance-analysis',
      {
        jobId: 'job-2',
        classId: 'class-2',
        teacherId: 'teacher-2',
      },
      expect.objectContaining({ jobId: 'performance-analysis-job-2' }),
    );
  });

  it('logs bootstrap reconciliation failure without preventing application start', async () => {
    findMany.mockRejectedValueOnce(new Error('database unavailable'));

    await expect(service.onApplicationBootstrap()).resolves.toBeUndefined();
    expect(queue.add).not.toHaveBeenCalled();
  });
});
