export type TeacherAssessmentStatusFilter =
  | 'all'
  | 'published'
  | 'draft'
  | 'attention'
  | 'history';

export interface TeacherAssessmentFilterInput {
  period: 'all' | 'Q1' | 'Q2' | 'Q3' | 'Q4';
  status: TeacherAssessmentStatusFilter;
  classId: 'all' | string;
  search: string;
}

type FilterableAssessment = {
  id: string;
  classId: string;
  title: string;
  type: string;
  quarter?: string | null;
  isPublished: boolean;
  classLabel: string;
  academicCapabilities?: {
    schoolYear?: string | null;
    activeSchoolYear?: string | null;
    canPrepare?: boolean;
  } | null;
};

export function filterTeacherAssessments<T extends FilterableAssessment>(
  records: T[],
  filters: TeacherAssessmentFilterInput,
): T[] {
  const needle = filters.search.trim().toLowerCase();
  return records.filter((assessment) => {
    if (filters.period !== 'all' && assessment.quarter !== filters.period)
      return false;
    if (filters.classId !== 'all' && assessment.classId !== filters.classId)
      return false;
    const historical =
      assessment.academicCapabilities?.schoolYear !== undefined &&
      assessment.academicCapabilities.schoolYear !==
        assessment.academicCapabilities.activeSchoolYear;
    if (filters.status === 'published' && !assessment.isPublished) return false;
    if (filters.status === 'draft' && (assessment.isPublished || historical))
      return false;
    if (filters.status === 'history' && !historical) return false;
    if (
      filters.status === 'attention' &&
      (historical || assessment.academicCapabilities?.canPrepare)
    )
      return false;
    if (
      needle &&
      !`${assessment.title} ${assessment.classLabel} ${assessment.type}`
        .toLowerCase()
        .includes(needle)
    )
      return false;
    return true;
  });
}
