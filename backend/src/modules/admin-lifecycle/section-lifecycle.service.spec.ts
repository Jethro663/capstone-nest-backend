import {
  planSectionLifecycle,
  SectionLifecycleService,
  type SectionLifecycleSnapshot,
} from './section-lifecycle.service';
import {
  classes,
  enrollmentLifecycleEvents,
  enrollments,
  sections,
} from '../../drizzle/schema';

const sectionId = '00000000-0000-4000-8000-000000000201';
const studentId = '00000000-0000-4000-8000-000000000202';

function snapshot(
  overrides: Partial<SectionLifecycleSnapshot> = {},
): SectionLifecycleSnapshot {
  return {
    academicState: { schoolYear: '2026-2027', period: 'Q3', version: 2 },
    section: {
      id: sectionId,
      name: 'Mabini',
      gradeLevel: '7',
      schoolYear: '2026-2027',
      capacity: 40,
      isActive: true,
      adviserId: '00000000-0000-4000-8000-000000000203',
      updatedAt: new Date('2026-09-11T00:00:00Z'),
    },
    linkedClasses: [],
    activeEnrollments: [],
    activeStudentIds: [],
    students: [],
    learnerPlans: {},
    evidence: { enrollments: 0, linkedClasses: 0 },
    ...overrides,
  };
}

describe('section lifecycle planning', () => {
  it('allows an empty active section to close', () => {
    const result = planSectionLifecycle(snapshot(), {
      sectionId,
      effectivePeriod: 'Q3',
      studentResolutions: [],
    });

    expect(result.blockers).toEqual([]);
    expect(result.effects).toContainEqual(
      expect.objectContaining({ entityType: 'section', kind: 'archive' }),
    );
  });

  it('identifies every unresolved learner', () => {
    const result = planSectionLifecycle(
      snapshot({ activeStudentIds: [studentId] }),
      { sectionId, effectivePeriod: 'Q3', studentResolutions: [] },
    );

    expect(result.blockers).toEqual([
      expect.objectContaining({ code: 'UNRESOLVED_SECTION_LEARNERS' }),
    ]);
  });

  it('redirects ordinary annual completion to academic transition', () => {
    const result = planSectionLifecycle(
      snapshot({ activeStudentIds: [studentId] }),
      {
        sectionId,
        effectivePeriod: 'Q3',
        studentResolutions: [{ studentId, resolution: 'COMPLETE' }],
      },
    );

    expect(result.blockers).toEqual([
      expect.objectContaining({ code: 'USE_ACADEMIC_TRANSITION' }),
    ]);
  });

  it('propagates incompatible destination blockers', () => {
    const result = planSectionLifecycle(
      snapshot({
        activeStudentIds: [studentId],
        learnerPlans: {
          [studentId]: {
            blockers: [
              {
                code: 'DESTINATION_AT_CAPACITY',
                message: 'Destination is full.',
                resolvable: false,
              },
            ],
            warnings: [],
            effects: [],
            preserved: [],
            requiredConfirmations: [],
            affectedUserIds: [studentId],
          },
        },
      }),
      {
        sectionId,
        effectivePeriod: 'Q3',
        studentResolutions: [
          {
            studentId,
            resolution: 'TRANSFER_SECTION',
            destinationSectionId: '00000000-0000-4000-8000-000000000204',
          },
        ],
      },
    );

    expect(result.blockers).toContainEqual(
      expect.objectContaining({ code: 'DESTINATION_AT_CAPACITY' }),
    );
  });

  it('blocks grouped transfers that would collectively exceed capacity', () => {
    const secondStudent = '00000000-0000-4000-8000-000000000205';
    const destination = '00000000-0000-4000-8000-000000000204';
    const emptyPlan = {
      blockers: [],
      warnings: [],
      effects: [],
      preserved: [],
      requiredConfirmations: [],
      affectedUserIds: [],
    };
    const result = planSectionLifecycle(
      snapshot({
        activeStudentIds: [studentId, secondStudent],
        learnerPlans: {
          [studentId]: emptyPlan,
          [secondStudent]: emptyPlan,
        },
        destinationCapacity: {
          [destination]: { currentStudents: 39, capacity: 40 },
        },
      }),
      {
        sectionId,
        effectivePeriod: 'Q3',
        studentResolutions: [studentId, secondStudent].map((id) => ({
          studentId: id,
          resolution: 'TRANSFER_SECTION' as const,
          destinationSectionId: destination,
        })),
      },
    );

    expect(result.blockers).toContainEqual(
      expect.objectContaining({ code: 'DESTINATION_GROUP_EXCEEDS_CAPACITY' }),
    );
  });

  it('turns grouped capacity excess into an acknowledged Maintenance warning', () => {
    const secondStudent = '00000000-0000-4000-8000-000000000205';
    const destination = '00000000-0000-4000-8000-000000000204';
    const emptyPlan = {
      blockers: [],
      warnings: [],
      effects: [],
      preserved: [],
      requiredConfirmations: [],
      affectedUserIds: [],
    };
    const result = planSectionLifecycle(
      snapshot({
        activeStudentIds: [studentId, secondStudent],
        learnerPlans: {
          [studentId]: emptyPlan,
          [secondStudent]: emptyPlan,
        },
        destinationCapacity: {
          [destination]: { currentStudents: 39, capacity: 40 },
        },
      }),
      {
        sectionId,
        effectivePeriod: 'Q3',
        studentResolutions: [studentId, secondStudent].map((id) => ({
          studentId: id,
          resolution: 'TRANSFER_SECTION' as const,
          destinationSectionId: destination,
        })),
      },
      { allowSectionCapacityOverride: true },
    );

    expect(result.blockers).not.toContainEqual(
      expect.objectContaining({ code: 'DESTINATION_GROUP_EXCEEDS_CAPACITY' }),
    );
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'SECTION_CAPACITY' }),
    );
    expect(result.requiredConfirmations).toContain(
      'ACKNOWLEDGE_SECTION_CAPACITY',
    );
  });

  it('retires an empty historical section and linked classes', () => {
    const linkedTeacherId = '00000000-0000-4000-8000-000000000211';
    const result = planSectionLifecycle(
      snapshot({
        section: { ...snapshot().section, schoolYear: '2025-2026' },
        linkedClasses: [
          {
            id: '00000000-0000-4000-8000-000000000210',
            sectionId,
            subjectCode: 'MATH-7',
            subjectName: 'Mathematics 7',
            schoolYear: '2025-2026',
            isActive: true,
            teacherId: linkedTeacherId,
            updatedAt: new Date('2025-06-01T00:00:00Z'),
          },
        ],
      }),
      {
        sectionId,
        lifecycleMode: 'HISTORICAL_RETIREMENT',
        studentResolutions: [],
      } as never,
    );

    expect(result.blockers).toEqual([]);
    expect(result.notificationUserIds).toEqual([]);
    expect(result.notificationRetirement).toEqual({
      userIds: ['00000000-0000-4000-8000-000000000203', linkedTeacherId],
      classIds: ['00000000-0000-4000-8000-000000000210'],
      sectionIds: [sectionId],
    });
    expect(result.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entityType: 'class', kind: 'archive' }),
        expect.objectContaining({ entityType: 'section', kind: 'archive' }),
      ]),
    );
    expect(result.requiredConfirmations).toContain('HISTORICAL_RETIREMENT');
  });

  it('allows explicit completion during historical section retirement', () => {
    const result = planSectionLifecycle(
      snapshot({
        section: { ...snapshot().section, schoolYear: '2025-2026' },
        activeStudentIds: [studentId],
        activeEnrollments: [
          {
            id: '00000000-0000-4000-8000-000000000211',
            studentId,
            sectionId,
            classId: null,
            status: 'enrolled',
            createdAt: new Date('2025-06-01T00:00:00Z'),
          },
        ],
      }),
      {
        sectionId,
        lifecycleMode: 'HISTORICAL_RETIREMENT',
        effectivePeriod: 'Q4',
        studentResolutions: [{ studentId, resolution: 'COMPLETE' }],
      } as never,
    );

    expect(result.blockers).toEqual([]);
    expect(result.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entityType: 'enrollment', kind: 'update' }),
        expect.objectContaining({ entityType: 'section', kind: 'archive' }),
      ]),
    );
  });

  it('returns mode-aware choice-only output for unresolved historical learners', () => {
    const result = planSectionLifecycle(
      snapshot({
        section: { ...snapshot().section, schoolYear: '2025-2026' },
        activeStudentIds: [studentId],
      }),
      {
        sectionId,
        lifecycleMode: 'HISTORICAL_RETIREMENT',
      },
    );

    expect(result.blockers).toContainEqual(
      expect.objectContaining({
        code: 'UNRESOLVED_SECTION_LEARNERS',
        resolutionOptions: ['WITHDRAW', 'TRANSFER_SECTION', 'COMPLETE'],
      }),
    );
    expect(result.effects).toEqual([]);
    expect(result.requiredConfirmations).toEqual([]);
  });

  it('rejects historical mode for the active year without proposing mutations', () => {
    const result = planSectionLifecycle(snapshot(), {
      sectionId,
      lifecycleMode: 'HISTORICAL_RETIREMENT',
    });

    expect(result.blockers).toContainEqual(
      expect.objectContaining({ code: 'HISTORICAL_MODE_NOT_APPLICABLE' }),
    );
    expect(result.effects).toEqual([]);
    expect(result.requiredConfirmations).toEqual([]);
  });

  it('writes historical completion status and append-only lifecycle evidence before archival', async () => {
    const updateWhere = jest.fn().mockResolvedValue(undefined);
    const updateSet = jest.fn().mockReturnValue({ where: updateWhere });
    const insertValues = jest.fn().mockResolvedValue(undefined);
    const db = {
      update: jest.fn().mockReturnValue({ set: updateSet }),
      insert: jest.fn().mockReturnValue({ values: insertValues }),
    };
    const service = new SectionLifecycleService({ db } as never, {} as never);
    const historicalSnapshot = snapshot({
      section: { ...snapshot().section, schoolYear: '2025-2026' },
      linkedClasses: [
        {
          id: '00000000-0000-4000-8000-000000000210',
          sectionId,
          subjectCode: 'MATH-7',
          subjectName: 'Mathematics 7',
          schoolYear: '2025-2026',
          isActive: true,
          teacherId: null,
          updatedAt: new Date('2025-06-01T00:00:00Z'),
        },
      ],
      activeStudentIds: [studentId],
      activeEnrollments: [
        {
          id: '00000000-0000-4000-8000-000000000211',
          studentId,
          sectionId,
          classId: null,
          status: 'enrolled',
          createdAt: new Date('2025-06-01T00:00:00Z'),
        },
      ],
      students: [
        {
          id: studentId,
          email: 'student@example.com',
          firstName: 'Ana',
          lastName: 'Learner',
        },
      ],
    });

    const result = await service.apply(
      {
        sectionId,
        lifecycleMode: 'HISTORICAL_RETIREMENT',
        effectivePeriod: 'Q4',
        studentResolutions: [{ studentId, resolution: 'COMPLETE' }],
      },
      {
        snapshot: historicalSnapshot,
        plan: {
          blockers: [],
          warnings: [],
          effects: [],
          preserved: ['Academic evidence'],
          requiredConfirmations: [
            'PRESERVE_ACADEMIC_HISTORY',
            'HISTORICAL_RETIREMENT',
            'COMPLETE',
          ],
          affectedUserIds: [studentId],
          resolvedStudentIds: [studentId],
        },
        learnerPrepared: {},
        manifest: {} as never,
      },
      {
        operationId: '00000000-0000-4000-8000-000000000212',
        actorId: '00000000-0000-4000-8000-000000000213',
        actorSnapshot: {
          userId: '00000000-0000-4000-8000-000000000213',
          email: 'admin@example.com',
          firstName: 'Ada',
          lastName: 'Admin',
        },
        reasonCode: 'COMPLETED',
        notes: 'Verified historical completion with the registrar.',
      },
    );

    expect(updateSet).toHaveBeenCalledWith({ status: 'completed' });
    expect(insertValues).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          enrollmentId: '00000000-0000-4000-8000-000000000211',
          outcome: 'completed',
          effectivePeriod: 'Q4',
        }),
      ]),
    );
    expect(result.changed).toContainEqual(
      expect.objectContaining({
        entityId: '00000000-0000-4000-8000-000000000211',
        outcome: 'completed',
      }),
    );
    expect(db.update.mock.calls.map(([table]) => table)).toEqual([
      enrollments,
      classes,
      sections,
    ]);
    expect(db.insert.mock.calls.map(([table]) => table)).toEqual([
      enrollmentLifecycleEvents,
    ]);
  });

  it('does not archive linked structure when a learner resolution fails', async () => {
    const updateWhere = jest.fn().mockResolvedValue(undefined);
    const db = {
      update: jest
        .fn()
        .mockReturnValue({ set: jest.fn().mockReturnValue({ where: updateWhere }) }),
    };
    const learnerApply = jest
      .fn()
      .mockRejectedValue(new Error('learner resolution failed'));
    const service = new SectionLifecycleService(
      { db } as never,
      { apply: learnerApply } as never,
    );
    const historicalSnapshot = snapshot({
      section: { ...snapshot().section, schoolYear: '2025-2026' },
      linkedClasses: [
        {
          id: '00000000-0000-4000-8000-000000000210',
          sectionId,
          subjectCode: 'MATH-7',
          subjectName: 'Mathematics 7',
          schoolYear: '2025-2026',
          isActive: true,
          teacherId: null,
          updatedAt: new Date('2025-06-01T00:00:00Z'),
        },
      ],
      activeStudentIds: [studentId],
    });

    await expect(
      service.apply(
        {
          sectionId,
          lifecycleMode: 'HISTORICAL_RETIREMENT',
          effectivePeriod: 'Q4',
          studentResolutions: [{ studentId, resolution: 'WITHDRAW' }],
        },
        {
          snapshot: historicalSnapshot,
          plan: {
            blockers: [],
            warnings: [],
            effects: [],
            preserved: [],
            requiredConfirmations: [],
            affectedUserIds: [studentId],
            resolvedStudentIds: [studentId],
          },
          learnerPrepared: { [studentId]: {} as never },
          manifest: {} as never,
        },
        {
          operationId: '00000000-0000-4000-8000-000000000212',
          actorId: '00000000-0000-4000-8000-000000000213',
          actorSnapshot: {
            userId: '00000000-0000-4000-8000-000000000213',
            email: 'admin@example.com',
            firstName: 'Ada',
            lastName: 'Admin',
          },
          reasonCode: 'WITHDREW',
          notes: 'Verified historical withdrawal.',
        },
      ),
    ).rejects.toThrow('learner resolution failed');
    expect(db.update).not.toHaveBeenCalled();
  });
});
