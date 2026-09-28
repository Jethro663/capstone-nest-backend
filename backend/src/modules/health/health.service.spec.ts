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
  const originalAppVersion = process.env.APP_VERSION;
  const originalNpmVersion = process.env.npm_package_version;
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
    delete process.env.APP_VERSION;
    delete process.env.npm_package_version;
  });

  afterEach(() => {
    jest.useRealTimers();
    if (originalAppVersion === undefined) delete process.env.APP_VERSION;
    else process.env.APP_VERSION = originalAppVersion;
    if (originalNpmVersion === undefined)
      delete process.env.npm_package_version;
    else process.env.npm_package_version = originalNpmVersion;
  });

  it('uses packaged backend metadata when npm and Railway variables are unavailable', () => {
    const service = new HealthService(mockDatabaseService, mockConfigService);

    expect(service.getServiceMetadata()).toEqual({
      name: 'backend',
      version: '0.0.1',
      gitCommit: 'development',
    });
  });

  it('prefers the CI-pinned deployment revision and ignores blank values', () => {
    process.env.APP_VERSION = ' 0.0.2-release ';
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'APP_VERSION') return process.env.APP_VERSION;
        if (key === 'APP_GIT_COMMIT_SHA') return ' ci-tested-sha ';
        if (key === 'RAILWAY_GIT_COMMIT_SHA') return ' railway-source-sha ';
        return undefined;
      }),
    } as unknown as ConfigService;

    const service = new HealthService(mockDatabaseService, configService);

    expect(service.getServiceMetadata()).toEqual({
      name: 'backend',
      version: '0.0.2-release',
      gitCommit: 'ci-tested-sha',
    });
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
      gitCommit: 'development',
    });
    expect(readiness.dependencies.aiService.version).toBe('1.0.0-test');
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
