import type { Assessment } from '@/types/assessment';

function hasValue(value: string | null | undefined) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function hasCoreAssessmentPlacementForPublish(
  assessment: Pick<
    Assessment,
    'classRecordCategory' | 'quarter' | 'classRecordItemId' | 'classRecordPlacement'
  >,
) {
  const category =
    assessment.classRecordCategory ?? assessment.classRecordPlacement?.category ?? null;
  const quarter =
    assessment.quarter ?? assessment.classRecordPlacement?.gradingPeriod ?? null;
  const itemId =
    assessment.classRecordItemId ?? assessment.classRecordPlacement?.itemId ?? null;

  return hasValue(category) && hasValue(quarter) && hasValue(itemId);
}

export function resolveAssessmentForPublishValidation<
  T extends Pick<
    Assessment,
    'classRecordCategory' | 'quarter' | 'classRecordItemId' | 'classRecordPlacement'
  >,
>(assessment: T, detailedAssessment?: T | null) {
  if (hasCoreAssessmentPlacementForPublish(assessment)) {
    return assessment;
  }

  if (detailedAssessment && hasCoreAssessmentPlacementForPublish(detailedAssessment)) {
    return detailedAssessment;
  }

  return assessment;
}
