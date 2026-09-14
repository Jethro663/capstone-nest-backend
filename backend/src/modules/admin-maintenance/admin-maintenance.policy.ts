import type { AdminMaintenanceScopeCode } from '../../drizzle/schema';

export type AdminMaintenanceRuleCode =
  | 'user_lifecycle_sequence'
  | 'class_membership_window'
  | 'section_membership_window'
  | 'section_capacity'
  | 'schedule_collision'
  | 'room_adviser_exclusivity'
  | 'archive_active_memberships'
  | 'restore_archived_class'
  | 'admin_academic_window'
  | 'governed_execution_availability'
  | 'cascade_academic_erasure'
  | 'cascade_account_erasure';

export type AdminMaintenanceProtectedRuleCode =
  | 'authentication_and_rbac'
  | 'self_account_protection'
  | 'dto_and_content_validation'
  | 'unique_user_and_academic_identity'
  | 'referential_integrity'
  | 'academic_transaction_lock'
  | 'finalized_and_locked_workbooks'
  | 'attempt_and_returned_grade_history'
  | 'score_and_percentage_invariants'
  | 'append_only_lifecycle_and_audit'
  | 'evidence_aware_permanent_deletion'
  | 'ai_non_authority';

export interface AdminMaintenanceRule<Code extends string = string> {
  readonly code: Code;
  readonly label: string;
  readonly description: string;
}

const defineRule = <Code extends string>(
  code: Code,
  label: string,
  description: string,
): Readonly<AdminMaintenanceRule<Code>> =>
  Object.freeze({ code, label, description });

export const ADMIN_MAINTENANCE_SCOPES: readonly AdminMaintenanceScopeCode[] =
  Object.freeze(['ACADEMIC_STRUCTURE', 'ROSTER', 'ACCOUNT_LIFECYCLE']);

export const ADMIN_MAINTENANCE_RULE_SCOPE: Readonly<
  Record<AdminMaintenanceRuleCode, AdminMaintenanceScopeCode>
> = Object.freeze({
  user_lifecycle_sequence: 'ACCOUNT_LIFECYCLE',
  class_membership_window: 'ROSTER',
  section_membership_window: 'ROSTER',
  section_capacity: 'ACADEMIC_STRUCTURE',
  schedule_collision: 'ACADEMIC_STRUCTURE',
  room_adviser_exclusivity: 'ACADEMIC_STRUCTURE',
  archive_active_memberships: 'ACADEMIC_STRUCTURE',
  restore_archived_class: 'ACADEMIC_STRUCTURE',
  admin_academic_window: 'ACADEMIC_STRUCTURE',
  governed_execution_availability: 'ACADEMIC_STRUCTURE',
  cascade_academic_erasure: 'ACADEMIC_STRUCTURE',
  cascade_account_erasure: 'ACCOUNT_LIFECYCLE',
});

export const ADMIN_MAINTENANCE_RULES: ReadonlyArray<
  Readonly<AdminMaintenanceRule<AdminMaintenanceRuleCode>>
> = Object.freeze([
  defineRule(
    'user_lifecycle_sequence',
    'Account lifecycle sequence',
    'Correct the archive or restore sequence for another account.',
  ),
  defineRule(
    'class_membership_window',
    'Class membership window',
    'Maintain a valid membership on an inactive or historical class.',
  ),
  defineRule(
    'section_membership_window',
    'Section membership window',
    'Maintain a valid membership on an inactive or historical section.',
  ),
  defineRule(
    'section_capacity',
    'Section capacity warning',
    'Overbook a section or lower capacity below its current headcount.',
  ),
  defineRule(
    'schedule_collision',
    'Schedule collision warning',
    'Save an otherwise valid overlapping schedule after review.',
  ),
  defineRule(
    'room_adviser_exclusivity',
    'Room and adviser warning',
    'Reuse an otherwise valid room or adviser after review.',
  ),
  defineRule(
    'archive_active_memberships',
    'Active membership reconciliation',
    'Archive through the established membership completion transaction.',
  ),
  defineRule(
    'restore_archived_class',
    'Archived class restoration',
    'Restore a class shell without recreating prior memberships.',
  ),
  defineRule(
    'admin_academic_window',
    'Academic window warning',
    'Perform an administrator correction outside the current window.',
  ),
  defineRule(
    'governed_execution_availability',
    'Governed execution availability',
    'Use the reviewed lifecycle executor during Maintenance Access.',
  ),
  defineRule(
    'cascade_academic_erasure',
    'Academic cascade erasure',
    'Permanently erase a reviewed archived class or section and its listed descendants.',
  ),
  defineRule(
    'cascade_account_erasure',
    'Account cascade erasure',
    'Permanently erase a reviewed deleted account and its identity-owned evidence.',
  ),
]);

export const ADMIN_MAINTENANCE_PROTECTED_RULES: ReadonlyArray<
  Readonly<AdminMaintenanceRule<AdminMaintenanceProtectedRuleCode>>
> = Object.freeze([
  defineRule(
    'authentication_and_rbac',
    'Authentication and roles',
    'Valid authentication and Admin authorization are always required.',
  ),
  defineRule(
    'self_account_protection',
    'Self-account protection',
    'Administrators cannot destructively alter their own account.',
  ),
  defineRule(
    'dto_and_content_validation',
    'Request validation',
    'Required fields, formats, ranges, and content validation remain enforced.',
  ),
  defineRule(
    'unique_user_and_academic_identity',
    'Unique identities',
    'User and academic identity uniqueness remains enforced.',
  ),
  defineRule(
    'referential_integrity',
    'Referential integrity',
    'Required database relationships remain valid.',
  ),
  defineRule(
    'academic_transaction_lock',
    'Academic transaction lock',
    'Academic mutations retain transaction serialization.',
  ),
  defineRule(
    'finalized_and_locked_workbooks',
    'Finalized and locked workbooks',
    'Finalized or locked grading evidence cannot be rewritten during routine maintenance.',
  ),
  defineRule(
    'attempt_and_returned_grade_history',
    'Attempt and grade history',
    'Submitted attempts and returned grade evidence remain protected.',
  ),
  defineRule(
    'score_and_percentage_invariants',
    'Score invariants',
    'Score caps, non-negative values, and percentage rules remain enforced.',
  ),
  defineRule(
    'append_only_lifecycle_and_audit',
    'Lifecycle and audit evidence',
    'Lifecycle, reset, repair, and audit evidence remains append-only.',
  ),
  defineRule(
    'evidence_aware_permanent_deletion',
    'Evidence-aware deletion',
    'Retained official evidence continues to block ordinary permanent deletion.',
  ),
  defineRule(
    'ai_non_authority',
    'AI remains assistive',
    'AI cannot authorize or directly perform official record mutations.',
  ),
]);
