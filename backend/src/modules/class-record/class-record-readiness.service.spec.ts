import { ClassRecordReadinessService } from './class-record-readiness.service';
import { getDefaultAcademicPolicy } from '../academic-state/academic-policy';

function fixture() {
  const policy = getDefaultAcademicPolicy('2025-2026');
  const record = {
    id: 'r',
    classId: 'c',
    gradingPeriod: 'Q1',
    status: 'draft',
    rosterConfirmedAt: new Date(),
    class: { id: 'c', schoolYear: '2025-2026', isActive: true },
  };
  const categories = [
    {
      id: 'ww',
      name: 'Written Works',
      weightPercentage: '100',
      items: [
        {
          id: 'item',
          categoryId: 'ww',
          assessmentId: null,
          maxScore: '100',
          scores: [{ studentId: 's', score: '80', status: 'recorded' }],
        },
      ],
    },
  ];
  const db = {
    query: {
      classRecords: { findFirst: jest.fn().mockResolvedValue(record) },
      classRecordParticipants: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ studentId: 's', eligibility: 'eligible' }]),
      },
      classRecordCategories: {
        findMany: jest.fn().mockResolvedValue(categories),
      },
      assessmentAttempts: { findMany: jest.fn().mockResolvedValue([]) },
    },
  };
  const policyService = {
    forClass: jest.fn().mockResolvedValue({ policy, cls: record.class }),
    currentState: jest
      .fn()
      .mockResolvedValue({ schoolYear: '2025-2026', quarter: 'Q1', policy }),
  };
  return {
    db,
    record,
    categories,
    policyService,
    service: new ClassRecordReadinessService(
      { db } as never,
      policyService as never,
    ),
  };
}

describe('period finalization readiness', () => {
  it('accepts a confirmed complete roster', async () => {
    const { service } = fixture();
    expect(await service.getReadiness('r')).toMatchObject({
      ready: true,
      eligibleStudentIds: ['s'],
      blockers: [],
    });
  });
  it('blocks unknown historical eligibility and missing scores', async () => {
    const { service, record, categories } = fixture();
    record.rosterConfirmedAt = null as never;
    categories[0].items[0].scores = [];
    expect(
      (await service.getReadiness('r')).blockers.map((b) => b.code),
    ).toEqual(expect.arrayContaining(['unconfirmed_roster', 'missing_score']));
  });
  it('allows a documented empty roster but not future finalization', async () => {
    const { service, db, record } = fixture();
    db.query.classRecordParticipants.findMany.mockResolvedValue([]);
    expect((await service.getReadiness('r')).ready).toBe(true);
    record.gradingPeriod = 'Q2';
    expect(
      (await service.getReadiness('r')).blockers.map((b) => b.code),
    ).toContain('future_period');
  });
  it('blocks unresolved manual review and stale score synchronization', async () => {
    const { service, db, categories } = fixture();
    categories[0].items[0].assessmentId = 'a' as never;
    const attempt = {
      id: 'attempt',
      assessmentId: 'a',
      studentId: 's',
      isSubmitted: true,
      isReturned: false,
      score: 80,
      assessment: { type: 'file_upload', questions: [] },
    };
    db.query.assessmentAttempts.findMany.mockResolvedValue([attempt]);
    expect(
      (await service.getReadiness('r')).blockers.map((b) => b.code),
    ).toContain('pending_manual_grade');
    attempt.isReturned = true;
    expect(
      (await service.getReadiness('r')).blockers.map((b) => b.code),
    ).toContain('pending_score_sync');
    Object.assign(categories[0].items[0].scores[0], {
      sourceAttemptId: 'attempt',
    });
    expect((await service.getReadiness('r')).ready).toBe(true);
  });
  it('blocks an ongoing attempt even if another score exists', async () => {
    const { service, db, categories } = fixture();
    categories[0].items[0].assessmentId = 'a' as never;
    db.query.assessmentAttempts.findMany.mockResolvedValue([
      {
        id: 'attempt',
        assessmentId: 'a',
        studentId: 's',
        isSubmitted: false,
        assessment: { type: 'quiz', questions: [] },
      },
    ]);
    expect(
      (await service.getReadiness('r')).blockers.map((b) => b.code),
    ).toContain('ongoing_attempt');
  });
  it('requires review for short-answer questions even when an automatic total exists', async () => {
    const { service, db, categories } = fixture();
    categories[0].items[0].assessmentId = 'a' as never;
    db.query.assessmentAttempts.findMany.mockResolvedValue([
      {
        id: 'attempt',
        assessmentId: 'a',
        studentId: 's',
        isSubmitted: true,
        isReturned: false,
        score: 80,
        assessment: { type: 'quiz', questions: [{ type: 'short_answer' }] },
      },
    ]);
    expect(
      (await service.getReadiness('r')).blockers.map((b) => b.code),
    ).toContain('pending_manual_grade');
  });
});
