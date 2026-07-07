import { Test, TestingModule } from '@nestjs/testing';
import { AiGenerationProcessor } from './ai-generation.processor';
import { AiProxyService } from '../ai-proxy.service';
import type { Job } from 'bullmq';

describe('AiGenerationProcessor', () => {
  let processor: AiGenerationProcessor;
  let proxy: AiProxyService;

  beforeEach(async () => {
    const mockProxy = {
      runInternalLessonPlanJob: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiGenerationProcessor,
        {
          provide: AiProxyService,
          useValue: mockProxy,
        },
      ],
    }).compile();

    processor = module.get<AiGenerationProcessor>(AiGenerationProcessor);
    proxy = module.get<AiProxyService>(AiProxyService);
  });

  it('rejects when the internal lesson-plan execution exceeds the worker timeout', async () => {
    jest
      .spyOn(proxy, 'runInternalLessonPlanJob')
      .mockRejectedValue(new Error('AbortError'));

    const mockJob = {
      name: 'lesson-plan-generation',
      id: 'bullmq-123',
      attemptsMade: 0,
      data: { jobId: 'job-123', requestedByUserId: 'teacher-1' },
    } as unknown as Job<{ jobId: string; requestedByUserId: string }>;

    await expect(processor.process(mockJob)).rejects.toThrow('AbortError');
    expect(proxy.runInternalLessonPlanJob).toHaveBeenCalledWith('job-123', {
      bullmqJobId: 'bullmq-123',
      attempt: 1,
    });
  });

  it('ignores unknown job names without calling proxy', async () => {
    const mockJob = {
      name: 'unknown-job',
      id: 'bullmq-999',
      attemptsMade: 0,
      data: { jobId: 'job-999', requestedByUserId: 'teacher-1' },
    } as unknown as Job<{ jobId: string; requestedByUserId: string }>;

    await processor.process(mockJob);
    expect(proxy.runInternalLessonPlanJob).not.toHaveBeenCalled();
  });
});
