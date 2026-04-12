import ExcelJS from 'exceljs';
import type { ClassRecord, SpreadsheetData, SpreadsheetStudentRow } from '@/types/class-record';

const TEMPLATE_URL = '/templates/Master.xlsx';
const INPUT_DATA_SHEET = 'INPUT DATA';
const TOTAL_COLUMNS = 36;
const DATA_START_ROW = 11;
const DESIGNED_LAST_ROW = 119;

type CellValue = string | number | null;

export interface TemplateWrite {
  row: number;
  col: number;
  value: CellValue;
}

function quarterTitle(quarter: string) {
  const titles: Record<string, string> = {
    Q1: 'FIRST QUARTER',
    Q2: 'SECOND QUARTER',
    Q3: 'THIRD QUARTER',
    Q4: 'FOURTH QUARTER',
  };

  return titles[quarter] ?? quarter;
}

function categoryByName(spreadsheet: SpreadsheetData, token: string) {
  return spreadsheet.categories.find((category) =>
    category.name.toLowerCase().includes(token),
  );
}

function categoryTotalHps(category: SpreadsheetData['categories'][number] | undefined) {
  if (!category) return '';
  return (
    category.totalHps ??
    category.items.reduce((sum, item) => sum + (item.hps || 0), 0)
  );
}

function displayName(student: SpreadsheetStudentRow) {
  const middleInitial = student.middleName ? `, ${student.middleName.charAt(0)}.` : '';
  return `${student.lastName}, ${student.firstName}${middleInitial}`;
}

function groupedStudents(students: SpreadsheetStudentRow[]) {
  return [
    {
      label: 'MALE',
      students: students.filter((student) =>
        ['male', 'm'].includes((student.gender || '').toLowerCase()),
      ),
    },
    {
      label: 'FEMALE',
      students: students.filter((student) =>
        ['female', 'f'].includes((student.gender || '').toLowerCase()),
      ),
    },
    {
      label: 'UNSPECIFIED',
      students: students.filter(
        (student) =>
          !['male', 'm', 'female', 'f'].includes((student.gender || '').toLowerCase()),
      ),
    },
  ].filter((group) => group.students.length > 0);
}

function weightRatio(weight: number | undefined) {
  if (typeof weight !== 'number') return '';
  return Number((weight / 100).toFixed(1));
}

export function buildTemplateWrites(
  spreadsheet: SpreadsheetData,
  selectedRecord: ClassRecord,
): { writes: TemplateWrite[]; overflowStartRow: number | null } {
  const writes: TemplateWrite[] = [];
  const write = (row: number, col: number, value: CellValue) => {
    writes.push({ row, col, value });
  };

  const writtenCategory = categoryByName(spreadsheet, 'written');
  const performanceCategory = categoryByName(spreadsheet, 'performance');
  const quarterlyCategory = categoryByName(spreadsheet, 'quarterly');

  const title = spreadsheet.header.workbookTitle || 'Class Record';
  const subtitle =
    spreadsheet.header.workbookSubtitle || '(Pursuant to DepEd Order 8 series of 2015)';

  write(1, 1, title);
  write(3, 1, subtitle);
  write(4, 7, spreadsheet.header.region || '');
  write(4, 15, spreadsheet.header.division || '');
  write(4, 24, spreadsheet.header.district || '');
  write(5, 7, spreadsheet.header.schoolName || 'Gat Andres Bonifacio High School');
  write(5, 24, spreadsheet.header.schoolId || '');
  write(5, 33, spreadsheet.header.schoolYear || '');
  write(7, 1, quarterTitle(spreadsheet.header.quarter || selectedRecord.gradingPeriod));
  write(
    7,
    11,
    `${spreadsheet.header.gradeLevel ? `GRADE ${spreadsheet.header.gradeLevel}` : ''}${spreadsheet.header.section ? ` - ${spreadsheet.header.section}` : ''}`,
  );
  write(7, 19, spreadsheet.header.teacher || '');
  write(7, 33, spreadsheet.header.subject || '');

  write(
    8,
    6,
    `${(writtenCategory?.name || 'WRITTEN WORKS').toUpperCase()} (${Math.round(writtenCategory?.weight || 0)}%)`,
  );
  write(
    8,
    19,
    `${(performanceCategory?.name || 'PERFORMANCE TASKS').toUpperCase()} (${Math.round(performanceCategory?.weight || 0)}%)`,
  );
  write(
    8,
    32,
    `${(quarterlyCategory?.name || 'QUARTERLY ASSESSMENT').toUpperCase()} (${Math.round(quarterlyCategory?.weight || 0)}%)`,
  );
  write(8, 35, 'Initial');
  write(8, 36, 'Quarterly');

  for (let index = 0; index < 10; index += 1) {
    write(9, 6 + index, index + 1);
    write(9, 19 + index, index + 1);
  }
  write(9, 16, 'Total');
  write(9, 17, 'PS');
  write(9, 18, 'WS');
  write(9, 29, 'Total');
  write(9, 30, 'PS');
  write(9, 31, 'WS');
  write(9, 32, 1);
  write(9, 33, 'PS');
  write(9, 34, 'WS');

  for (let index = 0; index < 10; index += 1) {
    write(10, 6 + index, writtenCategory?.items[index]?.hps ?? '');
    write(10, 19 + index, performanceCategory?.items[index]?.hps ?? '');
  }
  write(10, 16, categoryTotalHps(writtenCategory));
  write(10, 17, 100);
  write(10, 18, weightRatio(writtenCategory?.weight));
  write(10, 29, categoryTotalHps(performanceCategory));
  write(10, 30, 100);
  write(10, 31, weightRatio(performanceCategory?.weight));
  write(10, 32, quarterlyCategory?.items[0]?.hps ?? '');
  write(10, 33, 100);
  write(10, 34, weightRatio(quarterlyCategory?.weight));

  const groups = groupedStudents(spreadsheet.students);
  let rowIndex = DATA_START_ROW;
  let studentCounter = 1;

  const writeStudentRow = (row: number, student: SpreadsheetStudentRow, indexNumber: number) => {
    write(row, 1, indexNumber);
    write(row, 2, displayName(student));

    const writtenData = student.categories.find(
      (category) => category.categoryId === writtenCategory?.id,
    );
    const performanceData = student.categories.find(
      (category) => category.categoryId === performanceCategory?.id,
    );
    const quarterlyData = student.categories.find(
      (category) => category.categoryId === quarterlyCategory?.id,
    );

    for (let index = 0; index < 10; index += 1) {
      write(row, 6 + index, writtenData?.scores[index] ?? '');
      write(row, 19 + index, performanceData?.scores[index] ?? '');
    }

    write(row, 16, writtenData?.total ?? '');
    write(row, 17, writtenData ? Number(writtenData.ps.toFixed(2)) : '');
    write(row, 18, writtenData ? Number(writtenData.ws.toFixed(2)) : '');
    write(row, 29, performanceData?.total ?? '');
    write(row, 30, performanceData ? Number(performanceData.ps.toFixed(2)) : '');
    write(row, 31, performanceData ? Number(performanceData.ws.toFixed(2)) : '');
    write(row, 32, quarterlyData?.scores[0] ?? '');
    write(row, 33, quarterlyData ? Number(quarterlyData.ps.toFixed(2)) : '');
    write(row, 34, quarterlyData ? Number(quarterlyData.ws.toFixed(2)) : '');
    write(row, 35, Number(student.initialGrade.toFixed(2)));
    write(row, 36, student.quarterlyGrade);
  };

  if (groups.length === 0) {
    spreadsheet.students.forEach((student, index) => {
      writeStudentRow(rowIndex, student, index + 1);
      rowIndex += 1;
    });
  } else {
    groups.forEach((group) => {
      write(rowIndex, 2, group.label);
      rowIndex += 1;

      group.students.forEach((student) => {
        writeStudentRow(rowIndex, student, studentCounter);
        studentCounter += 1;
        rowIndex += 1;
      });
    });
  }

  return {
    writes,
    overflowStartRow: rowIndex > DESIGNED_LAST_ROW ? DESIGNED_LAST_ROW + 1 : null,
  };
}

function clearInputRows(worksheet: ExcelJS.Worksheet, upToRow: number) {
  for (let row = DATA_START_ROW; row <= upToRow; row += 1) {
    for (let col = 1; col <= TOTAL_COLUMNS; col += 1) {
      worksheet.getCell(row, col).value = null;
    }
  }
}

function downloadBuffer(buffer: Uint8Array, filename: string) {
  const bytes = Uint8Array.from(buffer);

  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function exportClassRecordTemplateWorkbook(
  spreadsheet: SpreadsheetData,
  selectedRecord: ClassRecord,
) {
  const response = await fetch(TEMPLATE_URL);
  if (!response.ok) {
    throw new Error(`Template fetch failed (${response.status})`);
  }

  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = await response.arrayBuffer();
  await workbook.xlsx.load(arrayBuffer);

  const worksheet = workbook.getWorksheet(INPUT_DATA_SHEET);
  if (!worksheet) {
    throw new Error(`Template sheet "${INPUT_DATA_SHEET}" not found`);
  }

  const { writes } = buildTemplateWrites(spreadsheet, selectedRecord);
  clearInputRows(worksheet, Math.max(DESIGNED_LAST_ROW, DATA_START_ROW + spreadsheet.students.length + 20));
  writes.forEach((entry) => {
    worksheet.getCell(entry.row, entry.col).value = entry.value;
  });

  const output = await workbook.xlsx.writeBuffer();
  const filename = `class-record-${selectedRecord.gradingPeriod}-${selectedRecord.classId}.xlsx`;
  downloadBuffer(Uint8Array.from(output as unknown as ArrayLike<number>), filename);
}
