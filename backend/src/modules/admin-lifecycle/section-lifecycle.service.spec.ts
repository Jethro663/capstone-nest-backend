import {
  planSectionLifecycle,
  type SectionLifecycleSnapshot,
} from './section-lifecycle.service';

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
    activeStudentIds: [],
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
});
