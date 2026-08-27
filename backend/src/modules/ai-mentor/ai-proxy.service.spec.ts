import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpException } from '@nestjs/common';
import { AiProxyService } from './ai-proxy.service';
import { CircuitBreaker } from '../../common/circuit-breaker';

describe('AiProxyService', () => {
  let service: AiProxyService;

  beforeEach(async () => {
    jest.useRealTimers();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiProxyService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'AI_SERVICE_URL') return 'http://localhost:8000';
              if (key === 'AI_SERVICE_TIMEOUT_CHAT_MS') return '70000';
              if (key === 'AI_SERVICE_TIMEOUT_QUIZ_MS') return '180000';
              if (key === 'AI_SERVICE_TIMEOUT_EXTRACTION_MS') return '300000';
              if (key === 'AI_SERVICE_TIMEOUT_INTERNAL_EXTRACTION_MS')
                return '100';
              if (key === 'AI_SERVICE_SHARED_SECRET')
                return 'test-shared-secret';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AiProxyService>(AiProxyService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('uses the chat timeout for mentor and tutor paths', () => {
    expect((service as any).resolveTimeoutMs('/chat')).toBe(70000);
    expect((service as any).resolveTimeoutMs('/mentor/explain')).toBe(70000);
    expect(
      (service as any).resolveTimeoutMs('/student/tutor/session/1/message'),
    ).toBe(70000);
  });

  it('uses a larger aggregate deadline for tutor start', () => {
    expect((service as any).resolveTimeoutMs('/student/tutor/session')).toBe(
      150000,
    );
  });

  it('uses the quiz timeout for teacher quiz paths', () => {
    expect(
      (service as any).resolveTimeoutMs('/teacher/quizzes/generate-draft'),
    ).toBe(180000);
    expect((service as any).resolveTimeoutMs('/teacher/quizzes/jobs')).toBe(
      180000,
    );
  });

  it('uses the extraction timeout for non-chat non-quiz paths', () => {
    expect((service as any).resolveTimeoutMs('/extract')).toBe(300000);
    expect(
      (service as any).resolveTimeoutMs('/index/classes/class-1/status'),
    ).toBe(300000);
  });

  it('keeps the internal transport deadline above the logical extraction timeout', () => {
    expect((service as any).internalTransportTimeoutMs).toBeGreaterThan(
      (service as any).internalExtractionTimeoutMs,
    );
    expect((service as any).internalTransportTimeoutMs).toBe(930000);
  });

  it('logs actionable Undici transport diagnostics for internal extraction failures', async () => {
    const cause = Object.assign(new Error('socket closed'), {
      name: 'SocketError',
      code: 'UND_ERR_SOCKET',
    });
    const transportError = new TypeError('fetch failed', { cause });
    jest.spyOn(globalThis, 'fetch').mockRejectedValueOnce(transportError);
    const logError = jest.spyOn((service as any).logger, 'error');

    await expect(
      service.runInternalExtractionJob('extraction-transport', {
        bullmqJobId: 'extraction-extraction-transport',
        attempt: 2,
      }),
    ).rejects.toBe(transportError);

    expect(logError).toHaveBeenCalledWith(
      expect.stringMatching(
        /module extraction extraction-transport transport failed after \d+ms \(attempt=2, error=TypeError, code=UND_ERR_SOCKET, cause=SocketError: socket closed\)/,
      ),
    );
  });

  it('runs extraction jobs through the shared-secret internal endpoint', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 }),
      );

    await service.runInternalExtractionJob('extraction-123', {
      bullmqJobId: 'extraction-extraction-123',
      attempt: 2,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/internal/extractions/extraction-123/run',
      expect.objectContaining({
        method: 'POST',
        dispatcher: expect.anything(),
        headers: expect.objectContaining({
          'X-Internal-Service-Token': 'test-shared-secret',
        }),
        body: JSON.stringify({
          bullmqJobId: 'extraction-extraction-123',
          attempt: 2,
        }),
      }),
    );
  });

  it('marks a stranded teacher AI job failed through the internal boundary', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 }),
      );

    await service.markInternalTeacherJobFailed(
      'job-123',
      'BullMQ enqueue failed: Redis unavailable',
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/internal/teacher/jobs/job-123/fail',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Internal-Service-Token': 'test-shared-secret',
        }),
        body: JSON.stringify({
          reason: 'BullMQ enqueue failed: Redis unavailable',
          expectedStatus: 'pending',
        }),
      }),
    );
  });

  it('fails closed before an internal AI job when the shared secret is absent', async () => {
    const unconfigured = new AiProxyService({
      get: jest.fn((key: string) =>
        key === 'AI_SERVICE_URL' ? 'http://localhost:8000' : undefined,
      ),
    } as unknown as ConfigService);
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 }),
      );

    await expect(
      unconfigured.runInternalExtractionJob('extraction-123', {}),
    ).rejects.toThrow('AI_SERVICE_SHARED_SECRET');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails closed before forwarding user context when the secret is absent', async () => {
    const unconfigured = new AiProxyService({
      get: jest.fn((key: string) =>
        key === 'AI_SERVICE_URL' ? 'http://localhost:8000' : undefined,
      ),
    } as unknown as ConfigService);
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 }),
      );

    await expect(
      unconfigured.forward('POST', '/chat', {
        id: 'student-1',
        email: 'student@example.com',
        roles: ['student'],
      }),
    ).rejects.toMatchObject({ status: 503 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses a 70 second chat deadline when no override is configured', () => {
    const defaultConfig = new AiProxyService({
      get: jest.fn((key: string) =>
        key === 'AI_SERVICE_SHARED_SECRET' ? 'test-shared-secret' : undefined,
      ),
    } as unknown as ConfigService);

    expect((defaultConfig as any).resolveTimeoutMs('/chat')).toBe(70000);
    expect((defaultConfig as any).lessonPlanTimeoutMs).toBe(900000);
    expect((defaultConfig as any).internalQuizTimeoutMs).toBe(900000);
    expect((defaultConfig as any).internalInterventionTimeoutMs).toBe(900000);
    expect((defaultConfig as any).internalExtractionTimeoutMs).toBe(900000);
  });

  it('converts an exhausted chat deadline into a clear 504', async () => {
    jest.useFakeTimers();
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

    const request = service.forward('POST', '/chat', {
      id: 'student-1',
      roles: ['student'],
    });
    const assertion = expect(request).rejects.toMatchObject({ status: 504 });

    await jest.advanceTimersByTimeAsync(70000);
    await assertion;
  });

  it('keeps the chat deadline active while consuming a delayed response body', async () => {
    jest.useFakeTimers();
    let requestSignal: AbortSignal | null = null;

    jest.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      requestSignal = init?.signal ?? null;
      return {
        ok: true,
        status: 200,
        text: () =>
          new Promise<string>((_resolve, reject) => {
            requestSignal?.addEventListener('abort', () => {
              const error = new Error('aborted during body read');
              error.name = 'AbortError';
              reject(error);
            });
          }),
      } as Response;
    });

    const request = service.forward('POST', '/chat', {
      id: 'student-1',
      roles: ['student'],
    });
    const assertion = expect(request).rejects.toMatchObject({ status: 504 });

    await jest.advanceTimersByTimeAsync(70000);
    await assertion;
    expect(requestSignal).not.toBeNull();
    expect(requestSignal!.aborted).toBe(true);
  });

  it('keeps the internal job deadline active while consuming a delayed response body', async () => {
    jest.useFakeTimers();
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

    const request = service.runInternalExtractionJob('extraction-123', {
      bullmqJobId: 'extraction-extraction-123',
      attempt: 1,
    });
    const assertion = expect(request).rejects.toThrow(
      'ai-service internal execution timed out after 100ms for module extraction extraction-123',
    );

    await jest.advanceTimersByTimeAsync(100);
    await assertion;
    expect(requestSignal).not.toBeNull();
    expect(requestSignal!.aborted).toBe(true);
  });

  it('converts AI service connection failures into a clear 503', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new TypeError('fetch failed'));

    try {
      await service.forward('GET', '/index/classes/class-1/status', {
        id: 'teacher-1',
        email: 'teacher1@lms.local',
        roles: ['teacher'],
      });
      throw new Error('Expected forward to reject');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      const httpError = error as HttpException;
      expect(httpError.getStatus()).toBe(503);
      expect(httpError.getResponse()).toEqual({
        message:
          'AI service is unavailable. Start the AI service and try again.',
      });
    }
  });

  describe('Circuit breaker', () => {
    it('returns CLOSED state initially', () => {
      const state = service.getCircuitBreakerState();
      expect(state.state).toBe('CLOSED');
      expect(state.consecutiveFailures).toBe(0);
      expect(state.cooldownRemainingMs).toBe(0);
    });

    it('transitions to OPEN after 5 consecutive failures', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new TypeError('fetch failed'));

      for (let i = 0; i < 5; i++) {
        try {
          await service.forward('GET', '/test', { id: '1', roles: [] });
        } catch {
          // expected
        }
      }

      const state = service.getCircuitBreakerState();
      expect(state.state).toBe('OPEN');
      expect(state.cooldownRemainingMs).toBeGreaterThan(0);
    });

    it('fast-fails with 503 when OPEN (no fetch attempt)', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new TypeError('fetch failed'));

      // Trip the breaker
      for (let i = 0; i < 5; i++) {
        try {
          await service.forward('GET', '/test', { id: '1', roles: [] });
        } catch {
          // expected
        }
      }

      // Clear all mocks — only care about calls AFTER this point
      jest.restoreAllMocks();

      const fetchSpy = jest
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new TypeError('fetch failed'));

      try {
        await service.forward('GET', '/test', { id: '1', roles: [] });
        throw new Error('Expected rejection');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        const httpError = error as HttpException;
        expect(httpError.getStatus()).toBe(503);
        const resp = httpError.getResponse() as { message: string };
        expect(resp.message).toContain('temporarily unavailable');
      }
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('transitions to HALF_OPEN after cooldown elapses', async () => {
      jest.useFakeTimers();
      jest
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new TypeError('fetch failed'));

      // Trip the breaker
      for (let i = 0; i < 5; i++) {
        try {
          await service.forward('GET', '/test', { id: '1', roles: [] });
        } catch {
          // expected
        }
      }

      expect(service.getCircuitBreakerState().state).toBe('OPEN');

      // Advance past cooldown
      jest.advanceTimersByTime(60_000);

      // Next request should attempt fetch (HALF_OPEN)
      jest
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ ok: true }), { status: 200 }),
        );

      await service.forward('GET', '/test', { id: '1', roles: [] });
      expect(globalThis.fetch).toHaveBeenCalled();
    });

    it('transitions back to CLOSED on successful probe in HALF_OPEN', async () => {
      jest.useFakeTimers();
      jest
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new TypeError('fetch failed'));

      for (let i = 0; i < 5; i++) {
        try {
          await service.forward('GET', '/test', { id: '1', roles: [] });
        } catch {
          // expected
        }
      }

      jest.advanceTimersByTime(60_000);

      jest
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ ok: true }), { status: 200 }),
        );

      await service.forward('GET', '/test', { id: '1', roles: [] });
      expect(service.getCircuitBreakerState().state).toBe('CLOSED');
    });

    it('transitions back to OPEN on failed probe in HALF_OPEN', async () => {
      jest.useFakeTimers();
      jest
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new TypeError('fetch failed'));

      for (let i = 0; i < 5; i++) {
        try {
          await service.forward('GET', '/test', { id: '1', roles: [] });
        } catch {
          // expected
        }
      }

      jest.advanceTimersByTime(60_000);

      // Probe fails
      jest
        .spyOn(globalThis, 'fetch')
        .mockRejectedValueOnce(new TypeError('fetch failed'));

      try {
        await service.forward('GET', '/test', { id: '1', roles: [] });
      } catch {
        // expected
      }

      expect(service.getCircuitBreakerState().state).toBe('OPEN');
    });

    it('resets failure count on success', async () => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new TypeError('fetch failed'));

      // 4 failures (below threshold)
      for (let i = 0; i < 4; i++) {
        try {
          await service.forward('GET', '/test', { id: '1', roles: [] });
        } catch {
          // expected
        }
      }

      expect(service.getCircuitBreakerState().consecutiveFailures).toBe(4);

      // Success resets counter
      jest
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ ok: true }), { status: 200 }),
        );
      await service.forward('GET', '/test', { id: '1', roles: [] });

      expect(service.getCircuitBreakerState().consecutiveFailures).toBe(0);
      expect(service.getCircuitBreakerState().state).toBe('CLOSED');
    });

    it('does not trip on 4xx responses from AI service', async () => {
      jest.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ detail: 'not found' }), {
          status: 404,
        }),
      );

      try {
        await service.forward('GET', '/nonexistent', { id: '1', roles: [] });
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(404);
      }

      expect(service.getCircuitBreakerState().consecutiveFailures).toBe(0);
      expect(service.getCircuitBreakerState().state).toBe('CLOSED');
    });

    it('trips on 5xx responses from AI service', async () => {
      jest.spyOn(globalThis, 'fetch').mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ detail: 'internal error' }), {
            status: 500,
          }),
        ),
      );

      for (let i = 0; i < 5; i++) {
        try {
          await service.forward('GET', '/test', { id: '1', roles: [] });
        } catch {
          // expected
        }
      }

      expect(service.getCircuitBreakerState().state).toBe('OPEN');
    });
  });
});
