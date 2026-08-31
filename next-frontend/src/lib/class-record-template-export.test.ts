import { modernPolicy, openCapabilities } from '@/test/academic-fixtures';
import type {
  ClassRecord,
  SpreadsheetData,
  SpreadsheetStudentRow,
} from '@/types/class-record';
import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import {
  buildTemplateWrites,
  exportClassRecordTemplateWorkbook,
} from './class-record-template-export';

function createStudent(
  overrides: Partial<SpreadsheetStudentRow> = {},
): SpreadsheetStudentRow {
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
    policy: modernPolicy,
    academicCapabilities: openCapabilities,
    canReopen: false,
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
  it('maps header values to the INPUT DATA cells used by the MAPEH workbook formulas', () => {
    const spreadsheet = createSpreadsheet([
      createStudent({
        studentId: 'male-1',
        firstName: 'Ben',
        lastName: 'Lopez',
        gender: 'male',
      }),
      createStudent({
        studentId: 'female-1',
        firstName: 'Ana',
        lastName: 'Santos',
        gender: 'female',
      }),
    ]);
    const { writes, overflowStartRow } = buildTemplateWrites(
      spreadsheet,
      selectedRecord,
    );

    expect(overflowStartRow).toBeNull();
    expect(writes).toContainEqual({
      sheet: 'INPUT DATA',
      row: 4,
      col: 7,
      value: 'NCR',
    });
    expect(writes).toContainEqual({
      sheet: 'INPUT DATA',
      row: 4,
      col: 15,
      value: 'Manila',
    });
    expect(writes).toContainEqual({
      sheet: 'INPUT DATA',
      row: 7,
      col: 1,
      value: 'FIRST QUARTER',
    });
    expect(writes).toContainEqual({
      sheet: 'INPUT DATA',
      row: 7,
      col: 11,
      value: 'GRADE 7 - Sampaguita',
    });
    expect(writes).toContainEqual({
      sheet: 'MUSIC _Q1',
      row: 8,
      col: 6,
      value: 'WRITTEN WORKS (30%)',
    });
    expect(writes).toContainEqual({
      sheet: 'MUSIC _Q1',
      row: 8,
      col: 19,
      value: 'PERFORMANCE TASKS (50%)',
    });
  });

  it('writes learners into fixed male and female template rows and keeps formulas intact', () => {
    const spreadsheet = createSpreadsheet([
      createStudent({
        studentId: 'male-1',
        firstName: 'Ben',
        lastName: 'Lopez',
        gender: 'male',
      }),
      createStudent({
        studentId: 'female-1',
        firstName: 'Ana',
        lastName: 'Santos',
        gender: 'female',
      }),
    ]);
    const { writes } = buildTemplateWrites(spreadsheet, selectedRecord);

    expect(writes).toContainEqual({
      sheet: 'INPUT DATA',
      row: 12,
      col: 2,
      value: 'Lopez, Ben',
    });
    expect(writes).toContainEqual({
      sheet: 'INPUT DATA',
      row: 63,
      col: 2,
      value: 'Santos, Ana',
    });
    expect(writes).toContainEqual({
      sheet: 'MUSIC _Q1',
      row: 12,
      col: 6,
      value: 18,
    });
    expect(writes).toContainEqual({
      sheet: 'MUSIC _Q1',
      row: 12,
      col: 19,
      value: 25,
    });
    expect(writes).toContainEqual({
      sheet: 'MUSIC _Q1',
      row: 12,
      col: 32,
      value: 40,
    });
    expect(writes).toContainEqual({
      sheet: 'MUSIC _Q1',
      row: 63,
      col: 6,
      value: 18,
    });
    expect(writes).not.toContainEqual({
      sheet: 'MUSIC _Q1',
      row: 12,
      col: 16,
      value: 18,
    });
    expect(writes).not.toContainEqual({
      sheet: 'MUSIC _Q1',
      row: 12,
      col: 35,
      value: 84.67,
    });
  });

  it('selects the matching MAPEH component sheet from the subject text', () => {
    const spreadsheet = createSpreadsheet([
      createStudent({
        studentId: 'female-1',
        firstName: 'Ana',
        lastName: 'Santos',
        gender: 'female',
      }),
    ]);
    spreadsheet.header.subject = 'Health';

    const { writes } = buildTemplateWrites(spreadsheet, selectedRecord);

    expect(writes).toContainEqual({
      sheet: 'HEALTH _Q1',
      row: 63,
      col: 6,
      value: 18,
    });
    expect(writes).toContainEqual({
      sheet: 'INPUT DATA',
      row: 63,
      col: 2,
      value: 'Santos, Ana',
    });
  });

  it('marks overflow when fixed male or female slots are exceeded', () => {
    const students = Array.from({ length: 51 }, (_, idx) =>
      createStudent({
        studentId: `student-${idx + 1}`,
        firstName: `First${idx + 1}`,
        lastName: `Last${idx + 1}`,
        gender: 'male',
      }),
    );
    const spreadsheet = createSpreadsheet(students);
    const { overflowStartRow } = buildTemplateWrites(
      spreadsheet,
      selectedRecord,
    );

    expect(overflowStartRow).toBe(113);
  });
});

describe('exportClassRecordTemplateWorkbook', () => {
  it('patches the real MAPEH workbook template without dropping formulas or media', async () => {
    const template = await fs.readFile(
      path.join(process.cwd(), 'public/templates/Master.xlsx'),
    );
    let exportedBlob: Blob | null = null;
    const anchor = document.createElement('a');
    const clickSpy = jest.spyOn(anchor, 'click').mockImplementation();
    const createElementSpy = jest
      .spyOn(document, 'createElement')
      .mockReturnValue(anchor);
    const originalCreateObjectUrl = URL.createObjectURL;
    const originalRevokeObjectUrl = URL.revokeObjectURL;
    const originalFetch = global.fetch;
    const templateArrayBuffer = new Uint8Array(template).buffer;
    URL.createObjectURL = jest.fn((blob) => {
      exportedBlob = blob as Blob;
      return 'blob:class-record';
    });
    URL.revokeObjectURL = jest.fn();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => templateArrayBuffer,
    } as Response);

    await exportClassRecordTemplateWorkbook(
      createSpreadsheet([
        createStudent({
          studentId: 'male-1',
          firstName: 'Ben',
          lastName: 'Lopez',
          gender: 'male',
        }),
      ]),
      selectedRecord,
    );

    expect(clickSpy).toHaveBeenCalled();
    expect(exportedBlob).not.toBeNull();
    const exportedArrayBuffer = await new Promise<ArrayBuffer>(
      (resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(exportedBlob!);
      },
    );
    const outputZip = await JSZip.loadAsync(exportedArrayBuffer);
    const inputXml = await outputZip
      .file('xl/worksheets/sheet1.xml')
      ?.async('string');
    const musicXml = await outputZip
      .file('xl/worksheets/sheet2.xml')
      ?.async('string');
    const workbookXml = await outputZip
      .file('xl/workbook.xml')
      ?.async('string');
    const workbookRelsXml = await outputZip
      .file('xl/_rels/workbook.xml.rels')
      ?.async('string');
    const contentTypesXml = await outputZip
      .file('[Content_Types].xml')
      ?.async('string');
    const mediaFiles = Object.keys(outputZip.files).filter((file) =>
      file.startsWith('xl/media/'),
    );

    expect(inputXml).toContain('r="B12"');
    expect(inputXml).toContain('Lopez, Ben');
    expect(musicXml).toContain('r="F12"');
    expect(musicXml).toContain('<v>18</v>');
    expect(musicXml).toContain('IF(COUNT($F12:$O12)=0');
    expect(musicXml).toContain("'Masterlist'!G4");
    expect(musicXml).not.toContain('view="pageBreakPreview"');
    expect((musicXml?.match(/<f/g) || []).length).toBeGreaterThan(100);
    expect(workbookXml).toContain('name="Masterlist"');
    expect(workbookXml).toContain('name="Grades"');
    expect(workbookXml).toContain('name="ARTS_Q1"');
    expect(workbookXml).toContain('state="veryHidden"');
    expect(workbookXml).toContain('fullCalcOnLoad="1"');
    expect(outputZip.file('xl/calcChain.xml')).toBeNull();
    expect(workbookRelsXml).not.toContain('calcChain');
    expect(contentTypesXml).not.toContain('/xl/calcChain.xml');
    expect(mediaFiles.length).toBeGreaterThan(0);

    global.fetch = originalFetch;
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
    createElementSpy.mockRestore();
    clickSpy.mockRestore();
  }, 30000);
});
