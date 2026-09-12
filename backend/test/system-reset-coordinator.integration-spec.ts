import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { compare, hash } from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { SystemResetService } from '../src/modules/system-reset/system-reset.service';
import { SystemResetParticipant } from '../src/modules/system-reset/system-reset.participant';
import { runResetWorkContext } from '../src/modules/system-reset/system-reset.context';
import {
  RESET_ACKNOWLEDGEMENTS,
  RESET_QUEUE_NAMES,
} from '../src/modules/system-reset/system-reset.catalog';

const url = process.env.RESET_TEST_DATABASE_URL;
if (!url)
  throw new Error('An explicitly disposable reset database is required.');
const target = new URL(url);
if (
  !['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname) ||
  !/^\/nexora_reset_test_[a-z0-9_]+$/.test(target.pathname)
)
  throw new Error(
    'Refusing coordinator fixtures outside disposable local database.',
  );
const pool = new Pool({
  connectionString: url,
  max: 6,
  statement_timeout: 10000,
});
const database = {
  withConnection: async <T>(work: (client: any) => Promise<T>) => {
    const client = await pool.connect();
    try {
      return await work(client);
    } finally {
      client.release();
    }
  },
};
const adminId = randomUUID(),
  otherId = randomUUID();
const password = 'Disposable-test-only-password';
const ownedAssets = (count: number) => ({
  primary: {
    driver: 'local',
    targetHash: 'owned-test-root',
    ownershipHash: 'owned-test-volume',
    objectCount: count,
    bytes: count,
    fingerprint: `files-${count}`,
  },
  local: [],
});
let inventory = ownedAssets(1),
  paused = false;
const initialPause = Object.fromEntries(
  RESET_QUEUE_NAMES.map((name) => [name, name === 'notifications']),
);
const queues = {
  openCleanup: jest.fn().mockResolvedValue(undefined),
  closeCleanup: jest.fn().mockResolvedValue(undefined),
  inspect: jest.fn().mockResolvedValue([]),
  capturePauseStates: jest.fn().mockResolvedValue({ ...initialPause }),
  pause: jest.fn(() => {
    paused = true;
    return Promise.resolve();
  }),
  drained: jest.fn(() => Promise.resolve(paused)),
  purge: jest.fn().mockResolvedValue(undefined),
  verify: jest.fn().mockResolvedValue(undefined),
  restore: jest.fn(() => {
    paused = false;
    return Promise.resolve();
  }),
};
const assets = {
  inspect: jest.fn(() =>
    Promise.resolve(JSON.parse(JSON.stringify(inventory))),
  ),
  purge: jest.fn(() => {
    inventory = ownedAssets(0);
    return Promise.resolve();
  }),
  verify: jest.fn(() => {
    if (inventory.primary.objectCount) throw new Error('Residual fixture');
    return Promise.resolve();
  }),
};
const configuration = {
  SYSTEM_RESET_ENABLED: 'true',
  SYSTEM_RESET_ENVIRONMENT: 'Disposable rehearsal',
  SYSTEM_RESET_BACKEND_TOPOLOGY: 'single-backend-shared-upload-root',
  SYSTEM_RESET_STORAGE_ID: '11111111-1111-4111-8111-111111111111',
  jwt: { secret: 'disposable-test-secret-must-be-at-least-32-characters' },
};
function service(
  enabled = true,
  assetAdapter: {
    inspect: jest.Mock;
    purge: jest.Mock;
    verify: jest.Mock;
  } = assets,
) {
  return new SystemResetService(
    database as any,
    new ConfigService({
      ...configuration,
      SYSTEM_RESET_ENABLED: String(enabled),
    }),
    queues as any,
    assetAdapter as any,
  );
}
async function confirm(reset = service()) {
  const { policy } = await reset.policy('2027-2028');
  const preview = await reset.preview(
    { schoolYear: '2027-2028', period: policy.periods[0].key },
    adminId,
  );
  const input = {
    previewToken: preview.previewToken,
    idempotencyKey: randomUUID(),
    reason: 'Repeat the disposable onboarding journey',
    currentPassword: password,
    confirmation: preview.confirmation,
    acknowledgements: [...RESET_ACKNOWLEDGEMENTS],
  };
  return { reset, preview, input };
}
async function ack() {
  await pool.query(
    'UPDATE system_reset_instances SET cache_epoch=(SELECT epoch FROM system_reset_state WHERE id=1),in_flight=0',
  );
}
async function operation(id: string) {
  return (
    await pool.query('SELECT * FROM system_reset_operations WHERE id=$1', [id])
  ).rows[0];
}

describe('durable reset coordinator with real PostgreSQL and failure-injected external adapters', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    inventory = ownedAssets(1);
    paused = false;
    await pool.query(
      "UPDATE system_reset_state SET active=false,operation_id=null,epoch=0,storage_generation='legacy' WHERE id=1",
    );
    await pool.query(
      'TRUNCATE users,roles,academic_system_states,academic_year_policies,system_reset_evidence,system_reset_operations,system_reset_instances,app_versions RESTART IDENTITY CASCADE',
    );
    await pool.query(
      "INSERT INTO roles(name) VALUES('admin'),('teacher'),('student')",
    );
    await pool.query(
      "INSERT INTO users(id,email,password,first_name,last_name,is_email_verified) VALUES($1,'reset-admin@example.test',$3,'Reset','Admin',true),($2,'other@example.test',$3,'Other','User',true)",
      [adminId, otherId, await hash(password, 4)],
    );
    await pool.query(
      "INSERT INTO user_roles(user_id,role_id,assigned_by) SELECT $1,id,'fixture' FROM roles WHERE name='admin'",
      [adminId],
    );
    await pool.query(
      "INSERT INTO system_reset_instances(id,kind,cache_epoch,in_flight) VALUES('backend:fixture','backend',0,0),('ai:fixture','ai',0,0)",
    );
  });
  afterAll(async () => {
    await pool.query('UPDATE system_reset_state SET active=false WHERE id=1');
    await pool.end();
  });

  it('keeps a lost-lease backend busy until real work settles and rejects old delayed epochs', async () => {
    const participant = new SystemResetParticipant(
      new ConfigService({ database: { url } }),
      database as any,
      { clearResetCache: jest.fn() } as any,
    );
    let finish!: () => void, entered!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    let work: Promise<void> | undefined;
    try {
      await participant.onModuleInit();
      work = participant.run(async () => {
        entered();
        await pending;
      });
      await started;
      expect(
        (
          await pool.query(
            'SELECT in_flight FROM system_reset_instances WHERE id=$1',
            [participant.id],
          )
        ).rows[0].in_flight,
      ).toBe(1);
      const holder = (
        await pool.query(
          "SELECT pid FROM pg_locks WHERE locktype='advisory' AND objid=78766904 AND mode='ShareLock' AND granted",
        )
      ).rows[0];
      expect(holder).toBeDefined();
      await pool.query('SELECT pg_terminate_backend($1)', [holder.pid]);
      await pool.query(
        "UPDATE system_reset_instances SET heartbeat_at=now()-interval '5 minutes' WHERE id=$1",
        [participant.id],
      );
      await pool.query(
        'UPDATE system_reset_state SET active=true,epoch=1 WHERE id=1',
      );
      await participant.refresh();
      expect(
        (
          await pool.query(
            'SELECT cache_epoch,in_flight FROM system_reset_instances WHERE id=$1',
            [participant.id],
          )
        ).rows[0],
      ).toEqual({ cache_epoch: 0, in_flight: 1 });
      finish();
      await work;
      await participant.refresh();
      expect(
        (
          await pool.query(
            'SELECT cache_epoch,in_flight FROM system_reset_instances WHERE id=$1',
            [participant.id],
          )
        ).rows[0],
      ).toEqual({ cache_epoch: 1, in_flight: 0 });
      await pool.query('UPDATE system_reset_state SET active=false WHERE id=1');
      await participant.refresh();
      const staleWork = jest.fn().mockResolvedValue(undefined);
      await expect(
        runResetWorkContext(0, () => participant.run(staleWork)),
      ).rejects.toThrow();
      expect(staleWork).not.toHaveBeenCalled();
      await participant.run(() => Promise.resolve());
    } finally {
      finish();
      await work;
      await participant.onModuleDestroy();
    }
  });

  it('waits for real work and acknowledges the claimed epoch before graceful shutdown', async () => {
    const participant = new SystemResetParticipant(
      new ConfigService({ database: { url } }),
      database as any,
      { clearResetCache: jest.fn() } as any,
    );
    let finish!: () => void;
    let entered!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    await participant.onModuleInit();
    const work = participant.run(async () => {
      entered();
      await pending;
    });
    await started;
    await pool.query(
      'UPDATE system_reset_state SET active=true,epoch=1 WHERE id=1',
    );
    let shutdownFinished = false;
    const shutdown = participant.onModuleDestroy().then(() => {
      shutdownFinished = true;
    });
    await new Promise((resolve) => setImmediate(resolve));
    expect(shutdownFinished).toBe(false);
    expect(
      (
        await pool.query(
          'SELECT cache_epoch,in_flight FROM system_reset_instances WHERE id=$1',
          [participant.id],
        )
      ).rows[0],
    ).toEqual({ cache_epoch: 0, in_flight: 1 });
    finish();
    await work;
    await shutdown;
    expect(
      (
        await pool.query(
          'SELECT cache_epoch,in_flight,retired FROM system_reset_instances WHERE id=$1',
          [participant.id],
        )
      ).rows[0],
    ).toEqual({ cache_epoch: 1, in_flight: 0, retired: true });
  });

  it('excludes a participant that gracefully retires before reset claim', async () => {
    const participant = new SystemResetParticipant(
      new ConfigService({ database: { url } }),
      database as any,
      { clearResetCache: jest.fn() } as any,
    );
    await participant.onModuleInit();
    await participant.onModuleDestroy();
    expect(
      (
        await pool.query(
          'SELECT cache_epoch,in_flight,retired FROM system_reset_instances WHERE id=$1',
          [participant.id],
        )
      ).rows[0],
    ).toEqual({ cache_epoch: 0, in_flight: 0, retired: true });
    const { reset, input } = await confirm();
    const accepted = await reset.execute(input, adminId);
    expect(
      (await operation(accepted.operationId)).checkpoint.requiredParticipants,
    ).not.toContain(participant.id);
  });

  it('executes once, waits for ACKs, preserves credentials, restores queue states and admits fresh setup', async () => {
    const { reset, input, preview } = await confirm();
    const accepted = await reset.execute(input, adminId);
    expect(accepted.operationId).toBe(input.idempotencyKey);
    await reset.tick();
    expect((await operation(accepted.operationId)).phase).toBe('draining');
    expect(assets.purge).not.toHaveBeenCalled();
    await ack();
    await reset.tick();
    expect(assets.purge).toHaveBeenCalledWith(`g-${accepted.operationId}`);
    expect(await reset.maintenance()).toMatchObject({
      active: false,
      status: 'completed',
      operationId: accepted.operationId,
    });
    const users = (await pool.query('SELECT * FROM users')).rows;
    expect(users).toHaveLength(1);
    expect(users[0].id).toBe(adminId);
    expect(users[0].session_version).toBe(1);
    expect(await compare(password, users[0].password)).toBe(true);
    expect(
      (await pool.query('SELECT * FROM academic_system_states')).rows,
    ).toEqual([
      expect.objectContaining({
        school_year: preview.schoolYear,
        quarter: preview.period,
      }),
    ]);
    expect(queues.restore).toHaveBeenCalledWith(initialPause);
    const replay = await service(false).execute(input, adminId);
    expect(replay.operationId).toBe(input.idempotencyKey);
    expect(
      (
        await pool.query(
          'SELECT count(*)::int AS count FROM system_reset_operations',
        )
      ).rows[0].count,
    ).toBe(1);
    expect(JSON.stringify(await operation(input.idempotencyKey))).not.toContain(
      password,
    );
    await pool.query(
      "INSERT INTO users(email,password,first_name,last_name) VALUES('fresh@example.test','fixture','Fresh','Setup')",
    );
    expect(
      (await pool.query('SELECT count(*)::int AS count FROM users')).rows[0]
        .count,
    ).toBe(2);
  });

  it('serializes simultaneous same-key requests into one durable operation', async () => {
    const { input } = await confirm();
    const results = await Promise.all([
      service().execute(input, adminId),
      service().execute(input, adminId),
    ]);
    expect(new Set(results.map((result) => result.operationId)).size).toBe(1);
    expect(
      (
        await pool.query(
          'SELECT count(*)::int AS count FROM system_reset_operations',
        )
      ).rows[0].count,
    ).toBe(1);
    await expect(
      service().execute(
        { ...input, reason: 'A different reviewed request' },
        adminId,
      ),
    ).rejects.toThrow('different request');
  });

  it('rejects stale file preview without claiming maintenance or deleting data', async () => {
    const { reset, input } = await confirm();
    inventory = ownedAssets(2);
    await expect(reset.execute(input, adminId)).rejects.toThrow(
      'files changed',
    );
    expect(await reset.maintenance()).toMatchObject({
      active: false,
      status: 'idle',
    });
    expect(assets.purge).not.toHaveBeenCalled();
  });

  it('reaps a hard-lost participant only after obtaining exclusive I/O ownership', async () => {
    await pool.query(
      "INSERT INTO system_reset_instances(id,kind,cache_epoch,in_flight) VALUES('ai:lost-idle','ai',0,0)",
    );
    const { reset, input } = await confirm();
    await reset.execute(input, adminId);
    await pool.query(
      "UPDATE system_reset_instances SET cache_epoch=1 WHERE id<>'ai:lost-idle'",
    );
    await pool.query(
      "UPDATE system_reset_instances SET heartbeat_at=now()-interval '5 minutes' WHERE id='ai:lost-idle'",
    );
    const liveWork = await pool.connect();
    try {
      await liveWork.query('SELECT pg_advisory_lock_shared($1)', [78766904]);
      await reset.tick();
      expect((await operation(input.idempotencyKey)).phase).toBe('draining');
      expect(
        (
          await pool.query(
            "SELECT retired,in_flight FROM system_reset_instances WHERE id='ai:lost-idle'",
          )
        ).rows[0],
      ).toEqual({ retired: false, in_flight: 0 });
    } finally {
      await liveWork.query('SELECT pg_advisory_unlock_shared($1)', [78766904]);
      liveWork.release();
    }
    await reset.tick();
    expect(await reset.maintenance()).toMatchObject({
      active: false,
      status: 'completed',
    });
    const completed = await operation(input.idempotencyKey);
    expect(completed.checkpoint.requiredParticipants).toContain('ai:lost-idle');
    expect(completed.checkpoint.hardRetiredParticipants).toContain(
      'ai:lost-idle',
    );
    expect(
      (
        await pool.query(
          "SELECT retired,in_flight FROM system_reset_instances WHERE id='ai:lost-idle'",
        )
      ).rows[0],
    ).toEqual({ retired: true, in_flight: 0 });
    expect(
      (await pool.query('SELECT count(*)::int AS count FROM users')).rows[0]
        .count,
    ).toBe(1);
    expect(assets.purge).toHaveBeenCalled();
    expect(queues.restore).toHaveBeenCalledWith(initialPause);
  });

  it('never auto-retires an expired busy participant without its process ACK', async () => {
    await pool.query(
      "INSERT INTO system_reset_instances(id,kind,cache_epoch,in_flight,heartbeat_at) VALUES('ai:lost-busy','ai',0,1,now()-interval '5 minutes')",
    );
    const { reset, input } = await confirm();
    await reset.execute(input, adminId);
    await pool.query(
      "UPDATE system_reset_instances SET cache_epoch=1 WHERE id<>'ai:lost-busy'",
    );
    await reset.tick();
    expect((await operation(input.idempotencyKey)).phase).toBe('draining');
    expect(
      (
        await pool.query(
          "SELECT retired,in_flight FROM system_reset_instances WHERE id='ai:lost-busy'",
        )
      ).rows[0],
    ).toEqual({ retired: false, in_flight: 1 });
    expect(assets.purge).not.toHaveBeenCalled();
  });

  it('atomically rolls back idle retirement when receipt persistence fails', async () => {
    await pool.query(
      "INSERT INTO system_reset_instances(id,kind,cache_epoch,in_flight) VALUES('ai:atomic-idle','ai',0,0)",
    );
    const { reset, input } = await confirm();
    await reset.execute(input, adminId);
    await pool.query(
      "UPDATE system_reset_instances SET heartbeat_at=now()-interval '5 minutes' WHERE id='ai:atomic-idle'",
    );
    await pool.query(`CREATE OR REPLACE FUNCTION fail_reset_retirement_receipt()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.checkpoint ? 'hardRetiredParticipants'
           AND NOT OLD.checkpoint ? 'hardRetiredParticipants' THEN
          RAISE EXCEPTION 'injected receipt failure';
        END IF;
        RETURN NEW;
      END $$`);
    await pool.query(`CREATE TRIGGER fail_reset_retirement_receipt
      BEFORE UPDATE ON system_reset_operations
      FOR EACH ROW EXECUTE FUNCTION fail_reset_retirement_receipt()`);
    const coordinator = await pool.connect();
    try {
      await coordinator.query('SELECT pg_advisory_lock($1)', [78766904]);
      const current = await operation(input.idempotencyKey);
      await expect(
        (reset as any).retireHardLostParticipants(coordinator, current),
      ).rejects.toThrow('injected receipt failure');
      expect(
        (
          await pool.query(
            "SELECT retired FROM system_reset_instances WHERE id='ai:atomic-idle'",
          )
        ).rows[0].retired,
      ).toBe(false);
      expect(
        (await operation(input.idempotencyKey)).checkpoint
          .hardRetiredParticipants,
      ).toBeUndefined();
      await pool.query(
        'DROP TRIGGER fail_reset_retirement_receipt ON system_reset_operations',
      );
      await (reset as any).retireHardLostParticipants(coordinator, current);
      expect(
        (
          await pool.query(
            "SELECT retired FROM system_reset_instances WHERE id='ai:atomic-idle'",
          )
        ).rows[0].retired,
      ).toBe(true);
      expect(
        (await operation(input.idempotencyKey)).checkpoint
          .hardRetiredParticipants,
      ).toContain('ai:atomic-idle');
    } finally {
      await coordinator.query('SELECT pg_advisory_unlock($1)', [78766904]);
      coordinator.release();
      await pool.query(
        'DROP TRIGGER IF EXISTS fail_reset_retirement_receipt ON system_reset_operations',
      );
      await pool.query(
        'DROP FUNCTION IF EXISTS fail_reset_retirement_receipt()',
      );
    }
  });

  it('resumes post-commit deletion failure after restart with new execution disabled', async () => {
    const { reset, input } = await confirm();
    await reset.execute(input, adminId);
    await ack();
    assets.purge.mockRejectedValueOnce(new Error('Injected storage outage'));
    await reset.tick();
    expect(await reset.maintenance()).toMatchObject({
      active: true,
      phase: 'cleanup',
      retrying: true,
    });
    expect(
      (await operation(input.idempotencyKey)).checkpoint.databaseCommitted,
    ).toBe(true);
    expect(
      (await pool.query('SELECT count(*)::int AS count FROM users')).rows[0]
        .count,
    ).toBe(1);
    await service(false).tick();
    expect(await reset.maintenance()).toMatchObject({
      active: false,
      status: 'completed',
    });
    expect(
      (await pool.query('SELECT session_version FROM users')).rows[0]
        .session_version,
    ).toBe(1);
  });

  it('joins an active cleanup tick before graceful shutdown releases coordinator ownership', async () => {
    const { reset, input } = await confirm();
    await reset.execute(input, adminId);
    await ack();
    let finishPurge!: () => void;
    let enterPurge!: () => void;
    const purgePending = new Promise<void>((resolve) => {
      finishPurge = resolve;
    });
    const purgeStarted = new Promise<void>((resolve) => {
      enterPurge = resolve;
    });
    assets.purge.mockImplementationOnce(async () => {
      enterPurge();
      await purgePending;
      inventory = ownedAssets(0);
    });

    const activeTick = reset.tick();
    await purgeStarted;
    let shutdownFinished = false;
    const shutdown = reset.onModuleDestroy().then(() => {
      shutdownFinished = true;
    });
    await new Promise((resolve) => setImmediate(resolve));
    expect(shutdownFinished).toBe(false);

    await service(false).tick();
    expect(assets.purge).toHaveBeenCalledTimes(1);

    finishPurge();
    await activeTick;
    await shutdown;
    expect(shutdownFinished).toBe(true);
    expect(await reset.maintenance()).toMatchObject({
      active: false,
      status: 'completed',
    });
  });

  it('isolates a new storage generation from a stale delete after coordinator lease loss', async () => {
    const objects = new Map([['legacy/same-name.txt', 'old']]);
    let finishOldDelete!: () => void;
    let enterOldDelete!: () => void;
    const oldDeletePending = new Promise<void>((resolve) => {
      finishOldDelete = resolve;
    });
    const oldDeleteStarted = new Promise<void>((resolve) => {
      enterOldDelete = resolve;
    });
    let purgeCalls = 0;
    let currentGeneration = 'legacy';
    const isolatedAssets = {
      inspect: jest.fn(() => Promise.resolve(ownedAssets(objects.size))),
      purge: jest.fn(async (preserveGeneration: string) => {
        currentGeneration = preserveGeneration;
        purgeCalls++;
        if (purgeCalls === 1) {
          enterOldDelete();
          await oldDeletePending;
        }
        for (const key of [...objects.keys()])
          if (!key.startsWith(`${preserveGeneration}/`)) objects.delete(key);
      }),
      verify: jest.fn(() => {
        if (
          [...objects.keys()].some(
            (key) => !key.startsWith(`${currentGeneration}/`),
          )
        )
          throw new Error('Retired storage remains');
        return Promise.resolve();
      }),
    };
    const reset = service(true, isolatedAssets);
    const { input } = await confirm(reset);
    await reset.execute(input, adminId);
    await ack();
    const staleTick = reset.tick();
    await oldDeleteStarted;

    const holder = (
      await pool.query(
        "SELECT pid FROM pg_locks WHERE locktype='advisory' AND objid=78766902 AND mode='ExclusiveLock' AND granted",
      )
    ).rows[0];
    expect(holder).toBeDefined();
    await pool.query('SELECT pg_terminate_backend($1)', [holder.pid]);

    await service(false, isolatedAssets).tick();
    expect(await reset.maintenance()).toMatchObject({
      active: false,
      status: 'completed',
    });
    const generation = `g-${input.idempotencyKey}`;
    objects.set(`${generation}/same-name.txt`, 'fresh');
    finishOldDelete();
    await staleTick;
    expect(objects.get(`${generation}/same-name.txt`)).toBe('fresh');
    expect(isolatedAssets.purge).toHaveBeenCalledTimes(2);
  });

  it('resumes a failed queue restoration without repeating the database phase', async () => {
    const { reset, input } = await confirm();
    await reset.execute(input, adminId);
    await ack();
    queues.restore.mockRejectedValueOnce(
      new Error('Injected queue restore failure'),
    );
    await reset.tick();
    expect(await reset.maintenance()).toMatchObject({
      active: true,
      phase: 'restoring',
    });
    await service(false).tick();
    expect(await reset.maintenance()).toMatchObject({
      active: false,
      status: 'completed',
    });
    expect(
      (await pool.query('SELECT session_version FROM users')).rows[0]
        .session_version,
    ).toBe(1);
  });
});
