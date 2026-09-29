import { WorkflowDiagnosticsService } from './workflow-diagnostics.service';

const NOW = new Date('2026-09-29T02:00:00.000Z');

type AggregateRow = {
  status: string;
  count: number;
  oldestAt: Date | null;
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function fixture(rows: AggregateRow[] | Promise<AggregateRow[]>) {
  const groupBy = jest.fn().mockReturnValue(Promise.resolve(rows));
  const from = jest.fn().mockReturnValue({ groupBy });
  const select = jest.fn().mockReturnValue({ from });
  let now = new Date(NOW);
  const service = new WorkflowDiagnosticsService(
    { db: { select } } as never,
    () => new Date(now),
  );
  return {
    service,
    select,
    groupBy,
    advance(milliseconds: number) {
      now = new Date(now.getTime() + milliseconds);
    },
  };
}

describe('WorkflowDiagnosticsService', () => {
  it('returns every fixed status while exposing ages only for nonterminal work', async () => {
    const { service } = fixture([
      {
        status: 'pending',
        count: 2,
        oldestAt: new Date('2026-09-29T01:50:00.000Z'),
      },
      {
        status: 'processing',
        count: 1,
        oldestAt: new Date('2026-09-29T01:59:30.000Z'),
      },
      {
        status: 'failed',
        count: 3,
        oldestAt: new Date('2026-09-28T20:00:00.000Z'),
      },
    ]);

    const snapshot = await service.getSnapshot();

    expect(snapshot.totals).toEqual([
      { status: 'pending', count: 2, oldestAgeSeconds: 600 },
      { status: 'processing', count: 1, oldestAgeSeconds: 30 },
      { status: 'completed', count: 0, oldestAgeSeconds: null },
      { status: 'approved', count: 0, oldestAgeSeconds: null },
      { status: 'cancelled', count: 0, oldestAgeSeconds: null },
      { status: 'rejected', count: 0, oldestAgeSeconds: null },
      { status: 'failed', count: 3, oldestAgeSeconds: null },
    ]);
    expect(snapshot.alerts).toEqual([
      expect.objectContaining({
        code: 'failed_jobs_present',
        severity: 'warning',
      }),
    ]);
    expect(snapshot.healthy).toBe(false);
    expect(snapshot).not.toHaveProperty('jobs');
  });

  it('raises a critical alert when nonterminal work exceeds one hour', async () => {
    const { service } = fixture([
      {
        status: 'pending',
        count: 1,
        oldestAt: new Date('2026-09-29T00:30:00.000Z'),
      },
    ]);

    await expect(service.getSnapshot()).resolves.toMatchObject({
      healthy: false,
      staleAfterSeconds: 900,
      alerts: [
        {
          code: 'oldest_nonterminal_exceeded',
          severity: 'critical',
          message: expect.stringContaining('5400 seconds'),
        },
      ],
    });
  });

  it('caches a snapshot for five seconds and refreshes after expiry', async () => {
    const { service, select, advance } = fixture([]);

    await service.getSnapshot();
    advance(4_999);
    await service.getSnapshot();
    expect(select).toHaveBeenCalledTimes(1);

    advance(2);
    await service.getSnapshot();
    expect(select).toHaveBeenCalledTimes(2);
  });

  it('coalesces concurrent reads into one database query', async () => {
    const pending = deferred<AggregateRow[]>();
    const { service, select } = fixture(pending.promise);

    const first = service.getSnapshot();
    const second = service.getSnapshot();
    expect(select).toHaveBeenCalledTimes(1);

    pending.resolve([]);
    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
    expect(select).toHaveBeenCalledTimes(1);
  });

  it('does not convert a database failure into truthful-looking empty health', async () => {
    const { service } = fixture(Promise.reject(new Error('database offline')));

    await expect(service.getSnapshot()).rejects.toThrow('database offline');
  });
});
