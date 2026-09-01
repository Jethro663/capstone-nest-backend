import { filterTeacherAssessments } from '../teacher-assessments/model';

const records = [
  {
    id: 'q4-draft',
    classId: 'math',
    title: 'Quarter Four Fractions',
    type: 'quiz',
    quarter: 'Q4',
    isPublished: false,
    classLabel: 'MATH · Mathematics',
    academicCapabilities: {
      schoolYear: '2026-2027',
      activeSchoolYear: '2026-2027',
      canPrepare: true,
    },
  },
  {
    id: 'unassigned',
    classId: 'math',
    title: 'Unassigned Fractions',
    type: 'quiz',
    isPublished: false,
    classLabel: 'MATH · Mathematics',
  },
  {
    id: 'q4-published',
    classId: 'science',
    title: 'Quarter Four Science',
    type: 'quiz',
    quarter: 'Q4',
    isPublished: true,
    classLabel: 'SCI · Science',
    academicCapabilities: {
      schoolYear: '2026-2027',
      activeSchoolYear: '2026-2027',
      canPrepare: true,
    },
  },
];

describe('mobile teacher assessment filters', () => {
  it('keeps unassigned assessments only under All Quarters', () => {
    expect(
      filterTeacherAssessments(records, {
        period: 'all',
        status: 'all',
        classId: 'all',
        search: '',
      }).map((record) => record.id),
    ).toContain('unassigned');
    expect(
      filterTeacherAssessments(records, {
        period: 'Q4',
        status: 'all',
        classId: 'all',
        search: '',
      }).map((record) => record.id),
    ).not.toContain('unassigned');
  });

  it('combines period, status, class, and search with AND logic', () => {
    expect(
      filterTeacherAssessments(records, {
        period: 'Q4',
        status: 'published',
        classId: 'science',
        search: 'science',
      }).map((record) => record.id),
    ).toEqual(['q4-published']);
  });
});
