import { Logger } from '@nestjs/common';
import { DiscussionBoardProcessor } from '../discussion-board/discussion-board.processor';
import { LibraryIndexingProcessor } from '../file-upload/processors/library-indexing.processor';
import { PerformanceRecomputeProcessor } from './performance-recompute.processor';
import { AiGenerationProcessor } from '../ai-mentor/processors/ai-generation.processor';
import { RagIndexingProcessor } from '../rag/processors/rag-indexing.processor';
import { AssessmentNotificationProcessor } from '../notifications/processors/assessment-notification.processor';
import { AnnouncementFanOutProcessor } from '../notifications/processors/announcement-fan-out.processor';
import { ASSESSMENT_ASSIGNED_JOB } from '../notifications/assessment-notification-dispatch.service';

function fixture(kind: string, blocked = false, missing = false) {
  let settle!: () => void;
  const waiting = new Promise<void>((resolve) => {
    settle = resolve;
  });
  let active = 0;
  const effect = jest.fn(async () => {
    await waiting;
    return [];
  });
  const modules = missing
    ? undefined
    : {
        get: () => ({
          run: async (work: () => Promise<unknown>) => {
            if (blocked) throw new Error('SYSTEM_MAINTENANCE');
            active++;
            try {
              return await work();
            } finally {
              active--;
            }
          },
        }),
      };
  const database = {
    db: {
      query: {
        enrollments: { findMany: effect },
        classes: { findFirst: effect },
      },
      update: () => ({ set: () => ({ where: effect }) }),
    },
  };
  const config = {
    get: (key: string) =>
      key === 'AI_SERVICE_SHARED_SECRET' ? 'test-only' : undefined,
  };
  jest.spyOn(global, 'fetch').mockImplementation(async () => {
    await effect();
    return { ok: true, json: () => Promise.resolve({}) } as Response;
  });
  const cases: Record<string, [any, unknown[], string, unknown]> = {
    discussion: [
      DiscussionBoardProcessor,
      [database, {}, {}, modules],
      'thread-published',
      {},
    ],
    library: [
      LibraryIndexingProcessor,
      [config, database, {}, modules],
      'index-library-file',
      { fileId: 'old' },
    ],
    performance: [
      PerformanceRecomputeProcessor,
      [{ recomputeFromAssessmentSubmission: effect }, modules],
      'recompute-assessment',
      {},
    ],
    generation: [
      AiGenerationProcessor,
      [{ runInternalQuizJob: effect }, modules],
      'quiz-generation',
      { jobId: 'old' },
    ],
    rag: [RagIndexingProcessor, [config, modules], 'reindex-class', {}],
    assessment: [
      AssessmentNotificationProcessor,
      [database, {}, {}, modules],
      ASSESSMENT_ASSIGNED_JOB,
      {},
    ],
    announcement: [
      AnnouncementFanOutProcessor,
      [database, {}, {}, modules],
      'fan-out',
      {},
    ],
  };
  const [Type, args, name, data] = cases[kind];
  const processor = Reflect.construct(Type, args);
  return {
    effect,
    settle,
    active: () => active,
    invoke: () => processor.process({ name, data, attemptsMade: 0 }),
  };
}

describe.each([
  'discussion',
  'library',
  'performance',
  'generation',
  'rag',
  'assessment',
  'announcement',
])('%s physical worker reset participation', (kind) => {
  beforeEach(() => {
    for (const level of ['log', 'debug', 'warn', 'error'] as const)
      jest.spyOn(Logger.prototype, level).mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not begin physical work during maintenance', async () => {
    const f = fixture(kind, true);
    f.settle();
    await expect(f.invoke()).rejects.toThrow('SYSTEM_MAINTENANCE');
    expect(f.effect).not.toHaveBeenCalled();
  });

  it('stays counted while physical work is pending independently of Redis active state', async () => {
    const f = fixture(kind);
    const pending = f.invoke();
    await new Promise<void>((resolve) => setImmediate(resolve));
    try {
      expect(f.effect).toHaveBeenCalled();
      expect(f.active()).toBe(1);
    } finally {
      f.settle();
      await pending;
    }
    expect(f.active()).toBe(0);
  });

  it('fails closed if the participant is missing', async () => {
    const f = fixture(kind, false, true);
    f.settle();
    await expect(f.invoke()).rejects.toThrow();
    expect(f.effect).not.toHaveBeenCalled();
  });
});
