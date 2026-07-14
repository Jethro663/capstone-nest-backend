import { LibraryIndexingService } from './library-indexing.service';

describe('LibraryIndexingService', () => {
  it('queues retryable file indexing with active-job deduplication', async () => {
    const queue = { add: jest.fn().mockResolvedValue(undefined) };
    const service = new LibraryIndexingService(queue as never);

    await service.queueFileIndex('file-1', {
      reason: 'metadata_update',
      actorId: 'teacher-1',
    });

    expect(queue.add).toHaveBeenCalledWith(
      'index-library-file',
      expect.objectContaining({ fileId: 'file-1', actorId: 'teacher-1' }),
      expect.objectContaining({
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        deduplication: {
          id: 'library-file:file-1',
          keepLastIfActive: true,
        },
      }),
    );
  });
});
