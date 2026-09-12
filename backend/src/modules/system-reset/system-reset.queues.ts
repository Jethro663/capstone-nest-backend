import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { RESET_QUEUE_NAMES } from './system-reset.catalog';

export type ResetQueuePauseStates = Record<string, boolean>;
export type ResetCleanupLease = { epoch: number; generation: number };

// Durable fencing metadata: never include this key in cleanup or expire it.
const CLEANUP_FENCE_KEY = 'nexora:system-reset:cleanup-fence';
const OPEN_CLEANUP = `
local epoch = tonumber(ARGV[1])
local generation = tonumber(ARGV[2])
if redis.call('EXISTS', KEYS[1]) == 1 then
  local current = redis.call('HMGET', KEYS[1], 'epoch', 'generation', 'state')
  local oldEpoch = tonumber(current[1])
  local oldGeneration = tonumber(current[2])
  if not oldEpoch or not oldGeneration or (current[3] ~= 'open' and current[3] ~= 'closed') then return 0 end
  if epoch < oldEpoch or (epoch == oldEpoch and generation < oldGeneration) then return 0 end
  if epoch == oldEpoch and generation == oldGeneration then
    if current[3] == 'open' then return 1 else return 0 end
  end
end
redis.call('HSET', KEYS[1], 'epoch', ARGV[1], 'generation', ARGV[2], 'state', 'open')
redis.call('PERSIST', KEYS[1])
return 1
`;
const CLOSE_CLEANUP = `
local current = redis.call('HMGET', KEYS[1], 'epoch', 'generation', 'state')
if current[1] ~= ARGV[1] or current[2] ~= ARGV[2] or (current[3] ~= 'open' and current[3] ~= 'closed') then return 0 end
redis.call('HSET', KEYS[1], 'state', 'closed')
redis.call('PERSIST', KEYS[1])
return 1
`;
const FENCED_DELETE = `
local current = redis.call('HMGET', KEYS[1], 'epoch', 'generation', 'state')
if current[1] ~= ARGV[1] or current[2] ~= ARGV[2] or current[3] ~= 'open' then return 0 end
local prefixes = {${RESET_QUEUE_NAMES.map((name) => `'bull:${name}:'`).join(',')}}
-- Validate the entire batch before any deletion; paused metadata is retained.
for i = 2, #KEYS do
  local key = KEYS[i]
  local allowed = string.sub(key, 1, 11) == 'auth:grace:'
  for _, prefix in ipairs(prefixes) do
    if string.sub(key, 1, #prefix) == prefix and key ~= prefix .. 'meta' then allowed = true end
  end
  if not allowed then return 0 end
end
for i = 2, #KEYS do redis.call('DEL', KEYS[i]) end
return 1
`;

export function assertResetQueueScope(keys: string[]) {
  const unknown = [
    ...new Set(
      keys
        .map((key) => key.slice('bull:'.length).split(':')[0])
        .filter((name) => !RESET_QUEUE_NAMES.some((known) => known === name)),
    ),
  ];
  if (unknown.length)
    throw new ConflictException(
      `Unreviewed queue namespace: ${unknown.join(', ')}`,
    );
}

@Injectable()
export class SystemResetQueues {
  constructor(
    private readonly modules: ModuleRef,
    private readonly config: ConfigService,
  ) {}

  private queues(): Queue[] {
    if (
      this.config.get<string>('SYSTEM_RESET_REDIS_OWNERSHIP') !==
      'dedicated-application-database'
    )
      throw new ConflictException(
        'Redis ownership must be explicitly configured before reset.',
      );
    return RESET_QUEUE_NAMES.map((name) => {
      let queue: Queue | undefined;
      try {
        queue = this.modules.get<Queue>(getQueueToken(name), { strict: false });
      } catch {
        /* Missing registered queue is a capability blocker. */
      }
      if (!queue || (queue.opts.prefix && queue.opts.prefix !== 'bull'))
        throw new ConflictException(
          `Reset queue is unavailable or uses an unreviewed prefix: ${name}`,
        );
      return queue;
    });
  }

  private async client() {
    const client = await this.queues()[0].client;
    if ('nodes' in client)
      throw new ConflictException('Redis Cluster reset scope requires review.');
    return client;
  }

  private async fenced(
    script: string,
    lease: ResetCleanupLease,
    keys: string[] = [],
  ): Promise<void> {
    if (
      !lease ||
      !Number.isSafeInteger(lease.epoch) ||
      lease.epoch < 0 ||
      !Number.isSafeInteger(lease.generation) ||
      lease.generation < 1
    )
      throw new ConflictException(
        'A valid Redis cleanup fence lease is required.',
      );
    const client = await this.client();
    const accepted = await client.eval(
      script,
      keys.length + 1,
      CLEANUP_FENCE_KEY,
      ...keys,
      String(lease.epoch),
      String(lease.generation),
    );
    if (accepted !== 1)
      throw new ConflictException(
        'Redis cleanup fence rejected a stale, closed, or invalid lease/scope.',
      );
  }

  async openCleanup(lease: ResetCleanupLease): Promise<void> {
    await this.fenced(OPEN_CLEANUP, lease);
  }

  async closeCleanup(lease: ResetCleanupLease): Promise<void> {
    await this.fenced(CLOSE_CLEANUP, lease);
  }

  private async keys(pattern: string): Promise<string[]> {
    const client = await this.client();
    let cursor = '0';
    const keys = new Set<string>();
    do {
      const result = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 250);
      cursor = result[0];
      for (const key of result[1]) keys.add(key);
    } while (cursor !== '0');
    return [...keys];
  }

  async inspect() {
    const queues = this.queues();
    assertResetQueueScope(await this.keys('bull:*'));
    return Promise.all(
      queues.map(async (queue) => ({
        name: queue.name,
        paused: await queue.isPaused(),
        counts: await queue.getJobCounts(),
        schedulers: await queue.getJobSchedulersCount(),
      })),
    );
  }

  async capturePauseStates(): Promise<ResetQueuePauseStates> {
    return Object.fromEntries(
      (await this.inspect()).map((queue) => [queue.name, queue.paused]),
    );
  }

  async pause() {
    for (const queue of this.queues()) await queue.pause();
  }

  async drained(): Promise<boolean> {
    const queues = await this.inspect();
    return queues.every(
      (queue) => queue.paused && (queue.counts.active ?? 0) === 0,
    );
  }

  async purge(lease: ResetCleanupLease) {
    await this.fenced(FENCED_DELETE, lease);
    if (!(await this.drained()))
      throw new ConflictException(
        'Wait for paused queue workers to finish before cleanup.',
      );
    const queues = this.queues();
    // Keep the paused metadata throughout cleanup. obliterate() removes it and
    // could temporarily expose a queue to a concurrently publishing scheduler.
    // The exact reviewed namespaces are fully cleared only after active=0.
    for (const queue of queues) {
      const keys = (await this.keys(`bull:${queue.name}:*`)).filter(
        (key) => key !== `bull:${queue.name}:meta`,
      );
      for (let i = 0; i < keys.length; i += 250)
        await this.fenced(FENCED_DELETE, lease, keys.slice(i, i + 250));
    }
    const grace = await this.keys('auth:grace:*');
    for (let i = 0; i < grace.length; i += 250)
      await this.fenced(FENCED_DELETE, lease, grace.slice(i, i + 250));
    await this.verify();
    await this.fenced(FENCED_DELETE, lease);
  }

  async verify() {
    const queues = await this.inspect();
    if (
      queues.some(
        (queue) =>
          Object.values(queue.counts).some((count) => count !== 0) ||
          queue.schedulers !== 0,
      )
    )
      throw new ConflictException('Queue verification found remaining jobs.');
    // Idle workers may maintain these operational keys; none contains job data.
    const operational = new Set(['meta', 'stalled-check', 'marker']);
    const residual = (await this.keys('bull:*')).filter(
      (key) => !operational.has(key.split(':').slice(2).join(':')),
    );
    if (residual.length || (await this.keys('auth:grace:*')).length)
      throw new ConflictException(
        'Queue/cache cleanup verification found remaining content.',
      );
  }

  async restore(states: ResetQueuePauseStates) {
    if (
      Object.keys(states).length !== RESET_QUEUE_NAMES.length ||
      RESET_QUEUE_NAMES.some((name) => typeof states[name] !== 'boolean')
    )
      throw new ConflictException(
        'Original queue pause states are unavailable.',
      );
    for (const queue of this.queues()) {
      if (states[queue.name]) await queue.pause();
      else await queue.resume();
    }
  }
}
