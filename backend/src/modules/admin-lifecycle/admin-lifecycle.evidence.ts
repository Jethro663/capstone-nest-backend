export interface LifecycleEvidenceCounts {
  enrollmentHistory: number;
  lifecycleEvents: number;
  classRecords: number;
  draftParticipants: number;
  finalizedParticipants: number;
  scores: number;
  attempts: number;
  assessments: number;
  lessons: number;
  linkedClasses: number;
}

export type LifecycleEvidenceInput = Partial<LifecycleEvidenceCounts>;

const RETAINED_CATEGORIES: Array<keyof LifecycleEvidenceCounts> = [
  'enrollmentHistory',
  'lifecycleEvents',
  'classRecords',
  'finalizedParticipants',
  'scores',
  'attempts',
  'assessments',
  'lessons',
  'linkedClasses',
];

export function classifyLifecycleEvidence(
  input: LifecycleEvidenceInput,
  _options: { purpose?: 'purge' | 'student-correction' } = {},
) {
  const counts: LifecycleEvidenceCounts = {
    enrollmentHistory: input.enrollmentHistory ?? 0,
    lifecycleEvents: input.lifecycleEvents ?? 0,
    classRecords: input.classRecords ?? 0,
    draftParticipants: input.draftParticipants ?? 0,
    finalizedParticipants: input.finalizedParticipants ?? 0,
    scores: input.scores ?? 0,
    attempts: input.attempts ?? 0,
    assessments: input.assessments ?? 0,
    lessons: input.lessons ?? 0,
    linkedClasses: input.linkedClasses ?? 0,
  };
  const blockingCategories = RETAINED_CATEGORIES.filter(
    (category) => counts[category] > 0,
  );

  return {
    counts: Object.fromEntries(
      Object.entries(counts).filter(([key]) => key !== 'draftParticipants'),
    ) as Omit<LifecycleEvidenceCounts, 'draftParticipants'>,
    hasRetainedEvidence: blockingCategories.length > 0,
    blockingCategories,
  };
}
