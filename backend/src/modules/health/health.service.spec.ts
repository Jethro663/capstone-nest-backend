import { ConfigService } from '@nestjs/config';
import { HealthService } from './health.service';
import { DatabaseService } from '../../database/database.service';

jest.mock('ioredis', () =>
  jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue('PONG'),
    disconnect: jest.fn(),
  })),
);

describe('HealthService', () => {
  const mockDatabaseService = {
    ping: jest.fn().mockResolvedValue(undefined),
  } as unknown as DatabaseService;
  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'redis.url') return 'redis://localhost:6379';
      if (key === 'AI_SERVICE_URL') return 'http://localhost:8000';
      return undefined;
    }),
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: { ollamaAvailable: true } }),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reuses the cached readiness result inside the TTL window', async () => {
    const service = new HealthService(mockDatabaseService, mockConfigService);

    const first = await service.getReadiness();
    jest.advanceTimersByTime(10_000);
    const second = await service.getReadiness();

    expect(second).toBe(first);
    expect(mockDatabaseService.ping).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('includes backend and ai service version metadata in readiness status', async () => {
    const previousVersion = process.env.npm_package_version;
    process.env.npm_package_version = '0.0.1-test';
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        data: {
          runtimeAvailable: true,
          version: '1.0.0-test',
        },
      }),
    });

    const service = new HealthService(mockDatabaseService, mockConfigService);
    const readiness = await service.getReadiness();

    expect(readiness.service).toEqual({
      name: 'backend',
      version: '0.0.1-test',
    });
    expect(readiness.dependencies.aiService.version).toBe('1.0.0-test');

    process.env.npm_package_version = previousVersion;
  });

  it('marks ai service degraded when embedding runtime is unavailable', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        data: {
          runtimeAvailable: true,
          runtimeProvider: 'openrouter',
          version: '1.0.0-test',
          embeddingRuntime: {
            ok: false,
            provider: 'openrouter',
            model: 'google/gemini-embedding-2-preview',
            error: 'No successful provider responses',
          },
        },
      }),
    });

    const service = new HealthService(mockDatabaseService, mockConfigService);
    const readiness = await service.getReadiness();

    expect(readiness.ready).toBe(true);
    expect(readiness.dependencies.aiService).toMatchObject({
      ok: true,
      degraded: true,
      runtimeProvider: 'openrouter',
      message: 'AI service reachable but embedding runtime is degraded',
    });
  });

  it('probes ai-service readiness instead of generic health reachability', async () => {
    const service = new HealthService(mockDatabaseService, mockConfigService);

    await service.getReadiness();

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/ready',
      expect.objectContaining({
        method: 'GET',
        headers: { Accept: 'application/json' },
      }),
    );
  });
});
