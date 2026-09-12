import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue, Worker } from 'bullmq';
import {
  ResetCleanupLease,
  SystemResetQueues,
} from '../src/modules/system-reset/system-reset.queues';
import { RESET_QUEUE_NAMES } from '../src/modules/system-reset/system-reset.catalog';

const value = process.env.RESET_TEST_REDIS_URL;
if (!value)
  throw new Error(
    'RESET_TEST_REDIS_URL must identify the disposable reset Redis on local port16379.',
  );
const url = new URL(value);
if (
  !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
  url.port !== '16379'
)
  throw new Error(
    'Refusing queue cleanup outside the dedicated local reset test Redis port16379.',
  );

describe('reset queues with real disposable Redis/BullMQ', () => {
  const queues = RESET_QUEUE_NAMES.map(
    (name) =>
      new Queue(name, {
        connection: { url: value },
        defaultJobOptions: { removeOnComplete: false },
      }),
  );
  const registry = new Map(
    queues.map((queue) => [getQueueToken(queue.name), queue]),
  );
  const reset = new SystemResetQueues(
    { get: (token: string) => registry.get(token) } as unknown as ModuleRef,
    new ConfigService({
      SYSTEM_RESET_REDIS_OWNERSHIP: 'dedicated-application-database',
    }),
  );
  const fenceKey = 'nexora:system-reset:cleanup-fence';
  const fenced = reset;
  let lease: ResetCleanupLease;
  beforeEach(async () => {
    // Only this explicitly disposable fixture: scoped cleanup, no FLUSH and no
    // fence removal. Read its epoch so the suite can run repeatedly unchanged.
    const client = await queues[0].client;
    for (const pattern of [
      ...RESET_QUEUE_NAMES.map((name) => `bull:${name}:*`),
      'auth:grace:*',
    ]) {
      const keys = await client.keys(pattern);
      if (keys.length) await client.del(...keys);
    }
    for (const queue of queues) await queue.resume();
    lease = {
      epoch: Number((await client.hget(fenceKey, 'epoch')) ?? 0) + 1,
      generation: 1,
    };
  });
  afterAll(async () => {
    await Promise.all(queues.map((queue) => queue.close()));
  });

  it('refuses unowned Redis before touching queues', async () => {
    const denied = new SystemResetQueues(
      {
        get: () => {
          throw new Error('must not reach Redis');
        },
      } as unknown as ModuleRef,
      new ConfigService(),
    );
    await expect(denied.inspect()).rejects.toThrow('ownership');
  });

  it('keeps global pause while clearing jobs/schedulers/grace, preserves unrelated keys, and restores prior pause states', async () => {
    const client = await queues[0].client;
    await client.set('unrelated:keep', 'outside-reset');
    await queues[0].pause();
    const previous = await reset.capturePauseStates();
    expect(previous.announcements).toBe(true);
    expect(previous.notifications).toBe(false);
    await reset.pause();
    for (const queue of queues) {
      await queue.add('old-school-job', { studentName: 'Disposable Student' });
      await queue.add('old-delayed-job', { old: true }, { delay: 60000 });
    }
    await queues[1].upsertJobScheduler(
      'old-repeat',
      { every: 60000 },
      { name: 'old-school-repeat', data: { old: true } },
    );
    await client.set('auth:grace:old-token', 'old-sensitive-session');
    expect(await reset.drained()).toBe(true);
    await fenced.openCleanup(lease);
    await fenced.purge(lease);
    await reset.verify();
    expect(await client.get('unrelated:keep')).toBe('outside-reset');
    expect(await client.get('auth:grace:old-token')).toBeNull();
    expect((await reset.inspect()).every((queue) => queue.paused)).toBe(true);
    await fenced.closeCleanup(lease);
    await reset.restore(previous);
    expect(await queues[0].isPaused()).toBe(true);
    expect(await queues[1].isPaused()).toBe(false);
  });

  it('blocks an unreviewed namespace without deleting it', async () => {
    const client = await queues[0].client;
    await client.set('bull:unreviewed-school-feature:1', 'keep until reviewed');
    await expect(reset.inspect()).rejects.toThrow('unreviewed-school-feature');
    expect(await client.get('bull:unreviewed-school-feature:1')).toBe(
      'keep until reviewed',
    );
    await client.del('bull:unreviewed-school-feature:1');
  });

  it('does not delete an active worker job; cleanup proceeds only after the processor actually exits', async () => {
    const queue = queues[2];
    await queue.resume();
    let entered!: () => void, finish!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const worker = new Worker(
      queue.name,
      async () => {
        entered();
        await pending;
      },
      { connection: { url: value } },
    );
    try {
      const job = await queue.add('in-flight-old-job', {
        source: 'old-school',
      });
      await started;
      await reset.pause();
      expect(await reset.drained()).toBe(false);
      await fenced.openCleanup(lease);
      await expect(fenced.purge(lease)).rejects.toThrow('workers to finish');
      expect(await job.getState()).toBe('active');
      finish();
      await worker.close();
      expect(await reset.drained()).toBe(true);
      await fenced.purge(lease);
      expect(await queue.getJob(job.id!)).toBeUndefined();
    } finally {
      finish();
      await worker.close();
    }
  });

  it('orders leases by epoch then generation and cannot reopen the same closed lease', async () => {
    const client = await queues[0].client;
    await fenced.openCleanup(lease);
    await fenced.openCleanup(lease);
    const newer = { ...lease, generation: 2 };
    await fenced.openCleanup(newer);
    await expect(fenced.openCleanup(lease)).rejects.toThrow('fence');
    await expect(fenced.closeCleanup(lease)).rejects.toThrow('fence');
    await fenced.closeCleanup(newer);
    await fenced.closeCleanup(newer);
    await expect(fenced.openCleanup(newer)).rejects.toThrow('fence');
    expect(await client.hget(fenceKey, 'state')).toBe('closed');
    await fenced.openCleanup({ epoch: lease.epoch + 1, generation: 1 });
    await expect(
      fenced.openCleanup({ epoch: lease.epoch, generation: 999 }),
    ).rejects.toThrow('fence');
  });

  it('requires an installed open lease even when there is no content to delete', async () => {
    await reset.pause();
    await expect(fenced.purge(lease)).rejects.toThrow('fence');
    await fenced.openCleanup(lease);
    await fenced.purge(lease);
    await fenced.closeCleanup(lease);
    await expect(fenced.purge(lease)).rejects.toThrow('fence');
  });

  it.each([
    ['bull:announcements:old-job', 'newer-open'],
    ['auth:grace:old-token', 'newer-open'],
    ['bull:announcements:old-job', 'newer-closed'],
    ['auth:grace:old-token', 'newer-closed'],
    ['bull:announcements:old-job', 'same-closed'],
    ['auth:grace:old-token', 'same-closed'],
  ])(
    'rejects an already dispatched delayed delete of %s with a %s fence',
    async (target, transition) => {
      const client = await queues[0].client;
      await reset.pause();
      await fenced.openCleanup(lease);
      await client.set(target, 'old-content');
      const originalEval = client.eval.bind(client);
      let entered!: () => void;
      let release!: () => void;
      const dispatched = new Promise<void>((resolve) => {
        entered = resolve;
      });
      const delayed = new Promise<void>((resolve) => {
        release = resolve;
      });
      // Delay only transport of this real destructive Lua invocation, then run
      // the original Lua against real Redis after ownership changes.
      const spy = jest
        .spyOn(client, 'eval')
        .mockImplementation(async (...args: any[]) => {
          if (args.includes(target)) {
            entered();
            await delayed;
          }
          return originalEval(...args);
        });
      const oldPurge = fenced.purge(lease);
      const rejected = expect(oldPurge).rejects.toThrow('fence');
      try {
        await dispatched;
        const next =
          transition === 'same-closed' ? lease : { ...lease, generation: 2 };
        await fenced.openCleanup(next);
        if (transition !== 'newer-open') {
          await fenced.closeCleanup(next);
          await reset.restore(
            Object.fromEntries(RESET_QUEUE_NAMES.map((name) => [name, false])),
          );
        }
        await client.set(target, 'new-school-content');
        release();
        await rejected;
        expect(await client.get(target)).toBe('new-school-content');
        expect(await client.hget(fenceKey, 'state')).toBe(
          transition === 'newer-open' ? 'open' : 'closed',
        );
      } finally {
        release();
        spy.mockRestore();
      }
    },
  );

  it.each(['same', 'newer'])(
    'rejects a delayed old open after the %s lease has closed',
    async (transition) => {
      const client = await queues[0].client;
      await fenced.openCleanup(lease);
      const originalEval = client.eval.bind(client);
      let release!: () => void;
      let entered!: () => void;
      const dispatched = new Promise<void>((resolve) => {
        entered = resolve;
      });
      const delayed = new Promise<void>((resolve) => {
        release = resolve;
      });
      let first = true;
      const spy = jest
        .spyOn(client, 'eval')
        .mockImplementation(async (...args: any[]) => {
          if (first) {
            first = false;
            entered();
            await delayed;
          }
          return originalEval(...args);
        });
      const oldOpen = fenced.openCleanup(lease);
      const rejected = expect(oldOpen).rejects.toThrow('fence');
      try {
        await dispatched;
        const next =
          transition === 'same' ? lease : { ...lease, generation: 2 };
        await fenced.openCleanup(next);
        await fenced.closeCleanup(next);
        release();
        await rejected;
        expect(await client.hget(fenceKey, 'state')).toBe('closed');
        expect(await client.hget(fenceKey, 'generation')).toBe(
          String(next.generation),
        );
      } finally {
        release();
        spy.mockRestore();
      }
    },
  );

  it('checks the fence on a second deletion batch, not just at purge entry', async () => {
    const client = await queues[0].client;
    await reset.pause();
    await fenced.openCleanup(lease);
    const pipeline = client.pipeline();
    for (let i = 0; i < 300; i++)
      pipeline.set(`auth:grace:batch-${i}`, 'old-content');
    await pipeline.exec();
    const originalEval = client.eval.bind(client);
    let batches = 0;
    const spy = jest
      .spyOn(client, 'eval')
      .mockImplementation(async (...args: any[]) => {
        if (
          args.some(
            (arg) =>
              typeof arg === 'string' && arg.startsWith('auth:grace:batch-'),
          )
        ) {
          if (++batches === 2) await fenced.closeCleanup(lease);
        }
        return originalEval(...args);
      });
    try {
      await expect(fenced.purge(lease)).rejects.toThrow('fence');
      expect(batches).toBe(2);
      expect(await client.keys('auth:grace:batch-*')).toHaveLength(50);
    } finally {
      spy.mockRestore();
    }
  });
});
