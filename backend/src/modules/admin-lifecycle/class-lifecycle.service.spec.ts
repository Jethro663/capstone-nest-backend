import {
  planClassLifecycle,
  type ClassLifecycleSnapshot,
} from './class-lifecycle.service';

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
});
