import {
  ADMIN_MAINTENANCE_PROTECTED_RULES,
  ADMIN_MAINTENANCE_RULE_SCOPE,
  ADMIN_MAINTENANCE_RULES,
} from './admin-maintenance.policy';

describe('admin maintenance policy', () => {
  it('grants explicit academic and account cascade-erasure rules', () => {
    expect(ADMIN_MAINTENANCE_RULE_SCOPE).toEqual(
      expect.objectContaining({
        cascade_academic_erasure: 'ACADEMIC_STRUCTURE',
        cascade_account_erasure: 'ACCOUNT_LIFECYCLE',
      }),
    );
    expect(ADMIN_MAINTENANCE_RULES.map((rule) => rule.code)).toEqual(
      expect.arrayContaining([
        'cascade_academic_erasure',
        'cascade_account_erasure',
      ]),
    );
  });

  it('keeps evidence-aware ordinary deletion protected', () => {
    expect(ADMIN_MAINTENANCE_PROTECTED_RULES).toContainEqual(
      expect.objectContaining({
        code: 'evidence_aware_permanent_deletion',
      }),
    );
  });
});
