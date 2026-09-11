export type AdminDemoModeRelaxedRuleCode =
  | 'user_lifecycle_sequence'
  | 'class_membership_window'
  | 'section_membership_window'
  | 'section_capacity'
  | 'schedule_collision'
  | 'room_adviser_exclusivity'
  | 'archive_active_memberships'
  | 'restore_archived_class'
  | 'admin_academic_window'
  | 'governed_execution_availability';

export type AdminDemoModeProtectedRuleCode =
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

export interface AdminDemoModeRule<Code extends string = string> {
  readonly code: Code;
  readonly label: string;
  readonly description: string;
}

const defineRule = <Code extends string>(
  code: Code,
  label: string,
  description: string,
): Readonly<AdminDemoModeRule<Code>> =>
  Object.freeze({ code, label, description });

export const ADMIN_DEMO_MODE_RELAXED_RULES: ReadonlyArray<
  Readonly<AdminDemoModeRule<AdminDemoModeRelaxedRuleCode>>
> = Object.freeze([
  defineRule(
    'user_lifecycle_sequence',
    'User lifecycle sequence',
    'Archive or restore a non-self account without the normal status sequence.',
  ),
  defineRule(
    'class_membership_window',
    'Class membership window',
    'Manage memberships on otherwise valid inactive or historical classes.',
  ),
  defineRule(
    'section_membership_window',
    'Section membership window',
    'Manage memberships on otherwise valid inactive or historical sections.',
  ),
  defineRule(
    'section_capacity',
    'Section capacity',
    'Overbook a section or lower capacity below its current headcount.',
  ),
  defineRule(
    'schedule_collision',
    'Schedule collision',
    'Save otherwise valid overlapping presentation schedules.',
  ),
  defineRule(
    'room_adviser_exclusivity',
    'Room and adviser exclusivity',
    'Reuse an otherwise valid room or adviser during presentation setup.',
  ),
  defineRule(
    'archive_active_memberships',
    'Archive active memberships',
    'Archive through existing completion transactions while memberships are active.',
  ),
  defineRule(
    'restore_archived_class',
    'Restore archived class',
    'Restore an archived class shell without recreating completed memberships.',
  ),
  defineRule(
    'admin_academic_window',
    'Administrator academic window',
    'Let administrators work outside the active year or grading period.',
  ),
  defineRule(
    'governed_execution_availability',
    'Governed execution availability',
    'Allow reviewed lifecycle execution while its separate availability flag is off.',
  ),
]);

export const ADMIN_DEMO_MODE_PROTECTED_RULES: ReadonlyArray<
  Readonly<AdminDemoModeRule<AdminDemoModeProtectedRuleCode>>
> = Object.freeze([
  defineRule(
    'authentication_and_rbac',
    'Authentication and roles',
    'Every request still requires valid authentication and administrator authorization.',
  ),
  defineRule(
    'self_account_protection',
    'Self-account protection',
    'Administrators cannot destructively change their own account.',
  ),
  defineRule(
    'dto_and_content_validation',
    'Request validation',
    'Required fields, formats, value ranges, and content validation remain enforced.',
  ),
  defineRule(
    'unique_user_and_academic_identity',
    'Unique identities',
    'User and academic identity uniqueness remains enforced.',
  ),
  defineRule(
    'referential_integrity',
    'Referential integrity',
    'Database relationships and required references remain valid.',
  ),
  defineRule(
    'academic_transaction_lock',
    'Academic transaction lock',
    'Academic mutations still use the established transaction lock.',
  ),
  defineRule(
    'finalized_and_locked_workbooks',
    'Finalized and locked workbooks',
    'Finalized or locked grading evidence cannot be rewritten.',
  ),
  defineRule(
    'attempt_and_returned_grade_history',
    'Attempt and returned-grade history',
    'Assessment attempts and returned grade history remain protected.',
  ),
  defineRule(
    'score_and_percentage_invariants',
    'Score and percentage invariants',
    'Score caps, non-negative values, and percentage rules remain enforced.',
  ),
  defineRule(
    'append_only_lifecycle_and_audit',
    'Lifecycle and audit evidence',
    'Lifecycle history and audit evidence remain append-only.',
  ),
  defineRule(
    'evidence_aware_permanent_deletion',
    'Evidence-aware deletion',
    'Retained academic evidence continues to block permanent deletion.',
  ),
  defineRule(
    'ai_non_authority',
    'AI remains assistive',
    'AI cannot authorize or directly perform official record mutations.',
  ),
]);
