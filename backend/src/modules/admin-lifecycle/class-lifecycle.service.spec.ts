import {
  planClassLifecycle,
  ClassLifecycleService,
  type ClassLifecycleSnapshot,
} from './class-lifecycle.service';
import {
  classes,
  classRecordParticipants,
  enrollmentLifecycleEvents,
  enrollments,
} from '../../drizzle/schema';

const sourceClassId = '00000000-0000-4000-8000-000000000101';
const replacementClassId = '00000000-0000-4000-8000-000000000102';

function snapshot(
  overrides: Partial<ClassLifecycleSnapshot> = {},
): ClassLifecycleSnapshot {
  return {
    academicState: { schoolYear: '2026-2027', period: 'Q3', version: 3 },
    classRecord: {
      id: sourceClassId,
      sectionId: '00000000-0000-4000-8000-000000000103',
      subjectCode: 'MATH-7',
      subjectName: 'Mathematics 7',
      schoolYear: '2026-2027',
      isActive: true,
      teacherId: '00000000-0000-4000-8000-000000000104',
      updatedAt: new Date('2026-09-11T00:00:00Z'),
    },
    activeEnrollments: [],
    participants: [],
    evidence: {
      enrollments: 0,
      classRecords: 0,
      scores: 0,
      attempts: 0,
      assessments: 0,
      lessons: 0,
    },
    replacementClass: null,
    replacementStudentIds: [],
    ...overrides,
  };
}

describe('class lifecycle planning', () => {
  it('archives an empty class even when unrelated section enrollments exist', () => {
    const result = planClassLifecycle(snapshot(), {
      classId: sourceClassId,
      resolution: 'ARCHIVE_EMPTY',
      effectivePeriod: 'Q3',
    });

    expect(result.blockers).toEqual([]);
    expect(result.effects).toEqual([
      expect.objectContaining({ entityType: 'class', kind: 'archive' }),
    ]);
  });

  it('requires an explicit learner outcome when the class has active learners', () => {
    const result = planClassLifecycle(
      snapshot({
        activeEnrollments: [
          {
            id: '00000000-0000-4000-8000-000000000105',
            studentId: '00000000-0000-4000-8000-000000000106',
            sectionId: '00000000-0000-4000-8000-000000000103',
            classId: sourceClassId,
            status: 'enrolled',
            createdAt: new Date('2026-06-01T00:00:00Z'),
          },
        ],
      }),
      {
        classId: sourceClassId,
        resolution: 'ARCHIVE_EMPTY',
        effectivePeriod: 'Q3',
      },
    );

    expect(result.blockers).toEqual([
      expect.objectContaining({ code: 'ACTIVE_CLASS_ENROLLMENTS' }),
    ]);
  });

  it('allows completion and preserves historical evidence', () => {
    const learnerId = '00000000-0000-4000-8000-000000000106';
    const result = planClassLifecycle(
      snapshot({
        activeEnrollments: [
          {
            id: '00000000-0000-4000-8000-000000000105',
            studentId: learnerId,
            sectionId: '00000000-0000-4000-8000-000000000103',
            classId: sourceClassId,
            status: 'enrolled',
            createdAt: new Date('2026-06-01T00:00:00Z'),
          },
        ],
        evidence: {
          enrollments: 1,
          classRecords: 1,
          scores: 4,
          attempts: 2,
          assessments: 2,
          lessons: 3,
        },
      }),
      {
        classId: sourceClassId,
        resolution: 'COMPLETE',
        effectivePeriod: 'Q3',
      },
    );

    expect(result.blockers).toEqual([]);
    expect(result.preserved).toContain('4 class record score(s)');
    expect(result.notificationUserIds).toEqual([learnerId]);
    expect(result.notificationRetirement).toEqual({
      userIds: ['00000000-0000-4000-8000-000000000104'],
      classIds: [sourceClassId],
      sectionIds: [],
    });
  });

  it('blocks an incompatible replacement class', () => {
    const result = planClassLifecycle(
      snapshot({
        activeEnrollments: [
          {
            id: '00000000-0000-4000-8000-000000000105',
            studentId: '00000000-0000-4000-8000-000000000106',
            sectionId: '00000000-0000-4000-8000-000000000103',
            classId: sourceClassId,
            status: 'enrolled',
            createdAt: new Date('2026-06-01T00:00:00Z'),
          },
        ],
        replacementClass: {
          id: replacementClassId,
          sectionId: '00000000-0000-4000-8000-000000000103',
          subjectCode: 'SCI-7',
          subjectName: 'Science 7',
          schoolYear: '2026-2027',
          isActive: true,
          teacherId: null,
          updatedAt: new Date('2026-09-11T00:00:00Z'),
        },
      }),
      {
        classId: sourceClassId,
        resolution: 'TRANSFER',
        replacementClassId,
        effectivePeriod: 'Q3',
      },
    );

    expect(result.blockers).toEqual([
      expect.objectContaining({ code: 'REPLACEMENT_SUBJECT_MISMATCH' }),
    ]);
  });

  it('retires an empty historical class without inventing a learner outcome', () => {
    const result = planClassLifecycle(
      snapshot({
        classRecord: {
          ...snapshot().classRecord,
          schoolYear: '2025-2026',
        },
      }),
      {
        classId: sourceClassId,
        lifecycleMode: 'HISTORICAL_RETIREMENT',
      } as never,
    );

    expect(result.blockers).toEqual([]);
    expect(result.effects).toEqual([
      expect.objectContaining({ entityType: 'class', kind: 'archive' }),
    ]);
    expect(result.requiredConfirmations).toContain('HISTORICAL_RETIREMENT');
  });

  it('accepts an explicit historical membership outcome and period', () => {
    const result = planClassLifecycle(
      snapshot({
        classRecord: {
          ...snapshot().classRecord,
          schoolYear: '2025-2026',
        },
        activeEnrollments: [
          {
            id: '00000000-0000-4000-8000-000000000105',
            studentId: '00000000-0000-4000-8000-000000000106',
            sectionId: '00000000-0000-4000-8000-000000000103',
            classId: sourceClassId,
            status: 'enrolled',
            createdAt: new Date('2025-06-01T00:00:00Z'),
          },
        ],
      }),
      {
        classId: sourceClassId,
        lifecycleMode: 'HISTORICAL_RETIREMENT',
        resolution: 'COMPLETE',
        effectivePeriod: 'Q4',
      } as never,
    );

    expect(result.blockers).toEqual([]);
    expect(result.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entityType: 'enrollment', kind: 'update' }),
        expect.objectContaining({ entityType: 'class', kind: 'archive' }),
      ]),
    );
  });

  it('returns choice-only output for an incomplete historical class retirement', () => {
    const result = planClassLifecycle(
      snapshot({
        classRecord: {
          ...snapshot().classRecord,
          schoolYear: '2025-2026',
        },
        activeEnrollments: [
          {
            id: '00000000-0000-4000-8000-000000000105',
            studentId: '00000000-0000-4000-8000-000000000106',
            sectionId: '00000000-0000-4000-8000-000000000103',
            classId: sourceClassId,
            status: 'enrolled',
            createdAt: new Date('2025-06-01T00:00:00Z'),
          },
        ],
      }),
      {
        classId: sourceClassId,
        lifecycleMode: 'HISTORICAL_RETIREMENT',
      },
    );

    expect(result.blockers).toContainEqual(
      expect.objectContaining({ code: 'ACTIVE_CLASS_ENROLLMENTS' }),
    );
    expect(result.effects).toEqual([]);
    expect(result.participantChanges).toEqual([]);
    expect(result.requiredConfirmations).toEqual([]);
  });

  it('rejects historical mode for the active year without proposing mutations', () => {
    const result = planClassLifecycle(snapshot(), {
      classId: sourceClassId,
      lifecycleMode: 'HISTORICAL_RETIREMENT',
    });

    expect(result.blockers).toContainEqual(
      expect.objectContaining({ code: 'HISTORICAL_MODE_NOT_APPLICABLE' }),
    );
    expect(result.effects).toEqual([]);
    expect(result.requiredConfirmations).toEqual([]);
  });

  it('enumerates lifecycle-event and draft participant mutations in the reviewed effects', () => {
    const result = planClassLifecycle(
      snapshot({
        classRecord: {
          ...snapshot().classRecord,
          schoolYear: '2025-2026',
        },
        activeEnrollments: [
          {
            id: '00000000-0000-4000-8000-000000000105',
            studentId: '00000000-0000-4000-8000-000000000106',
            sectionId: '00000000-0000-4000-8000-000000000103',
            classId: sourceClassId,
            status: 'enrolled',
            createdAt: new Date('2025-06-01T00:00:00Z'),
          },
        ],
        participants: [
          {
            id: '00000000-0000-4000-8000-000000000107',
            studentId: '00000000-0000-4000-8000-000000000106',
            classId: sourceClassId,
            gradingPeriod: 'Q4',
            recordStatus: 'draft',
            eligibility: 'eligible',
          },
        ],
      }),
      {
        classId: sourceClassId,
        lifecycleMode: 'HISTORICAL_RETIREMENT',
        resolution: 'DROP',
        effectivePeriod: 'Q4',
      },
    );

    expect(result.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityType: 'enrollment_lifecycle_event',
          kind: 'insert',
        }),
        expect.objectContaining({
          entityType: 'class_record_participant',
          entityId: '00000000-0000-4000-8000-000000000107',
          kind: 'update',
        }),
      ]),
    );
  });

  it('reports every class transfer mutation while leaving academic evidence tables untouched', async () => {
    const updateWhere = jest.fn().mockResolvedValue(undefined);
    const updateSet = jest.fn().mockReturnValue({ where: updateWhere });
    const insertValues = jest.fn().mockResolvedValue(undefined);
    const db = {
      update: jest.fn().mockReturnValue({ set: updateSet }),
      insert: jest.fn().mockReturnValue({ values: insertValues }),
    };
    const service = new ClassLifecycleService({ db } as never);
    const sourceEnrollment = {
      id: '00000000-0000-4000-8000-000000000105',
      studentId: '00000000-0000-4000-8000-000000000106',
      sectionId: '00000000-0000-4000-8000-000000000103',
      classId: sourceClassId,
      status: 'enrolled' as const,
      createdAt: new Date('2025-06-01T00:00:00Z'),
    };
    const historicalSnapshot = snapshot({
      classRecord: {
        ...snapshot().classRecord,
        schoolYear: '2025-2026',
      },
      activeEnrollments: [sourceEnrollment],
      replacementClass: {
        ...snapshot().classRecord,
        id: replacementClassId,
        schoolYear: '2025-2026',
      },
    });

    const result = await service.apply(
      {
        classId: sourceClassId,
        lifecycleMode: 'HISTORICAL_RETIREMENT',
        resolution: 'TRANSFER',
        replacementClassId,
        effectivePeriod: 'Q4',
      },
      {
        snapshot: historicalSnapshot,
        plan: {
          blockers: [],
          warnings: [],
          effects: [],
          preserved: ['Academic evidence'],
          requiredConfirmations: [],
          participantChanges: [
            {
              participantId: '00000000-0000-4000-8000-000000000107',
              eligibility: 'transferred',
            },
          ],
          affectedUserIds: [sourceEnrollment.studentId],
        },
        manifest: {} as never,
      },
      {
        operationId: '00000000-0000-4000-8000-000000000108',
        actorId: '00000000-0000-4000-8000-000000000109',
        actorSnapshot: {
          userId: '00000000-0000-4000-8000-000000000109',
          email: 'admin@example.com',
          firstName: 'Ada',
          lastName: 'Admin',
        },
        reasonCode: 'TRANSFERRED_CLASS',
        notes: 'Verified historical transfer.',
      },
    );

    expect(db.update.mock.calls.map(([table]) => table)).toEqual([
      enrollments,
      classRecordParticipants,
      classes,
    ]);
    expect(db.insert.mock.calls.map(([table]) => table)).toEqual([
      enrollments,
      enrollmentLifecycleEvents,
    ]);
    expect(result.changed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityType: 'enrollment',
          entityId: `${sourceEnrollment.studentId}:${replacementClassId}`,
          outcome: 'created',
        }),
        expect.objectContaining({
          entityType: 'class_record_participant',
          outcome: 'transferred',
        }),
        expect.objectContaining({
          entityType: 'enrollment_lifecycle_event',
          entityId: sourceEnrollment.id,
        }),
      ]),
    );
  });
});
