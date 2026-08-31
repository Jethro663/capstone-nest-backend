import { calculatePeriodGrade } from '../academic-state/academic-policy';
import type {
  AcademicPolicy,
  GradeBand,
} from '../academic-state/academic-policy';

export interface GradeBlocker {
  code: string;
  message: string;
  studentId?: string;
  itemId?: string;
  categoryId?: string;
  classId?: string;
  classRecordId?: string;
  period?: string;
}
export interface CalculationCategory {
  id: string;
  name: string;
  weightPercentage: string;
}
export interface CalculationScore {
  studentId: string;
  score: string | null;
  status?: string;
  reason?: string | null;
}
export interface CalculationItem {
  id: string;
  categoryId: string;
  maxScore: string;
  examComponent?: string | null;
  scores: CalculationScore[];
}

/** No missing grade can escape this function as a finalized numeric result. */
export function calculateStudentRecord(
  studentId: string,
  policy: AcademicPolicy,
  categories: readonly CalculationCategory[],
  items: readonly CalculationItem[],
  legacyBands?: readonly GradeBand[],
) {
  const blockers: GradeBlocker[] = [];
  let unroundedInitialGrade = 0;
  const weightTotal = categories.reduce(
    (sum, category) => sum + Number(category.weightPercentage),
    0,
  );
  if (!Number.isFinite(weightTotal) || Math.abs(weightTotal - 100) > 0.001)
    blockers.push({
      code: 'invalid_weights',
      message: 'Category weights must total 100%',
    });
  const categoryBreakdown = categories.map((category) => {
    const weight = Number(category.weightPercentage);
    const requiredItems = items.filter(
      (item) => item.categoryId === category.id && Number(item.maxScore) > 0,
    );
    const localBlockers: GradeBlocker[] = [];
    const add = (code: string, message: string, itemId?: string) =>
      localBlockers.push({
        code,
        message,
        studentId,
        categoryId: category.id,
        ...(itemId ? { itemId } : {}),
      });
    const isExam =
      policy.examComponents.length > 0 &&
      /quarterly|examination/i.test(category.name);
    if (weight > 0 && !requiredItems.length)
      add('empty_category', `${category.name} has no configured items`);
    if (weight < 0 || !Number.isFinite(weight))
      add('invalid_weights', 'Category weight is invalid');
    if (weight > 0 && isExam) {
      for (const component of policy.examComponents) {
        if (
          requiredItems.filter((item) => item.examComponent === component.key)
            .length !== 1
        )
          add(
            'missing_exam_component',
            `${category.name} requires exactly one ${component.key}`,
          );
      }
      if (
        requiredItems.some(
          (item) =>
            !policy.examComponents.some(
              (component) => component.key === item.examComponent,
            ),
        )
      )
        add(
          'invalid_exam_component',
          'Every examination item must identify ST1, ST2, or TE',
        );
    }
    let totalRaw = 0;
    let totalHPS = 0;
    let examPercentage = 0;
    let availableExamWeight = 0;
    for (const item of requiredItems) {
      const scoreRow = item.scores.find(
        (score) => score.studentId === studentId,
      );
      if (scoreRow?.status === 'excused') {
        if (scoreRow.score !== null || !scoreRow.reason?.trim())
          add(
            'invalid_exemption',
            'Excused items require a reason and no numeric score',
            item.id,
          );
        continue;
      }
      const hps = Number(item.maxScore);
      totalHPS += hps;
      if (!scoreRow || scoreRow.score === null) {
        if (weight > 0)
          add('missing_score', 'A required score is missing', item.id);
        continue;
      }
      const score = Number(scoreRow.score);
      if (
        !Number.isFinite(score) ||
        score < 0 ||
        score > hps ||
        (scoreRow.status && scoreRow.status !== 'recorded')
      ) {
        add(
          'invalid_score',
          'Recorded score must be between zero and the highest possible score',
          item.id,
        );
        continue;
      }
      totalRaw += score;
      if (isExam) {
        const componentWeight =
          policy.examComponents.find(
            (component) => component.key === item.examComponent,
          )?.weight ?? 0;
        examPercentage += (score / hps) * 100 * componentWeight;
        availableExamWeight += componentWeight;
      }
    }
    if (weight > 0 && requiredItems.length > 0 && totalHPS === 0)
      add(
        'empty_student_category',
        'All required items in this category are excused; a grade cannot be inferred',
      );
    blockers.push(...localBlockers);
    const percentageScore = localBlockers.length
      ? null
      : isExam
        ? availableExamWeight > 0
          ? examPercentage / availableExamWeight
          : 0
        : totalHPS > 0
          ? (totalRaw / totalHPS) * 100
          : 0;
    const weightedScore =
      percentageScore === null ? null : (percentageScore * weight) / 100;
    unroundedInitialGrade += weightedScore ?? 0;
    return {
      categoryId: category.id,
      categoryName: category.name,
      weightPercentage: weight,
      totalRaw: Number(totalRaw.toFixed(2)),
      totalHPS: Number(totalHPS.toFixed(2)),
      percentageScore:
        percentageScore === null ? null : Number(percentageScore.toFixed(6)),
      weightedScore:
        weightedScore === null ? null : Number(weightedScore.toFixed(6)),
    };
  });
  const initialGrade = blockers.length
    ? null
    : Number(unroundedInitialGrade.toFixed(3));
  const quarterlyGrade =
    initialGrade === null
      ? null
      : calculatePeriodGrade(unroundedInitialGrade, policy, legacyBands);
  return {
    studentId,
    initialGrade,
    quarterlyGrade,
    remarks:
      quarterlyGrade === null
        ? ('Incomplete' as const)
        : quarterlyGrade < policy.passingGrade
          ? ('For Intervention' as const)
          : ('Passed' as const),
    categoryBreakdown,
    blockers,
  };
}
