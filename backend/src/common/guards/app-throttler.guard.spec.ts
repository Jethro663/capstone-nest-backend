import { Reflector } from '@nestjs/core';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';
import { AppThrottlerGuard } from './app-throttler.guard';

class TestAppThrottlerGuard extends AppThrottlerGuard {
  async exposeTracker(req: Record<string, any>) {
    return this.getTracker(req);
  }
}

describe('AppThrottlerGuard', () => {
  const options: ThrottlerModuleOptions = [
    {
      limit: 300,
      ttl: 60_000,
    },
  ];
  const storage = {
    increment: jest.fn(),
  } as any;
  const reflector = new Reflector();

  it('prefers authenticated userId over IP address', async () => {
    const guard = new TestAppThrottlerGuard(options, storage, reflector);

    await expect(
      guard.exposeTracker({
        user: { userId: 'admin-1' },
        ip: '127.0.0.1',
      }),
    ).resolves.toBe('user:admin-1');
  });

  it('falls back to the forwarded IP address for anonymous requests', async () => {
    const guard = new TestAppThrottlerGuard(options, storage, reflector);

    await expect(
      guard.exposeTracker({
        headers: {
          'x-forwarded-for': '10.0.0.7, 10.0.0.8',
        },
        ip: '127.0.0.1',
      }),
    ).resolves.toBe('ip:10.0.0.7');
  });
});
