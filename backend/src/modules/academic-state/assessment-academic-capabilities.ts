import type { AcademicPolicy } from './academic-policy';

export function assessmentAcademicCapabilities(input: {
  policy: AcademicPolicy;
  schoolYear: string;
  activeSchoolYear: string;
  quarter: string | null | undefined;
  activeQuarter: string;
  classActive: boolean;
  workbookStatus?: string | null;
  published: boolean;
  hasAttempt?: boolean;
  hasOngoingAttempt?: boolean;
}) {
  const period = input.policy.periods.find((p) => p.key === input.quarter);
  const periodIndex = input.policy.periods.findIndex(
    (p) => p.key === input.quarter,
  );
  const activeIndex = input.policy.periods.findIndex(
    (p) => p.key === input.activeQuarter,
  );
  const sameYear =
    input.schoolYear === input.activeSchoolYear && input.classActive;
  const closed =
    !input.classActive || input.schoolYear < input.activeSchoolYear;
  const future =
    input.schoolYear > input.activeSchoolYear ||
    (sameYear && periodIndex > activeIndex);
  const finalized = Boolean(
    input.workbookStatus && input.workbookStatus !== 'draft',
  );
  const editable = Boolean(period) && !closed && !finalized;
  const active =
    sameYear && input.quarter === input.activeQuarter && Boolean(period);
  return {
    schoolYear: input.schoolYear,
    period: input.quarter ?? null,
    periodLabel: period?.label ?? input.quarter ?? 'Unassigned',
    periods: input.policy.periods,
    policyId: input.policy.id,
    activeSchoolYear: input.activeSchoolYear,
    activePeriod: input.activeQuarter,
    canPrepare: editable,
    canRelease: editable && active,
    canView:
      (Boolean(input.hasAttempt) && (!period || closed)) ||
      (Boolean(period) &&
        input.published &&
        (!future || Boolean(input.hasAttempt))),
    canStart: editable && active && input.published,
    canContinue: editable && sameYear && Boolean(input.hasOngoingAttempt),
    canGrade: editable && sameYear && !future,
    workbookStatus: input.workbookStatus ?? null,
    readOnlyReason: !period
      ? 'Invalid or unassigned grading period'
      : closed
        ? 'School year is closed'
        : finalized
          ? 'Period workbook is finalized or locked'
          : null,
  };
}
