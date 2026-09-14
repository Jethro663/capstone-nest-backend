import {
  ADMIN_ERASURE_CATALOG_VERSION,
  ADMIN_ERASURE_RESTRICT_RULES,
  findUnclassifiedErasureReferences,
  normalizeErasureTargetIds,
  requiredErasureConfirmation,
} from './admin-erasure.catalog';

describe('admin erasure dependency catalog', () => {
  it('has a versioned reviewed rule for every current restrictive root reference', () => {
    expect(ADMIN_ERASURE_CATALOG_VERSION).toBeGreaterThan(0);
    expect(ADMIN_ERASURE_RESTRICT_RULES).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'academic_period_grade_revisions',
          column: 'class_id',
          targetTable: 'classes',
          action: 'DELETE',
        }),
        expect.objectContaining({
          table: 'academic_legacy_grade_evidence',
          column: 'class_record_id',
          targetTable: 'class_records',
          action: 'DELETE',
          selector: 'CLASS_RECORD_DESCENDANT',
        }),
        expect.objectContaining({
          table: 'academic_period_grade_revisions',
          column: 'class_record_id',
          targetTable: 'class_records',
          action: 'DELETE',
          selector: 'CLASS_RECORD_DESCENDANT',
        }),
        expect.objectContaining({
          table: 'class_record_participants',
          column: 'class_record_id',
          targetTable: 'class_records',
          action: 'DELETE',
          selector: 'CLASS_RECORD_DESCENDANT',
        }),
        expect.objectContaining({
          table: 'announcements',
          column: 'author_id',
          targetTable: 'users',
          action: 'DETACH',
        }),
        expect.objectContaining({
          table: 'academic_annual_source_selections',
          column: 'selected_by',
          targetTable: 'users',
          action: 'DETACH',
        }),
        expect.objectContaining({
          table: 'academic_annual_source_selections',
          column: 'student_id',
          targetTable: 'users',
          action: 'DELETE',
        }),
      ]),
    );
  });

  it('fails closed for a new restrictive relationship but accepts cascade and set-null references', () => {
    expect(
      findUnclassifiedErasureReferences([
        {
          table: 'new_official_evidence',
          column: 'class_id',
          targetTable: 'classes',
          onDelete: 'NO ACTION',
        },
        {
          table: 'new_cascade_child',
          column: 'class_id',
          targetTable: 'classes',
          onDelete: 'CASCADE',
        },
        {
          table: 'new_audit_link',
          column: 'actor_id',
          targetTable: 'users',
          onDelete: 'SET NULL',
        },
      ]),
    ).toEqual([expect.objectContaining({ table: 'new_official_evidence' })]);
  });

  it('normalizes target order without silently accepting duplicates', () => {
    expect(
      normalizeErasureTargetIds([
        '00000000-0000-4000-8000-000000000002',
        '00000000-0000-4000-8000-000000000001',
      ]),
    ).toEqual([
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000002',
    ]);
    expect(() =>
      normalizeErasureTargetIds([
        '00000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000001',
      ]),
    ).toThrow('Duplicate erasure target');
  });

  it('builds one exact batch confirmation', () => {
    expect(requiredErasureConfirmation('CLASS', 33)).toBe('ERASE 33 CLASSES');
    expect(requiredErasureConfirmation('USER', 1)).toBe('ERASE 1 USER');
  });
});
