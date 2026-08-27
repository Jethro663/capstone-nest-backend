import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { AiGenerationQueueService } from './ai-generation-queue.service';
import { DatabaseService } from '../../database/database.service';

describe('AiGenerationQueueService', () => {
  let service: AiGenerationQueueService;
  let mockQueue: any;
  let mockDatabase: any;

  beforeEach(async () => {
    mockQueue = {
      add: jest.fn().mockResolvedValue(undefined),
      getJob: jest.fn().mockResolvedValue(null),
    };
    const updateWhere = jest.fn().mockResolvedValue(undefined);
    const updateSet = jest.fn().mockReturnValue({ where: updateWhere });
    mockDatabase = {
      db: {
        query: {
          extractedModules: {
            findMany: jest.fn().mockResolvedValue([]),
          },
        },
        update: jest.fn().mockReturnValue({ set: updateSet }),
      },
      updateSet,
      updateWhere,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiGenerationQueueService,
        {
          provide: getQueueToken('ai-teacher-generation'),
          useValue: mockQueue,
        },
        {
          provide: DatabaseService,
          useValue: mockDatabase,
        },
      ],
    }).compile();

    service = module.get<AiGenerationQueueService>(AiGenerationQueueService);
  });

  it('enqueues lesson-plan execution with deterministic BullMQ job id', async () => {
    await service.enqueueLessonPlanJob('job-123', 'teacher-1');

    expect(mockQueue.add).toHaveBeenCalledWith(
      'lesson-plan-generation',
      expect.objectContaining({
        jobId: 'job-123',
        requestedByUserId: 'teacher-1',
      }),
      expect.objectContaining({
        jobId: 'lesson-plan-job-123',
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      }),
    );
    expect(mockQueue.add.mock.calls[0][2].jobId).not.toContain(':');
  });

  it('enqueues quiz execution with deterministic BullMQ job id', async () => {
    await service.enqueueQuizJob('job-123', 'teacher-1');

    expect(mockQueue.add).toHaveBeenCalledWith(
      'quiz-generation',
      expect.objectContaining({
        jobId: 'job-123',
        requestedByUserId: 'teacher-1',
      }),
      expect.objectContaining({
        jobId: 'quiz-job-123',
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      }),
    );
    expect(mockQueue.add.mock.calls[0][2].jobId).not.toContain(':');
  });

  it('enqueues intervention execution with deterministic BullMQ job id', async () => {
    await service.enqueueInterventionJob('job-123', 'teacher-1');

    expect(mockQueue.add).toHaveBeenCalledWith(
      'intervention-recommendation-generation',
      expect.objectContaining({
        jobId: 'job-123',
        requestedByUserId: 'teacher-1',
      }),
      expect.objectContaining({
        jobId: 'intervention-job-123',
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      }),
    );
    expect(mockQueue.add.mock.calls[0][2].jobId).not.toContain(':');
  });

  it('enqueues extraction execution with deterministic BullMQ job id and retry policy', async () => {
    await service.enqueueExtractionJob('extraction-123', 'teacher-1');

    expect(mockQueue.add).toHaveBeenCalledWith(
      'module-extraction',
      expect.objectContaining({
        extractionId: 'extraction-123',
        requestedByUserId: 'teacher-1',
      }),
      expect.objectContaining({
        jobId: 'extraction-extraction-123',
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      }),
    );
    expect(mockQueue.add.mock.calls[0][2].jobId).not.toContain(':');
  });

  it('removes waiting lesson-plan jobs before execution starts', async () => {
    const remove = jest.fn().mockResolvedValue(undefined);
    mockQueue.getJob.mockResolvedValue({
      getState: jest.fn().mockResolvedValue('waiting'),
      remove,
    });

    const result = await service.cancelQueuedLessonPlanJob('job-123');

    expect(mockQueue.getJob).toHaveBeenCalledWith('lesson-plan-job-123');
    expect(remove).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('removes waiting jobs using generic cancelQueuedTeacherAiJob', async () => {
    const remove = jest.fn().mockResolvedValue(undefined);
    mockQueue.getJob.mockResolvedValue({
      getState: jest.fn().mockResolvedValue('delayed'),
      remove,
    });

    const result = await service.cancelQueuedTeacherAiJob('quiz', 'job-123');

    expect(mockQueue.getJob).toHaveBeenCalledWith('quiz-job-123');
    expect(remove).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('removes a waiting extraction job before cooperative cancellation', async () => {
    const remove = jest.fn().mockResolvedValue(undefined);
    mockQueue.getJob.mockResolvedValue({
      getState: jest.fn().mockResolvedValue('waiting'),
      remove,
    });

    await expect(
      service.cancelQueuedExtractionJob('extraction-123'),
    ).resolves.toBe(true);
    expect(mockQueue.getJob).toHaveBeenCalledWith('extraction-extraction-123');
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('marks stale processing extractions without a live queue job as failed', async () => {
    mockDatabase.db.query.extractedModules.findMany.mockResolvedValue([
      { id: 'stale-extraction' },
    ]);
    mockQueue.getJob.mockResolvedValue(null);

    await service.onApplicationBootstrap();

    expect(mockQueue.getJob).toHaveBeenCalledWith(
      'extraction-stale-extraction',
    );
    expect(mockDatabase.updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        extractionStatus: 'failed',
        errorMessage: expect.stringContaining('Retry'),
      }),
    );
  });

  it.each(['active', 'waiting', 'delayed']) (
    'preserves stale processing extractions while the queue job is %s',
    async (state) => {
      mockDatabase.db.query.extractedModules.findMany.mockResolvedValue([
        { id: 'live-extraction' },
      ]);
      mockQueue.getJob.mockResolvedValue({
        getState: jest.fn().mockResolvedValue(state),
      });

      await service.onApplicationBootstrap();

      expect(mockDatabase.updateSet).not.toHaveBeenCalled();
    },
  );
});
