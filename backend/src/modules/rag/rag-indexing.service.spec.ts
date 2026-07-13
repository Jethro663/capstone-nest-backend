import { RagIndexingService } from './rag-indexing.service';

describe('RagIndexingService', () => {
  it('queues a deterministic, retryable class reindex job', async () => {
    const queue = { add: jest.fn().mockResolvedValue(undefined) };
    const service = new RagIndexingService(queue as never);

    await service.queueClassReindex('class-1', {
      reason: 'assessment_published',
      actorId: 'teacher-1',
    });

    expect(queue.add).toHaveBeenCalledWith(
      'reindex-class',
      expect.objectContaining({ classId: 'class-1', actorId: 'teacher-1' }),
      expect.objectContaining({
        jobId: 'reindex:class-1',
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      }),
    );
  });

  it('treats an already-waiting job as an idempotent success', async () => {
    const queue = {
      add: jest.fn().mockRejectedValue(new Error('Job is already waiting')),
    };
    const service = new RagIndexingService(queue as never);

    await expect(
      service.queueClassReindex('class-1', { reason: 'duplicate' }),
    ).resolves.toBeUndefined();
  });
});
