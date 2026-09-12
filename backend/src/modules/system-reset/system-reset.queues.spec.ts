import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import {
  assertResetQueueScope,
  ResetCleanupLease,
  SystemResetQueues,
} from './system-reset.queues';

describe('reset queue ownership scope', () => {
  it('allows only the known queue namespaces and leaves unrelated non-Bull keys outside scope', () => {
    expect(() =>
      assertResetQueueScope([
        'bull:announcements:1',
        'bull:rag-indexing:meta',
        'bull:ai-teacher-generation:events',
      ]),
    ).not.toThrow();
  });
  it('blocks an unreviewed queue rather than deleting its jobs', () => {
    expect(() => assertResetQueueScope(['bull:new-feature:1'])).toThrow(
      'new-feature',
    );
  });
});

describe('reset queue cleanup lease validation', () => {
  const modules = { get: jest.fn() };
  const reset = new SystemResetQueues(
    modules as unknown as ModuleRef,
    new ConfigService({
      SYSTEM_RESET_REDIS_OWNERSHIP: 'dedicated-application-database',
    }),
  );
  it.each([
    undefined,
    { epoch: -1, generation: 1 },
    { epoch: 1.5, generation: 1 },
    { epoch: Number.MAX_SAFE_INTEGER + 1, generation: 1 },
    { epoch: 1, generation: 0 },
    { epoch: 1, generation: Number.NaN },
    { epoch: 1, generation: Number.POSITIVE_INFINITY },
    { epoch: 1, generation: Number.MAX_SAFE_INTEGER + 1 },
  ])('rejects invalid lease %j before any Redis access', async (lease) => {
    for (const method of ['openCleanup', 'closeCleanup', 'purge'] as const) {
      await expect(reset[method](lease as ResetCleanupLease)).rejects.toThrow(
        'lease',
      );
    }
    expect(modules.get).not.toHaveBeenCalled();
  });
});
