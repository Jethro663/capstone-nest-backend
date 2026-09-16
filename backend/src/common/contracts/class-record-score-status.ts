export const CLASS_RECORD_SCORE_STATUSES = [
  'recorded',
  'excused',
  'excused_with_score',
] as const;

export type ClassRecordScoreStatus =
  (typeof CLASS_RECORD_SCORE_STATUSES)[number];

export function isExcusedScoreStatus(
  status: string | null | undefined,
): status is 'excused' | 'excused_with_score' {
  return status === 'excused' || status === 'excused_with_score';
}

export function isScoredClassRecordStatus(
  status: string | null | undefined,
): status is 'recorded' | 'excused_with_score' {
  return status === 'recorded' || status === 'excused_with_score';
}

export function excludesItemFromGrade(
  status: string | null | undefined,
): status is 'excused' {
  return status === 'excused';
}
