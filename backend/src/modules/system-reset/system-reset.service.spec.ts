import { ConfigService } from '@nestjs/config';
import { SystemResetService } from './system-reset.service';
import { hashResetRequest } from './system-reset.manifest';
import { EventEmitter } from 'node:events';

describe('SystemResetService API safeguards', () => {
  const actor = {
    id: 'actor',
    email: 'admin@example.test',
    displayName: 'Admin',
    password: 'hash',
  };
  const query = jest.fn();
  const database = {
    withConnection: (work: (client: any) => Promise<unknown>) =>
      work({ query }),
  };
  const assets = { inspect: jest.fn() };
  const queues = { inspect: jest.fn() };
  const config = new ConfigService({});
  let service: SystemResetService;
  beforeEach(() => {
    jest.clearAllMocks();
    service = new SystemResetService(
      database as any,
      config,
      queues as any,
      assets as any,
    );
  });
  it('defaults capability off without touching deletion adapters', async () => {
    query.mockImplementation((sql: string) =>
      Promise.resolve({
        rows: sql.includes('FROM users')
          ? [actor]
          : [{ active: false, operation_id: null }],
      }),
    );
    const result = await service.capability('actor');
    expect(result.available).toBe(false);
    expect(
      result.blockers.some((blocker) => blocker.code === 'RESET_DISABLED'),
    ).toBe(true);
    expect(result.retainedAdmin).not.toHaveProperty('password');
    expect(assets.inspect).not.toHaveBeenCalled();
  });
  it('replays a durable same request even after preview expiry or flag disabling', async () => {
    const request = {
      idempotencyKey: 'id',
      previewToken: 'expired',
      currentPassword: 'not-checked-again',
      reason: 'Testing reset',
      confirmation: 'old',
      acknowledgements: [],
    };
    query.mockResolvedValue({
      rows: [
        {
          id: 'id',
          actor_id: 'actor',
          request_hash: hashResetRequest(request),
          phase: 'cleanup',
          created_at: new Date(0),
        },
      ],
    });
    const result = await service.execute(request as any, 'actor');
    expect(result.operationId).toBe('id');
    expect(assets.inspect).not.toHaveBeenCalled();
  });
  it('does not replay another actors operation', async () => {
    query.mockResolvedValue({
      rows: [{ id: 'id', actor_id: 'other', request_hash: 'x' }],
    });
    await expect(
      service.execute({ idempotencyKey: 'id' } as any, 'actor'),
    ).rejects.toThrow();
  });
  it('hides detailed operation status from a different administrator', async () => {
    query.mockResolvedValue({ rows: [] });
    await expect(service.operation('id', 'other')).rejects.toThrow(
      'Reset operation not found',
    );
  });

  it('does not dispatch purge when the coordinator loses its connection during inventory', async () => {
    const op = {
      id: 'operation',
      phase: 'cleanup',
      checkpoint: {
        epoch: 1,
        requiredParticipants: [],
        storageGeneration: 'g-operation',
        databaseCommitted: true,
        cleanupGeneration: 1,
      },
      manifest: { external: { assets: {} } },
    };
    const client = Object.assign(new EventEmitter(), {
      query: jest.fn((sql: string) => {
        if (sql.includes('pg_try_advisory_lock'))
          return Promise.resolve({ rows: [{ acquired: true }] });
        if (sql.includes('FROM system_reset_instances'))
          return Promise.resolve({ rows: [] });
        if (sql.includes('SELECT active,operation_id,epoch'))
          return Promise.resolve({
            rows: [{ active: true, operation_id: 'operation', epoch: 1 }],
          });
        return Promise.resolve({ rows: [op] });
      }),
    });
    const purge = jest.fn();
    const brokenAssets = {
      inspect: jest.fn(() => {
        client.emit('error', new Error('lost fixture connection'));
        return Promise.resolve({});
      }),
      purge,
    };
    const reset = new SystemResetService(
      { withConnection: (work: any) => work(client) } as any,
      config,
      { pause: jest.fn(), openCleanup: jest.fn() } as any,
      brokenAssets as any,
    );
    await reset.tick();
    expect(brokenAssets.inspect).toHaveBeenCalled();
    expect(purge).not.toHaveBeenCalled();
  });
});
