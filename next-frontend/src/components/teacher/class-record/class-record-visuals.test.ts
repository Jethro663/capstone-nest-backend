import type {
  SpreadsheetCategory,
  SpreadsheetStudentRow,
} from '@/types/class-record';
import {
  filterClassRecordStudents,
  getCategoryTone,
  getSurnameBand,
  getSurnameInitial,
} from './class-record-visuals';

const categories: SpreadsheetCategory[] = [
  {
    id: 'written',
    name: 'Written Works',
    weight: 35,
    items: [{ id: 'ww-1', title: 'WW 1', hps: 20, order: 1 }],
  },
  {
    id: 'performance',
    name: 'Performance Tasks',
    weight: 35,
    items: [{ id: 'pt-1', title: 'PT 1', hps: 40, order: 1 }],
  },
  {
    id: 'exam',
    name: 'Quarterly Assessment',
    weight: 30,
    items: [{ id: 'qa-1', title: 'Exam', hps: 50, order: 1 }],
  },
];

function student(
  overrides: Partial<SpreadsheetStudentRow>,
): SpreadsheetStudentRow {
  return {
    studentId: overrides.studentId ?? 'student',
    firstName: overrides.firstName ?? 'Ana',
    lastName: overrides.lastName ?? 'Santos',
    lrn: overrides.lrn,
    eligibility: overrides.eligibility ?? 'eligible',
    categories:
      overrides.categories ??
      categories.map((category) => ({
        categoryId: category.id,
        scores: [10],
        scoreStatuses: ['recorded'],
        scoreReasons: [null],
        total: 10,
        ps: 50,
        ws: 17.5,
      })),
    initialGrade: overrides.initialGrade ?? 80,
    quarterlyGrade: overrides.quarterlyGrade ?? 82,
    remarks: overrides.remarks ?? 'Passed',
  };
}

describe('class-record visual helpers', () => {
  it.each([
    ['Abad', 'af'],
    ['Garcia', 'gl'],
    ['Ñunez', 'mr'],
    ['Santos', 'sz'],
    ['', 'other'],
    ['123', 'other'],
    ['123 Santos', 'other'],
  ] as const)('assigns %s to the %s surname band', (surname, band) => {
    expect(getSurnameBand(surname)).toBe(band);
  });

  it('keeps the normalized surname initial visible', () => {
    expect(getSurnameInitial('  Ésguerra')).toBe('E');
    expect(getSurnameInitial('123')).toBe('#');
  });

  it.each([
    ['Written Works', 'written'],
    ['Performance Tasks', 'performance'],
    ['Quarterly Assessment', 'exam'],
    ['Examination', 'exam'],
    ['Teacher adjustment', 'computed'],
  ] as const)('maps %s to the %s category tone', (name, tone) => {
    expect(getCategoryTone(name)).toBe(tone);
  });

  it('searches names in either order and matches the learner LRN', () => {
    const rows = [
      student({ studentId: 'ana', firstName: 'Ana', lastName: 'Santos', lrn: '1001' }),
      student({ studentId: 'ben', firstName: 'Ben', lastName: 'Reyes', lrn: '1002' }),
    ];

    expect(filterClassRecordStudents(rows, categories, 'santos ana', 'all')).toHaveLength(1);
    expect(filterClassRecordStudents(rows, categories, '1002', 'all')[0]?.studentId).toBe('ben');
  });

  it('filters each evidence state without treating a recorded zero as missing', () => {
    const rows = [
      student({
        studentId: 'zero',
        categories: categories.map((category) => ({
            categoryId: category.id,
            scores: [0],
            scoreStatuses: ['recorded'],
            scoreReasons: [null],
            total: 0,
            ps: 0,
            ws: 0,
          })),
      }),
      student({
        studentId: 'missing',
        categories: categories.map((category, index) => ({
            categoryId: category.id,
            scores: [index === 0 ? null : 10],
            scoreStatuses: [index === 0 ? 'missing' : 'recorded'],
            scoreReasons: [null],
            total: index === 0 ? null : 10,
            ps: index === 0 ? null : 50,
            ws: index === 0 ? null : 17.5,
          })),
        initialGrade: null,
        quarterlyGrade: null,
        remarks: 'Incomplete',
      }),
      student({
        studentId: 'excused',
        categories: categories.map((category, index) => ({
          categoryId: category.id,
          scores: [index === 0 ? null : 10],
          scoreStatuses: [index === 0 ? 'excused' : 'recorded'],
          scoreReasons: [index === 0 ? 'Medical evidence' : null],
          total: index === 0 ? null : 10,
          ps: index === 0 ? null : 50,
          ws: index === 0 ? null : 17.5,
        })),
      }),
      student({ studentId: 'eligibility', eligibility: 'transferred' }),
      student({ studentId: 'intervention', remarks: 'For Intervention' }),
    ];

    expect(filterClassRecordStudents(rows, categories, '', 'missing').map((row) => row.studentId)).toEqual(['missing']);
    expect(filterClassRecordStudents(rows, categories, '', 'excused').map((row) => row.studentId)).toEqual(['excused']);
    expect(filterClassRecordStudents(rows, categories, '', 'eligibility').map((row) => row.studentId)).toEqual(['eligibility']);
    expect(filterClassRecordStudents(rows, categories, '', 'intervention').map((row) => row.studentId)).toEqual(['intervention']);
    expect(filterClassRecordStudents(rows, categories, '', 'needs_attention').map((row) => row.studentId)).toEqual([
      'missing',
      'eligibility',
      'intervention',
    ]);
  });
});
