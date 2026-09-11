import {
  ADMIN_DEMO_MODE_PROTECTED_RULES,
  ADMIN_DEMO_MODE_RELAXED_RULES,
} from './admin-demo-mode.policy';

describe('admin demo mode policy catalog', () => {
  it('publishes the exact first-release relaxed rule codes', () => {
    expect(ADMIN_DEMO_MODE_RELAXED_RULES.map((rule) => rule.code)).toEqual([
      'user_lifecycle_sequence',
      'class_membership_window',
      'section_membership_window',
      'section_capacity',
      'schedule_collision',
      'room_adviser_exclusivity',
      'archive_active_memberships',
      'restore_archived_class',
      'admin_academic_window',
      'governed_execution_availability',
    ]);
  });

  it('publishes the exact permanent protected rule codes', () => {
    expect(ADMIN_DEMO_MODE_PROTECTED_RULES.map((rule) => rule.code)).toEqual([
      'authentication_and_rbac',
      'self_account_protection',
      'dto_and_content_validation',
      'unique_user_and_academic_identity',
      'referential_integrity',
      'academic_transaction_lock',
      'finalized_and_locked_workbooks',
      'attempt_and_returned_grade_history',
      'score_and_percentage_invariants',
      'append_only_lifecycle_and_audit',
      'evidence_aware_permanent_deletion',
      'ai_non_authority',
    ]);
  });

  it('keeps the relaxed and protected catalogs immutable and disjoint', () => {
    expect(Object.isFrozen(ADMIN_DEMO_MODE_RELAXED_RULES)).toBe(true);
    expect(Object.isFrozen(ADMIN_DEMO_MODE_PROTECTED_RULES)).toBe(true);

    const protectedCodes = new Set(
      ADMIN_DEMO_MODE_PROTECTED_RULES.map((rule) => rule.code),
    );
    expect(
      ADMIN_DEMO_MODE_RELAXED_RULES.filter((rule) =>
        protectedCodes.has(rule.code),
      ),
    ).toEqual([]);
  });
});
