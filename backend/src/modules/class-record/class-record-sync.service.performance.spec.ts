import { ClassRecordSyncService } from './class-record-sync.service';
import {
  AssessmentSubmittedEvent,
  ClassRecordScoresUpdatedEvent,
} from '../../common/events';

function fixture() {
  const item = {
    id: 'item',
    classRecordId: 'record',
    assessmentId: 'assessment',
    maxScore: '20',
    classRecord: {
      id: 'record',
      classId: 'class',
      status: 'draft',
      gradingPeriod: 'Q1',
      class: { teacherId: 'teacher' },
    },
  };
  const values = jest.fn().mockReturnValue({
    onConflictDoUpdate: jest.fn().mockResolvedValue(undefined),
  });
  const db = {
    query: {
      classRecordItems: {
        findFirst: jest.fn().mockResolvedValue(item),
        findMany: jest.fn().mockResolvedValue([item]),
      },
      classes: {
        findFirst: jest.fn().mockResolvedValue({ teacherId: 'teacher' }),
      },
      assessments: {
        findFirst: jest.fn().mockResolvedValue({ type: 'quiz', questions: [] }),
      },
      assessmentAttempts: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'persisted',
            studentId: 'student',
            score: 80,
            isReturned: true,
          },
        ]),
      },
      classRecordParticipants: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { studentId: 'student', eligibility: 'eligible' },
          ]),
      },
      classRecordScores: { findMany: jest.fn().mockResolvedValue([]) },
    },
    insert: jest.fn().mockReturnValue({ values }),
  };
  const effects: Array<() => unknown> = [];
  const database = {
    db,
    academicTransaction: async (work: () => Promise<unknown>) => work(),
    afterAcademicCommit: async (effect: () => unknown) => {
      effects.push(effect);
    },
  };
  const emitter = { emit: jest.fn() };
  const audit = { log: jest.fn() };
  const service = new ClassRecordSyncService(
    database as never,
    emitter as never,
    audit as never,
    { assertAssessmentAction: jest.fn() } as never,
  );
  return { service, db, item, values, effects, emitter, audit };
}
describe('class record synchronization delivery', () => {
  it('defers performance notification until commit', async () => {
    const f = fixture();
    expect(await f.service.syncFromAssessment('item', 'teacher')).toEqual({
      synced: 1,
    });
    expect(f.emitter.emit).not.toHaveBeenCalled();
    for (const effect of f.effects) await effect();
    expect(f.emitter.emit).toHaveBeenCalledWith(
      ClassRecordScoresUpdatedEvent.eventName,
      expect.objectContaining({
        classId: 'class',
        studentIds: ['student'],
        triggerSource: 'manual_sync',
      }),
    );
  });
  it.each([true, false])(
    'reloads persisted evidence and audits tagged/legacy delivery (%s)',
    async (tagged) => {
      const f = fixture();
      await f.service.handleAssessmentSubmitted(
        new AssessmentSubmittedEvent({
          assessmentId: 'assessment',
          studentId: 'student',
          rawScore: 0,
          totalPoints: 20,
          ...(tagged
            ? { classRecordCategory: 'written_work', quarter: 'Q1' }
            : {}),
        }),
      );
      expect(f.values).toHaveBeenCalledWith(
        expect.objectContaining({ score: '16', sourceAttemptId: 'persisted' }),
      );
      expect(f.audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'teacher',
          action: 'class_record.scores.synced_assessment',
          targetId: 'item',
          metadata: expect.objectContaining({
            classRecordId: 'record',
            studentIds: ['student'],
          }),
        }),
      );
      for (const effect of f.effects) await effect();
      expect(f.emitter.emit).toHaveBeenCalledWith(
        ClassRecordScoresUpdatedEvent.eventName,
        expect.objectContaining({ triggerSource: 'assessment_sync' }),
      );
    },
  );
});
