import { classifyLifecycleEvidence } from './admin-lifecycle.evidence';

describe('admin lifecycle evidence inventory', () => {
  it.each([
    'enrollmentHistory',
    'lifecycleEvents',
    'classRecords',
    'scores',
    'attempts',
    'assessments',
    'lessons',
    'linkedClasses',
  ] as const)('treats %s as retained purge evidence', (category) => {
    const inventory = classifyLifecycleEvidence({ [category]: 1 });

    expect(inventory.hasRetainedEvidence).toBe(true);
    expect(inventory.blockingCategories).toContain(category);
  });

  it('allows an empty evidence inventory', () => {
    expect(classifyLifecycleEvidence({})).toEqual({
      counts: {
        enrollmentHistory: 0,
        lifecycleEvents: 0,
        classRecords: 0,
        finalizedParticipants: 0,
        scores: 0,
        attempts: 0,
        assessments: 0,
        lessons: 0,
        linkedClasses: 0,
      },
      hasRetainedEvidence: false,
      blockingCategories: [],
    });
  });

  it('allows draft participants alone for an erroneous-enrollment correction', () => {
    const inventory = classifyLifecycleEvidence(
      { draftParticipants: 2 },
      { purpose: 'student-correction' },
    );

    expect(inventory.hasRetainedEvidence).toBe(false);
  });

  it('blocks a correction when finalized participants or results exist', () => {
    const inventory = classifyLifecycleEvidence(
      { draftParticipants: 1, finalizedParticipants: 1, attempts: 1 },
      { purpose: 'student-correction' },
    );

    expect(inventory.blockingCategories).toEqual([
      'finalizedParticipants',
      'attempts',
    ]);
  });
});
