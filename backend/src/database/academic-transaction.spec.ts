import {
  afterAcademicCommit,
  getAcademicConnection,
  runAcademicTransaction,
} from './academic-transaction';

function transactionDatabase() {
  const trace: string[] = [];
  const tx = {
    name: 'transaction',
    execute: jest.fn(async () => trace.push('lock')),
  };
  const db = {
    transaction: jest.fn(
      async (work: (conn: typeof tx) => Promise<unknown>) => {
        trace.push('begin');
        try {
          const result = await work(tx);
          trace.push('commit');
          return result;
        } catch (error) {
          trace.push('rollback');
          throw error;
        }
      },
    ),
  };
  return { db, tx, trace };
}

describe('academic transaction boundary', () => {
  it('locks before reading and propagates one connection into nested services', async () => {
    const owner = {};
    const { db, tx, trace } = transactionDatabase();
    await runAcademicTransaction(owner, db as never, async () => {
      expect(trace).toEqual(['begin', 'lock']);
      expect(getAcademicConnection(owner, db)).toBe(tx);
      await runAcademicTransaction(owner, db as never, async () => {
        expect(getAcademicConnection(owner, db)).toBe(tx);
      });
    });
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(getAcademicConnection(owner, db)).toBe(db);
  });
  it('dispatches effects only after commit and outside the transaction context', async () => {
    const owner = {};
    const { db, trace } = transactionDatabase();
    await runAcademicTransaction(owner, db as never, async () => {
      afterAcademicCommit(owner, async () => {
        expect(getAcademicConnection(owner, db)).toBe(db);
        trace.push('effect');
      });
      expect(trace).not.toContain('effect');
    });
    expect(trace).toEqual(['begin', 'lock', 'commit', 'effect']);
  });
  it('rolls back without effects or leaking context', async () => {
    const owner = {};
    const { db, trace } = transactionDatabase();
    const effect = jest.fn();
    await expect(
      runAcademicTransaction(owner, db as never, async () => {
        afterAcademicCommit(owner, effect);
        throw new Error('forced failure');
      }),
    ).rejects.toThrow('forced failure');
    expect(trace).toEqual(['begin', 'lock', 'rollback']);
    expect(effect).not.toHaveBeenCalled();
    expect(getAcademicConnection(owner, db)).toBe(db);
  });
  it('isolates overlapping requests and database instances', async () => {
    const first = transactionDatabase();
    const second = transactionDatabase();
    const owner = {};
    const otherOwner = {};
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    const pending = runAcademicTransaction(
      owner,
      first.db as never,
      async () => {
        await barrier;
        expect(getAcademicConnection(owner, first.db)).toBe(first.tx);
        expect(getAcademicConnection(otherOwner, second.db)).toBe(second.db);
      },
    );
    await runAcademicTransaction(owner, second.db as never, async () => {
      expect(getAcademicConnection(owner, second.db)).toBe(second.tx);
      release();
    });
    await pending;
  });
});
