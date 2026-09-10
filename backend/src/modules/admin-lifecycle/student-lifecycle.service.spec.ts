import {
  planStudentLifecycle,
  StudentLifecycleService,
  type StudentLifecycleSnapshot,
} from './student-lifecycle.service';
import { enrollmentLifecycleEvents, enrollments } from '../../drizzle/schema';

const ids = {
  student: '00000000-0000-4000-8000-000000000001',
  section: '00000000-0000-4000-8000-000000000002',
  destinationSection: '00000000-0000-4000-8000-000000000003',
  class: '00000000-0000-4000-8000-000000000004',
  destinationClass: '00000000-0000-4000-8000-000000000005',
  sectionEnrollment: '00000000-0000-4000-8000-000000000006',
  classEnrollment: '00000000-0000-4000-8000-000000000007',
};

function snapshot(
  overrides: Partial<StudentLifecycleSnapshot> = {},
): StudentLifecycleSnapshot {
  return {
    academicState: { schoolYear: '2026-2027', period: 'Q3', version: 4 },
    student: {
      id: ids.student,
      email: 'student@example.com',
      firstName: 'Ada',
      lastName: 'Luna',
    },
    sourceSection: {
      id: ids.section,
      name: 'Grade 7 - Mabini',
      gradeLevel: '7',
      schoolYear: '2026-2027',
      isActive: true,
      adviserId: '00000000-0000-4000-8000-000000000020',
      updatedAt: new Date('2026-09-11T00:00:00Z'),
    },
    sourceEnrollments: [
      {
        id: ids.sectionEnrollment,
        studentId: ids.student,
        sectionId: ids.section,
        classId: null,
        status: 'enrolled',
        createdAt: new Date('2026-06-01T00:00:00Z'),
      },
      {
        id: ids.classEnrollment,
        studentId: ids.student,
        sectionId: ids.section,
        classId: ids.class,
        status: 'enrolled',
        createdAt: new Date('2026-06-01T00:00:00Z'),
      },
    ],
    sourceClasses: [
      {
        id: ids.class,
        sectionId: ids.section,
        subjectCode: 'MATH-7',
        subjectName: 'Mathematics 7',
        schoolYear: '2026-2027',
        isActive: true,
        teacherId: '00000000-0000-4000-8000-000000000021',
        updatedAt: new Date('2026-09-11T00:00:00Z'),
      },
    ],
    participants: [
      {
        id: '00000000-0000-4000-8000-000000000030',
        studentId: ids.student,
        classId: ids.class,
        gradingPeriod: 'Q1',
        recordStatus: 'finalized',
        eligibility: 'eligible',
      },
      {
        id: '00000000-0000-4000-8000-000000000031',
        studentId: ids.student,
        classId: ids.class,
        gradingPeriod: 'Q3',
        recordStatus: 'draft',
        eligibility: 'eligible',
      },
    ],
    evidence: {
      draftParticipants: 1,
      finalizedParticipants: 1,
      scores: 0,
      attempts: 0,
    },
    destinationSection: null,
    destinationClasses: [],
    destinationActiveStudentCount: 0,
    destinationExistingEnrollment: false,
    destinationClassExistingEnrollment: false,
    ...overrides,
  };
}

describe('student lifecycle planning', () => {
  it('allows an evidence-free correction', () => {
    const result = planStudentLifecycle(
      snapshot({
        participants: [
          {
            id: '00000000-0000-4000-8000-000000000031',
            studentId: ids.student,
            classId: ids.class,
            gradingPeriod: 'Q3',
            recordStatus: 'draft',
            eligibility: 'eligible',
          },
        ],
        evidence: {
          draftParticipants: 1,
          finalizedParticipants: 0,
          scores: 0,
          attempts: 0,
        },
      }),
      {
        studentId: ids.student,
        sectionId: ids.section,
        resolution: 'CORRECT_ENROLLMENT',
        effectivePeriod: 'Q3',
      },
    );

    expect(result.blockers).toEqual([]);
    expect(result.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entityId: ids.sectionEnrollment }),
        expect.objectContaining({ entityId: ids.classEnrollment }),
      ]),
    );
    expect(result.participantChanges).toEqual([
      expect.objectContaining({ eligibility: 'not_enrolled' }),
    ]);
  });

  it('blocks correction when result-bearing evidence exists', () => {
    const result = planStudentLifecycle(
      snapshot({
        evidence: {
          draftParticipants: 1,
          finalizedParticipants: 1,
          scores: 1,
          attempts: 1,
        },
      }),
      {
        studentId: ids.student,
        sectionId: ids.section,
        resolution: 'CORRECT_ENROLLMENT',
        effectivePeriod: 'Q3',
      },
    );

    expect(result.blockers).toEqual([
      expect.objectContaining({ code: 'CORRECTION_HAS_ACADEMIC_EVIDENCE' }),
    ]);
  });

  it('withdraws only current and future editable participants', () => {
    const result = planStudentLifecycle(snapshot(), {
      studentId: ids.student,
      sectionId: ids.section,
      resolution: 'WITHDRAW',
      effectivePeriod: 'Q3',
    });

    expect(result.participantChanges).toEqual([
      expect.objectContaining({
        participantId: '00000000-0000-4000-8000-000000000031',
        eligibility: 'withdrawn',
      }),
    ]);
    expect(result.preserved).toContain('Finalized Q1 class record');
  });

  it('plans a compatible section transfer with matching subject classes', () => {
    const result = planStudentLifecycle(
      snapshot({
        destinationSection: {
          id: ids.destinationSection,
          name: 'Grade 7 - Rizal',
          gradeLevel: '7',
          schoolYear: '2026-2027',
          capacity: 40,
          isActive: true,
          adviserId: '00000000-0000-4000-8000-000000000022',
          updatedAt: new Date('2026-09-11T00:00:00Z'),
        },
        destinationClasses: [
          {
            id: ids.destinationClass,
            sectionId: ids.destinationSection,
            subjectCode: 'MATH-7',
            subjectName: 'Mathematics 7',
            schoolYear: '2026-2027',
            isActive: true,
            teacherId: '00000000-0000-4000-8000-000000000023',
            updatedAt: new Date('2026-09-11T00:00:00Z'),
          },
        ],
        destinationActiveStudentCount: 20,
      }),
      {
        studentId: ids.student,
        sectionId: ids.section,
        resolution: 'TRANSFER_SECTION',
        destinationSectionId: ids.destinationSection,
        effectivePeriod: 'Q3',
      },
    );

    expect(result.blockers).toEqual([]);
    expect(result.destinationClassMap).toEqual({
      [ids.class]: ids.destinationClass,
    });
    expect(result.participantChanges[0]).toEqual(
      expect.objectContaining({ eligibility: 'transferred' }),
    );
  });

  it.each([
    ['DESTINATION_INACTIVE', { isActive: false }],
    ['DESTINATION_SCHOOL_YEAR_MISMATCH', { schoolYear: '2025-2026' }],
    ['DESTINATION_GRADE_MISMATCH', { gradeLevel: '8' }],
    ['DESTINATION_AT_CAPACITY', { capacity: 20 }],
  ])(
    'blocks incompatible section transfer: %s',
    (code, destinationOverride) => {
      const result = planStudentLifecycle(
        snapshot({
          destinationSection: {
            id: ids.destinationSection,
            name: 'Destination',
            gradeLevel: '7',
            schoolYear: '2026-2027',
            capacity: 40,
            isActive: true,
            adviserId: null,
            updatedAt: new Date('2026-09-11T00:00:00Z'),
            ...destinationOverride,
          },
          destinationActiveStudentCount: 20,
        }),
        {
          studentId: ids.student,
          sectionId: ids.section,
          resolution: 'TRANSFER_SECTION',
          destinationSectionId: ids.destinationSection,
          effectivePeriod: 'Q3',
        },
      );

      expect(result.blockers).toEqual([expect.objectContaining({ code })]);
    },
  );

  it('blocks section transfer when a subject destination is missing', () => {
    const result = planStudentLifecycle(
      snapshot({
        destinationSection: {
          id: ids.destinationSection,
          name: 'Destination',
          gradeLevel: '7',
          schoolYear: '2026-2027',
          capacity: 40,
          isActive: true,
          adviserId: null,
          updatedAt: new Date('2026-09-11T00:00:00Z'),
        },
        destinationActiveStudentCount: 20,
      }),
      {
        studentId: ids.student,
        sectionId: ids.section,
        resolution: 'TRANSFER_SECTION',
        destinationSectionId: ids.destinationSection,
        effectivePeriod: 'Q3',
      },
    );

    expect(result.blockers).toEqual([
      expect.objectContaining({ code: 'DESTINATION_CLASS_MISSING' }),
    ]);
  });

  it('plans a compatible class transfer without changing section membership', () => {
    const result = planStudentLifecycle(
      snapshot({
        destinationClasses: [
          {
            id: ids.destinationClass,
            sectionId: ids.section,
            subjectCode: 'MATH-7',
            subjectName: 'Mathematics 7',
            schoolYear: '2026-2027',
            isActive: true,
            teacherId: null,
            updatedAt: new Date('2026-09-11T00:00:00Z'),
          },
        ],
      }),
      {
        studentId: ids.student,
        sectionId: ids.section,
        classId: ids.class,
        resolution: 'TRANSFER_CLASS',
        destinationClassId: ids.destinationClass,
        effectivePeriod: 'Q3',
      },
    );

    expect(result.blockers).toEqual([]);
    expect(result.effects).not.toContainEqual(
      expect.objectContaining({ entityId: ids.sectionEnrollment }),
    );
    expect(result.destinationClassMap).toEqual({
      [ids.class]: ids.destinationClass,
    });
  });

  it('blocks a non-current effective period', () => {
    const result = planStudentLifecycle(snapshot(), {
      studentId: ids.student,
      sectionId: ids.section,
      resolution: 'WITHDRAW',
      effectivePeriod: 'Q2',
    });

    expect(result.blockers).toEqual([
      expect.objectContaining({ code: 'EFFECTIVE_PERIOD_NOT_CURRENT' }),
    ]);
  });
});

describe('student lifecycle mutations', () => {
  it('updates memberships and records append-only withdrawal events', async () => {
    const where = jest.fn().mockResolvedValue(undefined);
    const set = jest.fn().mockReturnValue({ where });
    const values = jest.fn().mockResolvedValue(undefined);
    const db = {
      update: jest.fn().mockReturnValue({ set }),
      insert: jest.fn().mockReturnValue({ values }),
    };
    const service = new StudentLifecycleService({ db } as never);
    const dto = {
      studentId: ids.student,
      sectionId: ids.section,
      resolution: 'WITHDRAW' as const,
      effectivePeriod: 'Q3' as const,
    };
    const source = snapshot();
    const plan = planStudentLifecycle(source, dto);

    const result = await service.apply(
      dto,
      { snapshot: source, plan, manifest: {} as never },
      {
        operationId: '00000000-0000-4000-8000-000000000050',
        actorId: '00000000-0000-4000-8000-000000000051',
        actorSnapshot: {
          userId: '00000000-0000-4000-8000-000000000051',
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'User',
        },
        reasonCode: 'WITHDREW',
        notes: 'Registrar confirmed the learner withdrawal.',
      },
    );

    expect(db.update).toHaveBeenCalledWith(enrollments);
    expect(db.insert).toHaveBeenCalledWith(enrollmentLifecycleEvents);
    expect(values).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          enrollmentId: ids.sectionEnrollment,
          outcome: 'withdrawn',
          toStatus: 'dropped',
        }),
      ]),
    );
    expect(result.changed).toHaveLength(2);
  });
});
