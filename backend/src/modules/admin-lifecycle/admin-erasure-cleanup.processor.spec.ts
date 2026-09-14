import { AdminErasureCleanupProcessor } from './admin-erasure-cleanup.processor';

describe('AdminErasureCleanupProcessor', () => {
  it('deletes every captured object idempotently and completes the receipt', async () => {
    const where = jest.fn().mockResolvedValue([]);
    const db = {
      query: {
        adminErasureOperations: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'operation-id',
            status: 'cleanup_pending',
            items: [
              {
                id: 'item-id',
                storageObjects: [
                  { key: 'classes/one.pdf', bytes: 10 },
                  { key: 'classes/two.pdf', bytes: 20 },
                ],
              },
            ],
          }),
        },
      },
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({ where }),
      }),
    };
    const storage = { deleteObject: jest.fn().mockResolvedValue(undefined) };
    const processor = new AdminErasureCleanupProcessor(
      { db } as never,
      storage as never,
    );

    await expect(
      processor.process({
        name: 'cleanup-operation',
        data: { operationId: 'operation-id' },
      } as never),
    ).resolves.toEqual({
      operationId: 'operation-id',
      deletedObjectCount: 2,
      failedObjectCount: 0,
      status: 'completed',
    });
    expect(storage.deleteObject).toHaveBeenCalledTimes(2);
  });

  it('keeps database deletion complete and records retryable cleanup failure', async () => {
    const updates: Array<Record<string, unknown>> = [];
    const db = {
      query: {
        adminErasureOperations: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'operation-id',
            status: 'cleanup_pending',
            items: [
              {
                id: 'item-id',
                storageObjects: [{ key: 'classes/failure.pdf', bytes: 10 }],
              },
            ],
          }),
        },
      },
      update: jest.fn().mockReturnValue({
        set: jest.fn((value: Record<string, unknown>) => {
          updates.push(value);
          return { where: jest.fn().mockResolvedValue([]) };
        }),
      }),
    };
    const processor = new AdminErasureCleanupProcessor(
      { db } as never,
      {
        deleteObject: jest.fn().mockRejectedValue(new Error('storage offline')),
      } as never,
    );

    await expect(
      processor.process({
        name: 'cleanup-operation',
        data: { operationId: 'operation-id' },
      } as never),
    ).rejects.toThrow('retryable failure');
    expect(updates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: 'cleanup_failed' }),
        expect.objectContaining({ status: 'completed_with_cleanup_errors' }),
      ]),
    );
  });
});
