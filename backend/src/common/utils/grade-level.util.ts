/**
 * Shared grade-level constants and normalizer.
 * Import these instead of duplicating the logic across services/DTOs.
 */
export const GRADE_LEVELS = ['7', '8', '9', '10'] as const;
export type GradeLevel = (typeof GRADE_LEVELS)[number];

/**
 * Coerces a loose string into a typed GradeLevel or undefined.
 * Accepts '7' | '8' | '9' | '10'; anything else returns undefined.
 */
export function normalizeGradeLevel(v?: string): GradeLevel | undefined {
  if (!v) return undefined;
  const s = String(v).trim() as GradeLevel;
  return GRADE_LEVELS.includes(s) ? s : undefined;
}
