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
});
