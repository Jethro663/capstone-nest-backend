import { Logger } from '@nestjs/common';
import { PerformanceRecomputeQueueService } from './performance-recompute-queue.service';
import { PerformanceService } from './performance.service';
import { ClassRecordSyncService } from '../class-record/class-record-sync.service';
import { LxpPerformanceListener } from '../lxp/listeners/lxp-performance.listener';
import { SystemResetParticipant } from '../system-reset/system-reset.participant';
import {
  getResetRequestEpoch,
  runResetWorkContext,
} from '../system-reset/system-reset.context';

it('joins sibling snapshot writes before reporting a failed recompute batch', async () => {
  let release!: () => void;
  const sibling = new Promise<void>((resolve) => {
    release = resolve;
  });
  const failure = new Error('first snapshot failed');
  const write = jest.fn().mockResolvedValue([]);
  const db = {
    query: {
      performanceSnapshots: {
        findFirst: jest
          .fn()
          .mockRejectedValueOnce(failure)
          .mockImplementationOnce(async () => {
            await sibling;
            return { id: 'snapshot', isAtRisk: false };
          }),
      },
    },
    update: () => ({ set: () => ({ where: () => ({ returning: write }) }) }),
  };
  const service = Reflect.construct(PerformanceService, [
    { db },
    {},
    {},
    {},
    {},
  ]) as PerformanceService;
  const component = {
    assessment: { average: 90, sampleSize: 1 },
    classRecord: { average: 90, sampleSize: 1 },
  };
  jest
    .spyOn(service as any, 'loadPerformanceComponentsForStudents')
    .mockResolvedValue(
      new Map([
        ['first', component],
        ['second', component],
      ]),
    );
  let settled = false;
  const pending = service
    .recomputeStudentsForClass('class', ['first', 'second'], 'test')
    .catch((error) => {
      settled = true;
      return error;
    });
  await new Promise<void>((resolve) => setImmediate(resolve));
  try {
    expect(settled).toBe(false);
    expect(write).not.toHaveBeenCalled();
  } finally {
    release();
  }
  expect(await pending).toBe(failure);
  expect(write).toHaveBeenCalledTimes(1);
});

function gate() {
  let settle!: () => void;
  const pending = new Promise<void>((resolve) => {
    settle = resolve;
  });
  let active = 0;
  let epoch = 1;
  let blocked = false;
  const participant = {
    async run(work: () => Promise<unknown>) {
      if (
        blocked ||
        (getResetRequestEpoch() !== undefined &&
          getResetRequestEpoch() !== epoch)
      ) {
        throw new Error('SYSTEM_MAINTENANCE');
      }
      active++;
      try {
        return await work();
      } finally {
        active--;
      }
    },
  };
  const modules = {
    get: jest.fn((token) => {
      if (token !== SystemResetParticipant)
        throw new Error('unexpected provider');
      return participant;
    }),
  };
  return {
    modules,
    pending,
    settle,
    active: () => active,
    block: () => {
      blocked = true;
    },
    advance: () => {
      epoch++;
    },
  };
}

type Kind =
  | 'assessment queue'
  | 'class score queue'
  | 'class record listener'
  | 'LXP listener'
  | 'diagnostic timer';
function fixture(
  kind: Kind,
  g: ReturnType<typeof gate>,
  missingModules = false,
) {
  const effect = jest.fn(async () => {
    await g.pending;
  });
  const modules = missingModules ? undefined : g.modules;
  if (kind === 'assessment queue' || kind === 'class score queue') {
    const service = Reflect.construct(PerformanceRecomputeQueueService, [
      { add: effect },
      modules,
    ]);
    return {
      effect,
      invoke: () =>
        kind === 'assessment queue'
          ? service.enqueueAssessmentSubmission('assessment', 'student')
          : service.enqueueClassRecordScores('class', ['student']),
    };
  }
  if (kind === 'LXP listener') {
    const listener = Reflect.construct(LxpPerformanceListener, [
      { handlePerformanceStatusChanged: effect },
      modules,
    ]);
    return {
      effect,
      invoke: () =>
        listener.handlePerformanceStatusChanged({
          classId: 'class',
          studentId: 'student',
        }),
    };
  }
  if (kind === 'class record listener') {
    const database = {
      academicTransaction: async (work: () => Promise<unknown>) => work(),
      db: {
        query: {
          classRecordItems: {
            findMany: async () => {
              await effect();
              return [];
            },
          },
        },
      },
    };
    const service = Reflect.construct(ClassRecordSyncService, [
      database,
      {},
      {},
      {},
      modules,
    ]);
    return {
      effect,
      invoke: () =>
        service.handleAssessmentSubmitted({ assessmentId: 'assessment' }),
    };
  }
  const db = {
    query: {
      classes: {
        findFirst: () => Promise.resolve({ id: 'class', isActive: true }),
      },
      aiGenerationJobs: {
        findFirst: async () => {
          await effect();
          return { status: 'completed' };
        },
      },
    },
    insert: () => ({
      values: () => ({ returning: () => Promise.resolve([{ id: 'job' }]) }),
    }),
  };
  const service = Reflect.construct(PerformanceService, [
    { db },
    {},
    { log: async () => {} },
    {},
    {},
    modules,
  ]);
  return {
    effect,
    invoke: async () => {
      await service.createPerformanceAnalysisJob('class', {}, 'admin', [
        'admin',
      ]);
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
    },
  };
}

describe.each<Kind>([
  'assessment queue',
  'class score queue',
  'class record listener',
  'LXP listener',
  'diagnostic timer',
])('%s reset ownership', (kind) => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not start physical work when admission rejects', async () => {
    const g = gate();
    g.block();
    g.settle();
    const f = fixture(kind, g);
    await f.invoke();
    expect(f.effect).not.toHaveBeenCalled();
  });

  it('retains participation until the external operation actually settles', async () => {
    const g = gate();
    const f = fixture(kind, g);
    const pending = f.invoke();
    await new Promise<void>((resolve) => setTimeout(resolve, 15));
    try {
      expect(f.effect).toHaveBeenCalledTimes(1);
      expect(g.active()).toBe(1);
    } finally {
      g.settle();
      await pending;
    }
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(g.active()).toBe(0);
  });

  it('fails closed when the reset participant cannot be resolved', async () => {
    const g = gate();
    g.settle();
    const f = fixture(kind, g, true);
    await f.invoke();
    expect(f.effect).not.toHaveBeenCalled();
  });

  it('rejects an inherited old epoch after maintenance ends', async () => {
    const g = gate();
    g.advance();
    g.settle();
    const f = fixture(kind, g);
    await runResetWorkContext(1, () => f.invoke());
    expect(f.effect).not.toHaveBeenCalled();
  });
});
