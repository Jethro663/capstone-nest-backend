import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { LibraryIndexStatusDto } from '../dto/file-upload.dto';
import { LibraryIndexingProcessor } from './library-indexing.processor';

describe('LibraryIndexingProcessor', () => {
  const buildDatabase = () => {
    const updates: Array<Record<string, unknown>> = [];
    const db = {
      update: jest.fn(() => ({
        set: jest.fn((values: Record<string, unknown>) => {
          updates.push(values);
          return { where: jest.fn().mockResolvedValue(undefined) };
        }),
      })),
    };
    return { databaseService: { db }, updates };
  };

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('aborts a slow request, marks the file failed, and rethrows for retry', async () => {
    jest.useFakeTimers();
    const { databaseService, updates } = buildDatabase();
    const processor = new LibraryIndexingProcessor(
      {
        get: jest.fn((key: string) => {
          if (key === 'AI_SERVICE_URL') return 'http://ai-service:8000';
          if (key === 'AI_SERVICE_SHARED_SECRET') return 'test-shared-secret';
          if (key === 'AI_SERVICE_TIMEOUT_INDEXING_MS') return '100';
          return undefined;
        }),
      } as unknown as ConfigService,
      databaseService as any,
      { log: jest.fn() } as any,
    );

    jest.spyOn(globalThis, 'fetch').mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        const signal = init?.signal;
        if (!signal) {
          reject(new Error('missing abort signal'));
          return;
        }
        signal.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        });
      });
    });

    const result = processor.process({
      name: 'index-library-file',
      data: {
        fileId: 'file-1',
        reason: 'upload',
        queuedAt: '2026-07-14T00:00:00.000Z',
      },
    } as any);
    const assertion = expect(result).rejects.toThrow(
      'AI library indexing timed out after 100ms',
    );

    await jest.advanceTimersByTimeAsync(100);
    await assertion;
    expect(updates.at(-1)).toEqual(
      expect.objectContaining({
        indexStatus: LibraryIndexStatusDto.Failed,
        indexError: expect.stringContaining('timed out after 100ms'),
      }),
    );
  });

  it('keeps the timeout active while consuming a delayed indexing response body', async () => {
    jest.useFakeTimers();
    const { databaseService, updates } = buildDatabase();
    const processor = new LibraryIndexingProcessor(
      {
        get: jest.fn((key: string) => {
          if (key === 'AI_SERVICE_URL') return 'http://ai-service:8000';
          if (key === 'AI_SERVICE_SHARED_SECRET') return 'test-shared-secret';
          if (key === 'AI_SERVICE_TIMEOUT_INDEXING_MS') return '100';
          return undefined;
        }),
      } as unknown as ConfigService,
      databaseService as any,
      { log: jest.fn() } as any,
    );
    let requestSignal: AbortSignal | null = null;

    jest.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      requestSignal = init?.signal ?? null;
      return {
        ok: true,
        status: 200,
        json: () =>
          new Promise<unknown>((_resolve, reject) => {
            requestSignal?.addEventListener('abort', () => {
              const error = new Error('aborted during body read');
              error.name = 'AbortError';
              reject(error);
            });
          }),
      } as Response;
    });

    const result = processor.process({
      name: 'index-library-file',
      data: {
        fileId: 'file-1',
        reason: 'upload',
        queuedAt: '2026-07-14T00:00:00.000Z',
      },
    } as any);
    const assertion = expect(result).rejects.toThrow(
      'AI library indexing timed out after 100ms',
    );

    await jest.advanceTimersByTimeAsync(100);
    await assertion;
    expect(requestSignal).not.toBeNull();
    expect(requestSignal!.aborted).toBe(true);
    expect(updates.at(-1)).toEqual(
      expect.objectContaining({
        indexStatus: LibraryIndexStatusDto.Failed,
        indexError: expect.stringContaining('timed out after 100ms'),
      }),
    );
  });

  it('fails closed without calling AI when the shared secret is absent', async () => {
    const { databaseService, updates } = buildDatabase();
    const processor = new LibraryIndexingProcessor(
      { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService,
      databaseService as any,
      { log: jest.fn() } as any,
    );
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 }),
      );

    await expect(
      processor.process({
        name: 'index-library-file',
        data: {
          fileId: 'file-1',
          reason: 'upload',
          queuedAt: '2026-07-14T00:00:00.000Z',
        },
      } as any),
    ).rejects.toThrow('AI_SERVICE_SHARED_SECRET');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(updates.at(-1)).toEqual(
      expect.objectContaining({ indexStatus: LibraryIndexStatusDto.Failed }),
    );
  });

  it('rejects unsupported job names without mutating file state', async () => {
    const { databaseService, updates } = buildDatabase();
    const processor = new LibraryIndexingProcessor(
      { get: jest.fn() } as unknown as ConfigService,
      databaseService as any,
      { log: jest.fn() } as any,
    );

    await expect(
      processor.process({ name: 'unknown-job', data: {} } as any),
    ).rejects.toThrow('Unsupported library-indexing job: unknown-job');
    expect(updates).toHaveLength(0);
  });
});
