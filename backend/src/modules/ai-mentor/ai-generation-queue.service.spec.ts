import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { AiGenerationQueueService } from './ai-generation-queue.service';

describe('AiGenerationQueueService', () => {
  let service: AiGenerationQueueService;
  let mockQueue: any;

  beforeEach(async () => {
    mockQueue = {
      add: jest.fn().mockResolvedValue(undefined),
      getJob: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiGenerationQueueService,
        {
          provide: getQueueToken('ai-teacher-generation'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<AiGenerationQueueService>(AiGenerationQueueService);
  });

  it('enqueues lesson-plan execution with deterministic BullMQ job id', async () => {
    await service.enqueueLessonPlanJob('job-123', 'teacher-1');

    expect(mockQueue.add).toHaveBeenCalledWith(
      'lesson-plan-generation',
      expect.objectContaining({ jobId: 'job-123', requestedByUserId: 'teacher-1' }),
      expect.objectContaining({ jobId: 'lesson-plan:job-123' }),
    );
  });

  it('enqueues quiz execution with deterministic BullMQ job id', async () => {
    await service.enqueueQuizJob('job-123', 'teacher-1');

    expect(mockQueue.add).toHaveBeenCalledWith(
      'quiz-generation',
      expect.objectContaining({ jobId: 'job-123', requestedByUserId: 'teacher-1' }),
      expect.objectContaining({ jobId: 'quiz:job-123' }),
    );
  });

  it('enqueues intervention execution with deterministic BullMQ job id', async () => {
    await service.enqueueInterventionJob('job-123', 'teacher-1');

    expect(mockQueue.add).toHaveBeenCalledWith(
      'intervention-recommendation-generation',
      expect.objectContaining({ jobId: 'job-123', requestedByUserId: 'teacher-1' }),
      expect.objectContaining({ jobId: 'intervention:job-123' }),
    );
  });

  it('removes waiting lesson-plan jobs before execution starts', async () => {
    const remove = jest.fn().mockResolvedValue(undefined);
    mockQueue.getJob.mockResolvedValue({
      getState: jest.fn().mockResolvedValue('waiting'),
      remove,
    });

    const result = await service.cancelQueuedLessonPlanJob('job-123');

    expect(mockQueue.getJob).toHaveBeenCalledWith('lesson-plan:job-123');
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

    expect(mockQueue.getJob).toHaveBeenCalledWith('quiz:job-123');
    expect(remove).toHaveBeenCalled();
    expect(result).toBe(true);
  });
});
