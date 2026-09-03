import type {
  SpreadsheetCategory,
  SpreadsheetStudentRow,
} from '@/types/class-record';

export const CLASS_RECORD_DENSITY_STORAGE_KEY =
  'nexora:class-record-density:v1';

export type ClassRecordDensity = 'comfortable' | 'compact';
export type ClassRecordFilter =
  | 'all'
  | 'needs_attention'
  | 'missing'
  | 'excused'
  | 'eligibility'
  | 'intervention';
export type CategoryTone = 'written' | 'performance' | 'exam' | 'computed';
export type SurnameBand = 'af' | 'gl' | 'mr' | 'sz' | 'other';

function normalizeText(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

export function getSurnameInitial(lastName: string | null | undefined) {
  const initial = normalizeText(lastName).charAt(0);
  return /^[A-Z]$/.test(initial) ? initial : '#';
}

export function getSurnameBand(
  lastName: string | null | undefined,
): SurnameBand {
  const initial = getSurnameInitial(lastName);
  if (initial >= 'A' && initial <= 'F') return 'af';
  if (initial >= 'G' && initial <= 'L') return 'gl';
  if (initial >= 'M' && initial <= 'R') return 'mr';
  if (initial >= 'S' && initial <= 'Z') return 'sz';
  return 'other';
}

export function getCategoryTone(name: string): CategoryTone {
  const normalized = normalizeText(name);
  if (normalized === 'WRITTEN WORKS') return 'written';
  if (normalized === 'PERFORMANCE TASKS') return 'performance';
  if (
    normalized === 'QUARTERLY ASSESSMENT' ||
    normalized === 'EXAMINATION'
  )
    return 'exam';
  return 'computed';
}

function hasMissingScore(
  student: SpreadsheetStudentRow,
  categories: SpreadsheetCategory[],
) {
  if (student.eligibility !== 'eligible') return false;
  return categories.some((category) => {
    const values = student.categories.find(
      (entry) => entry.categoryId === category.id,
    );
    return category.items.some((item, index) => {
      if (!item.hps) return false;
      const status = values?.scoreStatuses?.[index];
      return (
        status === 'missing' ||
        (status !== 'excused' && values?.scores[index] == null)
      );
    });
  });
}

function hasExcusedScore(student: SpreadsheetStudentRow) {
  return student.categories.some((category) =>
    category.scoreStatuses?.some((status) => status === 'excused'),
  );
}

function matchesFilter(
  student: SpreadsheetStudentRow,
  categories: SpreadsheetCategory[],
  filter: ClassRecordFilter,
) {
  const missing = hasMissingScore(student, categories);
  const eligibility = student.eligibility !== 'eligible';
  const intervention = student.remarks === 'For Intervention';
  if (filter === 'missing') return missing;
  if (filter === 'excused') return hasExcusedScore(student);
  if (filter === 'eligibility') return eligibility;
  if (filter === 'intervention') return intervention;
  if (filter === 'needs_attention')
    return missing || eligibility || intervention;
  return true;
}

export function filterClassRecordStudents(
  students: SpreadsheetStudentRow[],
  categories: SpreadsheetCategory[],
  query: string,
  filter: ClassRecordFilter,
) {
  const normalizedQuery = normalizeText(query);
  return students.filter((student) => {
    const haystack = normalizeText(
      [
        student.firstName,
        student.lastName,
        `${student.firstName} ${student.lastName}`,
        `${student.lastName} ${student.firstName}`,
        `${student.lastName}, ${student.firstName}`,
        student.lrn ?? '',
      ].join(' '),
    );
    return (
      (!normalizedQuery || haystack.includes(normalizedQuery)) &&
      matchesFilter(student, categories, filter)
    );
  });
}
