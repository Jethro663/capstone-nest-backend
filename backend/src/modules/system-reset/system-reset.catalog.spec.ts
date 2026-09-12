import { getTableName, is, Table } from 'drizzle-orm';
import * as schema from '../../drizzle/schema';
import {
  assertResetCatalog,
  RESET_CATALOG,
  resetTargetPolicy,
} from './system-reset.catalog';
import { getDefaultAcademicPolicy } from '../academic-state/academic-policy';

describe('system reset preservation contract', () => {
  it('classifies every schema table and migration ledger explicitly', () => {
    const names = Object.values(schema)
      .filter((value) => is(value, Table))
      .map(getTableName);
    expect(() =>
      assertResetCatalog([...names, '_applied_migrations']),
    ).not.toThrow();
    expect(Object.keys(RESET_CATALOG).sort()).toEqual(
      [...names, '_applied_migrations'].sort(),
    );
  });

  it.each([
    'roles',
    'app_versions',
    '_applied_migrations',
    'academic_year_policies',
    'transmutation_tables',
    'audit_logs',
    'admin_lifecycle_operations',
    'enrollment_lifecycle_events',
    'grade_score_repair_evidence',
    'system_reset_evidence',
  ])('keeps essential %s records', (name) => {
    expect(RESET_CATALOG[name].action).toBe('preserve');
  });

  it('archives restrictive legacy evidence without relaxing normal deletion safeguards', () => {
    expect(RESET_CATALOG.academic_legacy_grade_evidence.action).toBe('archive');
  });

  it.each([
    'content_chunks',
    'content_chunk_embeddings',
    'ai_generation_jobs',
    'extracted_modules',
    'uploaded_files',
    'class_records',
    'assessment_attempts',
    'refresh_tokens',
    'otp_verifications',
  ])('clears %s, even when created by the retained admin', (name) => {
    expect(RESET_CATALOG[name].action).toBe('clear');
  });

  it('blocks a newly added or missing table rather than silently leaving content or cascading', () => {
    const names = Object.keys(RESET_CATALOG);
    expect(() => assertResetCatalog([...names, 'new_student_data'])).toThrow(
      'new_student_data',
    );
    expect(() =>
      assertResetCatalog(names.filter((name) => name !== 'roles')),
    ).toThrow('roles');
  });

  it('preserves existing target-year policy instead of replacing custom settings', () => {
    const existing = {
      ...getDefaultAcademicPolicy('2026-2027'),
      passingGrade: 80,
    };
    expect(resetTargetPolicy('2026-2027', 'Q2', existing)).toEqual(existing);
    expect(existing.passingGrade).toBe(80);
  });

  it('rejects a non-consecutive year, mismatched policy, or period absent from policy', () => {
    expect(() => resetTargetPolicy('2026-2028', 'Q1')).toThrow();
    expect(() =>
      resetTargetPolicy(
        '2026-2027',
        'Q1',
        getDefaultAcademicPolicy('2025-2026'),
      ),
    ).toThrow();
    const existing = {
      ...getDefaultAcademicPolicy('2026-2027'),
      periods: [{ key: 'Q1' as const, label: 'Term 1' }],
    };
    expect(() => resetTargetPolicy('2026-2027', 'Q2', existing)).toThrow();
    expect(
      resetTargetPolicy('2026-2027', 'Q1', existing).periods[0].label,
    ).toBe('Term 1');
  });
});
