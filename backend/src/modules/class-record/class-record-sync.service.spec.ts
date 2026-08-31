import { ClassRecordSyncService } from './class-record-sync.service';

function fixture() {
  const item = {
    id: 'item',
    classRecordId: 'record',
    assessmentId: 'assessment',
    maxScore: '50',
    classRecord: {
      id: 'record',
      classId: 'class',
      teacherId: 'teacher',
      status: 'draft',
      gradingPeriod: 'Q1',
    },
  };
  const assessment = { id: 'assessment', type: 'quiz', questions: [] };
  const attempts = [
    {
      id: 'latest',
      studentId: 'student',
      score: 80,
      isReturned: true,
      isSubmitted: true,
      attemptNumber: 2,
    },
    {
      id: 'old',
      studentId: 'student',
      score: 40,
      isReturned: true,
      isSubmitted: true,
      attemptNumber: 1,
    },
  ];
  const save = jest.fn().mockResolvedValue(undefined);
  const values = jest.fn().mockReturnValue({ onConflictDoUpdate: save });
  const db = {
    query: {
      classRecordItems: { findFirst: jest.fn().mockResolvedValue(item) },
      classes: {
        findFirst: jest.fn().mockResolvedValue({ teacherId: 'teacher' }),
      },
      assessments: { findFirst: jest.fn().mockResolvedValue(assessment) },
      assessmentAttempts: { findMany: jest.fn().mockResolvedValue(attempts) },
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
  const database = {
    db,
    academicTransaction: async (work: () => Promise<unknown>) => work(),
    afterAcademicCommit: async (effect: () => unknown) => effect(),
  };
  const service = new ClassRecordSyncService(
    database as never,
    { emit: jest.fn() } as never,
    { log: jest.fn() } as never,
    { assertAssessmentAction: jest.fn() } as never,
  );
  return { service, item, assessment, attempts, db, values };
}
describe('assessment score synchronization', () => {
  it('uses the latest persisted attempt and records its source identity', async () => {
    const { service, values } = fixture();
    expect(await service.syncFromAssessment('item', 'teacher')).toEqual({
      synced: 1,
    });
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ score: '40', sourceAttemptId: 'latest' }),
    );
  });
  it('does not interpret an ungraded latest attempt as zero or reuse an older grade', async () => {
    const { service, attempts, values } = fixture();
    attempts[0].score = null as never;
    expect(await service.syncFromAssessment('item', 'teacher')).toEqual({
      synced: 0,
    });
    expect(values).not.toHaveBeenCalled();
  });
  it('blocks synchronization into finalized workbooks', async () => {
    const { service, item, values } = fixture();
    item.classRecord.status = 'finalized';
    await expect(service.syncFromAssessment('item', 'teacher')).rejects.toThrow(
      'draft',
    );
    expect(values).not.toHaveBeenCalled();
  });
  it('preserves an explicit exemption during resynchronization', async () => {
    const { service, db, values } = fixture();
    db.query.classRecordScores.findMany.mockResolvedValue([
      { studentId: 'student', status: 'excused' },
    ] as never);
    expect(await service.syncFromAssessment('item', 'teacher')).toEqual({
      synced: 0,
    });
    expect(values).not.toHaveBeenCalled();
  });
  it('waits for manual short-answer review and ignores ineligible students', async () => {
    const { service, assessment, attempts, db, values } = fixture();
    assessment.questions = [{ type: 'short_answer' }] as never;
    attempts[0].isReturned = false;
    expect(await service.syncFromAssessment('item', 'teacher')).toEqual({
      synced: 0,
    });
    attempts[0].isReturned = true;
    db.query.classRecordParticipants.findMany.mockResolvedValue([]);
    expect(await service.syncFromAssessment('item', 'teacher')).toEqual({
      synced: 0,
    });
    expect(values).not.toHaveBeenCalled();
  });
});
