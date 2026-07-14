import { RagIndexingService } from './rag-indexing.service';

describe('RagIndexingService', () => {
  it('queues a retryable class reindex with active-job deduplication', async () => {
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
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        deduplication: {
          id: 'reindex:class-1',
          keepLastIfActive: true,
        },
      }),
    );

    const options = queue.add.mock.calls[0][2];
    expect(options).not.toHaveProperty('jobId');
  });
});
