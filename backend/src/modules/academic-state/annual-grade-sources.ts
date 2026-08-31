import type { AcademicPolicy, PeriodKey } from './academic-policy';
import type { AnnualComponentEvidence } from '../../drizzle/schema/academic-grading.schema';
export interface AnnualSource {
  id: string;
  period: string;
  grade: number;
  sourceType: 'period_revision' | 'external';
  classId: string | null;
  trusted: boolean;
}
export interface AnnualSourceSelection {
  period: string;
  sourceId: string;
  sourceType: 'period_revision' | 'external';
}
export interface AnnualSourceBlocker {
  code: string;
  period: PeriodKey;
  message: string;
  sourceIds: string[];
}

export function selectAnnualSources(
  policy: AcademicPolicy,
  sources: readonly AnnualSource[],
  selections: readonly AnnualSourceSelection[],
) {
  const components: AnnualComponentEvidence[] = [];
  const blockers: AnnualSourceBlocker[] = [];
  for (const period of policy.periods) {
    const candidates = sources.filter((source) => source.period === period.key);
    const selection = selections.find(
      (selected) => selected.period === period.key,
    );
    const selected = selection
      ? candidates.find(
          (source) =>
            source.id === selection.sourceId &&
            source.sourceType === selection.sourceType,
        )
      : candidates.length === 1
        ? candidates[0]
        : undefined;
    const add = (code: string, message: string) =>
      blockers.push({
        code,
        period: period.key,
        message,
        sourceIds: candidates.map((source) => source.id),
      });
    if (selection && !selected)
      add(
        'stale_source_selection',
        `${period.label}: selected source is no longer valid`,
      );
    else if (!candidates.length)
      add(
        'missing_period_grade',
        `${period.label}: a finalized or verified transfer grade is required`,
      );
    else if (!selected)
      add(
        'conflicting_period_sources',
        `${period.label}: multiple sources require explicit admin selection`,
      );
    else if (!selected.trusted)
      add(
        'untrusted_period_source',
        `${period.label}: historical eligibility and grading evidence require confirmation`,
      );
    else if (
      !Number.isInteger(selected.grade) ||
      selected.grade < 0 ||
      selected.grade > 100
    )
      add(
        'invalid_period_grade',
        `${period.label}: official grade must be a whole number from 0 to 100`,
      );
    else
      components.push({
        period: period.key,
        grade: selected.grade,
        sourceType: selected.sourceType,
        sourceId: selected.id,
        classId: selected.classId,
      });
  }
  return { components, blockers };
}
