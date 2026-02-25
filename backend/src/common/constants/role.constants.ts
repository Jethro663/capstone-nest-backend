/**
 * Canonical role name constants shared across the entire backend.
 *
 * Using this enum instead of bare string literals in @Roles() decorators
 * ensures compile-time safety — a typo like RoleName.Adimn will fail at
 * build time rather than silently allowing or denying access at runtime.
 *
 * These values MUST match the names seeded into the `roles` table.
 */
export enum RoleName {
  Admin = 'admin',
  Teacher = 'teacher',
  Student = 'student',
}
