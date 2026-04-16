import type { ClassRecord, SpreadsheetData, SpreadsheetStudentRow } from '@/types/class-record';
import { buildTemplateWrites } from './class-record-template-export';

function createStudent(overrides: Partial<SpreadsheetStudentRow> = {}): SpreadsheetStudentRow {
  return {
    studentId: overrides.studentId || 'student-1',
    firstName: overrides.firstName || 'Ana',
    lastName: overrides.lastName || 'Santos',
    middleName: overrides.middleName ?? null,
    gender: overrides.gender,
    categories: overrides.categories || [
      {
        categoryId: 'cat-written',
        scores: [18],
        total: 18,
        ps: 90,
        ws: 27,
      },
      {
        categoryId: 'cat-performance',
        scores: [25],
        total: 25,
        ps: 83.33,
        ws: 41.67,
      },
      {
        categoryId: 'cat-quarterly',
        scores: [40],
        total: 40,
        ps: 80,
        ws: 16,
      },
    ],
    initialGrade: overrides.initialGrade ?? 84.67,
    quarterlyGrade: overrides.quarterlyGrade ?? 85,
    ...overrides,
  };
}

function createSpreadsheet(students: SpreadsheetStudentRow[]): SpreadsheetData {
  return {
    classRecord: {
      id: 'record-1',
      classId: 'class-1',
      gradingPeriod: 'Q1',
      status: 'draft',
    },
    header: {
      quarter: 'Q1',
      region: 'NCR',
      division: 'Manila',
      district: 'District 1',
      schoolName: 'GABHS',
      schoolYear: '2025-2026',
      teacher: 'Juan Dela Cruz',
      subject: 'Mathematics 7',
      gradeLevel: '7',
      section: 'Sampaguita',
    },
    categories: [
      {
        id: 'cat-written',
        name: 'Written Works',
        weight: 30,
        items: [{ id: 'w1', title: 'WW1', hps: 20, order: 1 }],
      },
      {
        id: 'cat-performance',
        name: 'Performance Tasks',
        weight: 50,
        items: [{ id: 'p1', title: 'PT1', hps: 30, order: 1 }],
      },
      {
        id: 'cat-quarterly',
        name: 'Quarterly Assessment',
        weight: 20,
        items: [{ id: 'q1', title: 'QA1', hps: 50, order: 1 }],
      },
    ],
    students,
  };
}

const selectedRecord: ClassRecord = {
  id: 'record-1',
  classId: 'class-1',
  gradingPeriod: 'Q1',
  status: 'draft',
};

describe('buildTemplateWrites', () => {
  it('maps header and student values to expected INPUT DATA coordinates', () => {
    const spreadsheet = createSpreadsheet([
      createStudent({ studentId: 'male-1', firstName: 'Ben', lastName: 'Lopez', gender: 'male' }),
      createStudent({ studentId: 'female-1', firstName: 'Ana', lastName: 'Santos', gender: 'female' }),
    ]);
    const { writes, overflowStartRow } = buildTemplateWrites(spreadsheet, selectedRecord);

    expect(overflowStartRow).toBeNull();
    expect(writes).toContainEqual({ row: 4, col: 7, value: 'NCR' });
    expect(writes).toContainEqual({ row: 7, col: 1, value: 'FIRST QUARTER' });
    expect(writes).toContainEqual({ row: 8, col: 6, value: 'WRITTEN WORKS (30%)' });
    expect(writes).toContainEqual({ row: 11, col: 2, value: 'MALE' });
    expect(writes).toContainEqual({ row: 12, col: 1, value: 1 });
    expect(writes).toContainEqual({ row: 12, col: 2, value: 'Lopez, Ben' });
    expect(writes).toContainEqual({ row: 13, col: 2, value: 'FEMALE' });
    expect(writes).toContainEqual({ row: 14, col: 1, value: 2 });
    expect(writes).toContainEqual({ row: 14, col: 2, value: 'Santos, Ana' });
  });

  it('marks overflow when row index passes template-designed rows', () => {
    const students = Array.from({ length: 110 }, (_, idx) =>
      createStudent({
        studentId: `student-${idx + 1}`,
        firstName: `First${idx + 1}`,
        lastName: `Last${idx + 1}`,
      }),
    );
    const spreadsheet = createSpreadsheet(students);
    const { overflowStartRow } = buildTemplateWrites(spreadsheet, selectedRecord);

    expect(overflowStartRow).toBe(120);
  });
});

