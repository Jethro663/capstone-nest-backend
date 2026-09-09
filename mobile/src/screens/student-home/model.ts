export type StudentHomeAssessment = {
  id: string;
  dueAt?: string | null;
};

export type StudentHomeScheduleItem = {
  id: string;
  startsAtMinutes: number;
};

export type StudentHomeLearningItem = {
  id: string;
};

export type StudentHomeAgendaInput<
  AssessmentItem extends StudentHomeAssessment,
  ScheduleItem extends StudentHomeScheduleItem,
  LearningItem extends StudentHomeLearningItem,
> = {
  now?: Date;
  assessments: AssessmentItem[];
  schedule: ScheduleItem[];
  continueLearning: LearningItem[];
};

export function buildStudentHomeAgenda<
  AssessmentItem extends StudentHomeAssessment,
  ScheduleItem extends StudentHomeScheduleItem,
  LearningItem extends StudentHomeLearningItem,
>({
  assessments,
  schedule,
  continueLearning,
}: StudentHomeAgendaInput<AssessmentItem, ScheduleItem, LearningItem>) {
  const dueSoon = [...assessments].sort((left, right) => {
    const leftTime = left.dueAt
      ? new Date(left.dueAt).getTime()
      : Number.POSITIVE_INFINITY;
    const rightTime = right.dueAt
      ? new Date(right.dueAt).getTime()
      : Number.POSITIVE_INFINITY;

    return leftTime - rightTime;
  });
  const today = [...schedule]
    .sort((left, right) => left.startsAtMinutes - right.startsAtMinutes)
    .slice(0, 4);
  const nextLearning = continueLearning.slice(0, 1);
  const next = dueSoon[0]
    ? ({ kind: "assessment", id: dueSoon[0].id } as const)
    : nextLearning[0]
      ? ({ kind: "lesson", id: nextLearning[0].id } as const)
      : today[0]
        ? ({ kind: "schedule", id: today[0].id } as const)
        : null;

  return {
    next,
    today,
    continueLearning: nextLearning,
    dueSoon: dueSoon.slice(0, 4),
  };
}
