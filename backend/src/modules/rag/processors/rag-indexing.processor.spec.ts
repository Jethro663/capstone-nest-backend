import { ConfigService } from '@nestjs/config';
import { RagIndexingProcessor } from './rag-indexing.processor';

describe('RagIndexingProcessor', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('aborts a slow AI indexing request so BullMQ can retry it', async () => {
    jest.useFakeTimers();
    const processor = new RagIndexingProcessor({
      get: jest.fn((key: string) => {
        if (key === 'AI_SERVICE_URL') return 'http://ai-service:8000';
        if (key === 'AI_SERVICE_SHARED_SECRET') return 'test-shared-secret';
        if (key === 'AI_SERVICE_TIMEOUT_INDEXING_MS') return '100';
        return undefined;
      }),
    } as unknown as ConfigService);

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
      name: 'reindex-class',
      data: {
        classId: 'class-1',
        reason: 'lesson_updated',
        queuedAt: '2026-07-14T00:00:00.000Z',
      },
    } as any);
    const assertion = expect(result).rejects.toThrow(
      'AI indexing request timed out after 100ms',
    );

    await jest.advanceTimersByTimeAsync(100);
    await assertion;
  });

  it('keeps the timeout active while consuming a delayed indexing response body', async () => {
    jest.useFakeTimers();
    const processor = new RagIndexingProcessor({
      get: jest.fn((key: string) => {
        if (key === 'AI_SERVICE_URL') return 'http://ai-service:8000';
        if (key === 'AI_SERVICE_SHARED_SECRET') return 'test-shared-secret';
        if (key === 'AI_SERVICE_TIMEOUT_INDEXING_MS') return '100';
        return undefined;
      }),
    } as unknown as ConfigService);
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
      name: 'reindex-class',
      data: {
        classId: 'class-1',
        reason: 'lesson_updated',
        queuedAt: '2026-07-14T00:00:00.000Z',
      },
    } as any);
    const assertion = expect(result).rejects.toThrow(
      'AI indexing request timed out after 100ms',
    );

    await jest.advanceTimersByTimeAsync(100);
    await assertion;
    expect(requestSignal).not.toBeNull();
    expect(requestSignal!.aborted).toBe(true);
  });

  it('fails closed without calling AI when the shared secret is absent', async () => {
    const processor = new RagIndexingProcessor({
      get: jest.fn((key: string) =>
        key === 'AI_SERVICE_URL' ? 'http://ai-service:8000' : undefined,
      ),
    } as unknown as ConfigService);
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 }),
      );

    await expect(
      processor.process({
        name: 'reindex-class',
        data: {
          classId: 'class-1',
          reason: 'lesson_updated',
          queuedAt: '2026-07-14T00:00:00.000Z',
        },
      } as any),
    ).rejects.toThrow('AI_SERVICE_SHARED_SECRET');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects unsupported job names before calling AI', async () => {
    const processor = new RagIndexingProcessor({
      get: jest.fn(),
    } as unknown as ConfigService);
    const fetchMock = jest.spyOn(globalThis, 'fetch');

    await expect(
      processor.process({ name: 'unknown-job', data: {} } as any),
    ).rejects.toThrow('Unsupported rag-indexing job: unknown-job');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
