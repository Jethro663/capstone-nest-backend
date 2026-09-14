import { BadRequestException } from '@nestjs/common';
import type { PurgeTargetType } from './DTO/admin-lifecycle.dto';

export const ADMIN_ERASURE_CATALOG_VERSION = 1;

export type ErasureAction = 'DELETE' | 'DETACH' | 'PRESERVE_RECEIPT';

export interface ErasureDependencyRule {
  table: string;
  column: string;
  targetTable: 'classes' | 'sections' | 'users';
  targetTypes: PurgeTargetType[];
  action: ErasureAction;
  selector:
    | 'DIRECT_ID'
    | 'CLASS_DESCENDANT'
    | 'SECTION_DESCENDANT'
    | 'USER_PARTICIPANT'
    | 'USER_AUTHOR';
  group: string;
}

export interface ErasureForeignKeyReference {
  table: string;
  column: string;
  targetTable: string;
  onDelete: string;
}

const userStudentRule = (
  table: string,
  column = 'student_id',
  group = 'academicEvidence',
): ErasureDependencyRule => ({
  table,
  column,
  targetTable: 'users',
  targetTypes: ['USER'],
  action: 'DELETE',
  selector: 'USER_PARTICIPANT',
  group,
});

const userAuthorRule = (
  table: string,
  column: string,
): ErasureDependencyRule => ({
  table,
  column,
  targetTable: 'users',
  targetTypes: ['USER'],
  action: 'DETACH',
  selector: 'USER_AUTHOR',
  group: 'institutionalAuthorship',
});

/**
 * Reviewed non-cascading references directly attached to an erasure root.
 * CASCADE and SET NULL references remain visible in the live schema hash; a new
 * NO ACTION/RESTRICT reference is blocked until it is added here deliberately.
 */
export const ADMIN_ERASURE_RESTRICT_RULES: readonly ErasureDependencyRule[] = [
  {
    table: 'academic_period_grade_revisions',
    column: 'class_id',
    targetTable: 'classes',
    targetTypes: ['CLASS', 'SECTION'],
    action: 'DELETE',
    selector: 'CLASS_DESCENDANT',
    group: 'academicEvidence',
  },
  userStudentRule('academic_annual_source_selections'),
  userAuthorRule('academic_annual_source_selections', 'selected_by'),
  userAuthorRule('academic_back_subject_events', 'actor_id'),
  userStudentRule('academic_back_subjects'),
  userStudentRule('academic_external_period_grades'),
  userAuthorRule('academic_external_period_grades', 'recorded_by'),
  userStudentRule('academic_legacy_grade_evidence'),
  userStudentRule('academic_period_grade_revisions'),
  userAuthorRule('academic_remediation_results', 'recorded_by'),
  userAuthorRule('academic_reminder_runs', 'created_by'),
  userStudentRule('academic_student_completions'),
  userAuthorRule('academic_student_completions', 'recorded_by'),
  userStudentRule('academic_student_year_outcomes'),
  userAuthorRule('academic_student_year_outcomes', 'recorded_by'),
  userStudentRule('class_record_participants', 'student_id', 'classRecords'),
  userStudentRule('subject_annual_grades'),
  // Institutional content remains attached to the school and is reassigned to
  // the executing administrator before the account row is erased.
  userAuthorRule('announcements', 'author_id'),
  userAuthorRule('assessment_editor_receipts', 'actor_id'),
  userAuthorRule('class_templates', 'created_by'),
  userAuthorRule('system_evaluation_campaigns', 'created_by'),
  userAuthorRule('uploaded_files', 'teacher_id'),
] as const;

const acceptedDeleteActions = new Set(['CASCADE', 'SET NULL']);

export function findUnclassifiedErasureReferences(
  references: readonly ErasureForeignKeyReference[],
) {
  return references.filter((reference) => {
    if (acceptedDeleteActions.has(reference.onDelete.toUpperCase())) {
      return false;
    }
    return !ADMIN_ERASURE_RESTRICT_RULES.some(
      (rule) =>
        rule.table === reference.table &&
        rule.column === reference.column &&
        rule.targetTable === reference.targetTable,
    );
  });
}

export function normalizeErasureTargetIds(targetIds: readonly string[]) {
  const normalized = [...targetIds].sort();
  if (new Set(normalized).size !== normalized.length) {
    throw new BadRequestException({
      code: 'INVALID_ERASURE_REQUEST',
      message: 'Duplicate erasure target IDs are not allowed.',
    });
  }
  return normalized;
}

export function requiredErasureConfirmation(
  targetType: PurgeTargetType,
  count: number,
) {
  const noun =
    count === 1
      ? targetType
      : targetType === 'CLASS'
        ? 'CLASSES'
        : `${targetType}S`;
  return `ERASE ${count} ${noun}`;
}
