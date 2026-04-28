import JSZip from 'jszip';
import type { ClassRecord, SpreadsheetData, SpreadsheetStudentRow } from '@/types/class-record';
import { downloadXlsxBuffer } from '@/lib/download-xlsx-buffer';

const TEMPLATE_URL = '/templates/Master.xlsx';
const INPUT_DATA_SHEET = 'INPUT DATA';
const DEFAULT_VISIBLE_SHEET = 'MUSIC _Q1';
const TEMPLATE_LAST_STUDENT_ROW = 112;

const MALE_START_ROW = 12;
const MALE_END_ROW = 61;
const FEMALE_START_ROW = 63;
const FEMALE_END_ROW = 112;

const WRITTEN_SCORE_START_COL = 6; // F
const PERFORMANCE_SCORE_START_COL = 19; // S
const QUARTERLY_SCORE_COL = 32; // AF
const HPS_ROW = 10;

type CellValue = string | number | null;

export interface TemplateWrite {
  sheet: string;
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

function displayName(student: SpreadsheetStudentRow) {
  const middleInitial = student.middleName ? `, ${student.middleName.charAt(0)}.` : '';
  return `${student.lastName}, ${student.firstName}${middleInitial}`;
}

function weightRatio(weight: number | undefined) {
  if (typeof weight !== 'number') return '';
  return Number((weight / 100).toFixed(1));
}

function resolveVisibleSheetName(spreadsheet: SpreadsheetData) {
  const subjectText = [
    spreadsheet.header.subject,
    spreadsheet.header.subjectCode,
    spreadsheet.header.workbookSheetName,
    spreadsheet.header.templateKey,
    spreadsheet.header.templateLabel,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (subjectText.includes('arts')) return 'ARTS_Q1';
  if (subjectText.includes('health')) return 'HEALTH _Q1';
  if (/\bpe\b/.test(subjectText) || subjectText.includes('physical')) return 'PE_Q1';
  if (subjectText.includes('music')) return 'MUSIC _Q1';

  return DEFAULT_VISIBLE_SHEET;
}

function isMale(student: SpreadsheetStudentRow) {
  return ['male', 'm'].includes((student.gender || '').toLowerCase());
}

function isFemale(student: SpreadsheetStudentRow) {
  return ['female', 'f'].includes((student.gender || '').toLowerCase());
}

function createTemplateClears(targetSheet: string): TemplateWrite[] {
  const writes: TemplateWrite[] = [];
  const write = (sheet: string, row: number, col: number, value: CellValue) => {
    writes.push({ sheet, row, col, value });
  };

  for (const [startRow, endRow] of [
    [MALE_START_ROW, MALE_END_ROW],
    [FEMALE_START_ROW, FEMALE_END_ROW],
  ]) {
    for (let row = startRow; row <= endRow; row += 1) {
      write(INPUT_DATA_SHEET, row, 2, '');
      for (let index = 0; index < 10; index += 1) {
        write(targetSheet, row, WRITTEN_SCORE_START_COL + index, '');
        write(targetSheet, row, PERFORMANCE_SCORE_START_COL + index, '');
      }
      write(targetSheet, row, QUARTERLY_SCORE_COL, '');
    }
  }

  for (let index = 0; index < 10; index += 1) {
    write(targetSheet, HPS_ROW, WRITTEN_SCORE_START_COL + index, '');
    write(targetSheet, HPS_ROW, PERFORMANCE_SCORE_START_COL + index, '');
  }
  write(targetSheet, HPS_ROW, QUARTERLY_SCORE_COL, '');

  return writes;
}

export function buildTemplateWrites(
  spreadsheet: SpreadsheetData,
  selectedRecord: ClassRecord,
  targetSheet = resolveVisibleSheetName(spreadsheet),
): { writes: TemplateWrite[]; overflowStartRow: number | null } {
  const writes: TemplateWrite[] = createTemplateClears(targetSheet);
  const write = (sheet: string, row: number, col: number, value: CellValue) => {
    writes.push({ sheet, row, col, value });
  };
  const writeInput = (row: number, col: number, value: CellValue) => {
    write(INPUT_DATA_SHEET, row, col, value);
  };
  const writeVisible = (row: number, col: number, value: CellValue) => {
    write(targetSheet, row, col, value);
  };

  const writtenCategory = categoryByName(spreadsheet, 'written');
  const performanceCategory = categoryByName(spreadsheet, 'performance');
  const quarterlyCategory = categoryByName(spreadsheet, 'quarterly');

  writeInput(4, 7, spreadsheet.header.region || '');
  writeInput(4, 15, spreadsheet.header.division || '');
  writeInput(5, 7, spreadsheet.header.schoolName || 'Gat Andres Bonifacio High School');
  writeInput(5, 24, spreadsheet.header.schoolId || '');
  writeInput(5, 33, spreadsheet.header.schoolYear || '');
  writeInput(7, 1, quarterTitle(spreadsheet.header.quarter || selectedRecord.gradingPeriod));
  writeInput(
    7,
    11,
    `${spreadsheet.header.gradeLevel ? `GRADE ${spreadsheet.header.gradeLevel}` : ''}${spreadsheet.header.section ? ` - ${spreadsheet.header.section}` : ''}`,
  );
  writeInput(7, 19, spreadsheet.header.teacher || '');
  writeInput(7, 33, spreadsheet.header.subject || 'MAPEH');

  writeVisible(
    8,
    6,
    `${(writtenCategory?.name || 'WRITTEN WORKS').toUpperCase()} (${Math.round(writtenCategory?.weight || 0)}%)`,
  );
  writeVisible(
    8,
    19,
    `${(performanceCategory?.name || 'PERFORMANCE TASKS').toUpperCase()} (${Math.round(performanceCategory?.weight || 0)}%)`,
  );
  writeVisible(
    8,
    32,
    `${(quarterlyCategory?.name || 'QUARTERLY ASSESSMENT').toUpperCase()} (${Math.round(quarterlyCategory?.weight || 0)}%)`,
  );

  for (let index = 0; index < 10; index += 1) {
    writeVisible(HPS_ROW, WRITTEN_SCORE_START_COL + index, writtenCategory?.items[index]?.hps ?? '');
    writeVisible(
      HPS_ROW,
      PERFORMANCE_SCORE_START_COL + index,
      performanceCategory?.items[index]?.hps ?? '',
    );
  }
  writeVisible(HPS_ROW, 17, 100);
  writeVisible(HPS_ROW, 18, weightRatio(writtenCategory?.weight));
  writeVisible(HPS_ROW, 30, 100);
  writeVisible(HPS_ROW, 31, weightRatio(performanceCategory?.weight));
  writeVisible(HPS_ROW, QUARTERLY_SCORE_COL, quarterlyCategory?.items[0]?.hps ?? '');
  writeVisible(HPS_ROW, 33, 100);
  writeVisible(HPS_ROW, 34, weightRatio(quarterlyCategory?.weight));

  const maleStudents = spreadsheet.students.filter(isMale);
  const femaleStudents = spreadsheet.students.filter(isFemale);
  const unspecifiedStudents = spreadsheet.students.filter(
    (student) => !isMale(student) && !isFemale(student),
  );

  let overflowCount = 0;
  const spareRows: number[] = [];

  const writeStudentRow = (row: number, student: SpreadsheetStudentRow) => {
    writeInput(row, 2, displayName(student));

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
      writeVisible(row, WRITTEN_SCORE_START_COL + index, writtenData?.scores[index] ?? '');
      writeVisible(
        row,
        PERFORMANCE_SCORE_START_COL + index,
        performanceData?.scores[index] ?? '',
      );
    }

    writeVisible(row, QUARTERLY_SCORE_COL, quarterlyData?.scores[0] ?? '');
  };

  const writeStudentsToRows = (students: SpreadsheetStudentRow[], startRow: number, endRow: number) => {
    const capacity = endRow - startRow + 1;
    students.slice(0, capacity).forEach((student, index) => {
      writeStudentRow(startRow + index, student);
    });
    for (let row = startRow + students.length; row <= endRow; row += 1) {
      spareRows.push(row);
    }
    overflowCount += Math.max(0, students.length - capacity);
  };

  writeStudentsToRows(maleStudents, MALE_START_ROW, MALE_END_ROW);
  writeStudentsToRows(femaleStudents, FEMALE_START_ROW, FEMALE_END_ROW);

  unspecifiedStudents.forEach((student) => {
    const row = spareRows.shift();
    if (row) {
      writeStudentRow(row, student);
    } else {
      overflowCount += 1;
    }
  });

  return {
    writes,
    overflowStartRow: overflowCount > 0 ? TEMPLATE_LAST_STUDENT_ROW + 1 : null,
  };
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function unescapeXml(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

function columnName(col: number) {
  let value = col;
  let name = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function columnNumber(column: string) {
  return column.split('').reduce((sum, char) => sum * 26 + char.charCodeAt(0) - 64, 0);
}

function cellRef(row: number, col: number) {
  return `${columnName(col)}${row}`;
}

function styleAttribute(existingCellXml: string | undefined) {
  const styleMatch = existingCellXml?.match(/\bs="[^"]*"/);
  return styleMatch ? ` ${styleMatch[0]}` : '';
}

function cellXml(ref: string, value: CellValue, existingCellXml?: string) {
  const style = styleAttribute(existingCellXml);
  if (value === null || value === '') {
    return `<c r="${ref}"${style}/>`;
  }

  if (typeof value === 'number') {
    return `<c r="${ref}"${style}><v>${Number.isFinite(value) ? value : ''}</v></c>`;
  }

  const preserveSpace = /^\s|\s$/.test(value) ? ' xml:space="preserve"' : '';
  return `<c r="${ref}"${style} t="inlineStr"><is><t${preserveSpace}>${escapeXml(value)}</t></is></c>`;
}

function patchCellInRow(rowXml: string, row: number, col: number, value: CellValue) {
  const ref = cellRef(row, col);
  const cellPattern = new RegExp(
    `<c\\b(?=[^>]*\\br="${ref}")[^>]*(?:\\/>|>[\\s\\S]*?<\\/c>)`,
  );
  const existingCell = rowXml.match(cellPattern)?.[0];
  const replacement = cellXml(ref, value, existingCell);

  if (existingCell) {
    return rowXml.replace(cellPattern, replacement);
  }

  const openingEnd = rowXml.indexOf('>') + 1;
  const closingStart = rowXml.lastIndexOf('</row>');
  const body = rowXml.slice(openingEnd, closingStart);
  const cellMatches = [...body.matchAll(/<c\b[^>]*\br="([A-Z]+)\d+"[^>]*(?:\/>|>[\s\S]*?<\/c>)/g)];
  const nextCell = cellMatches.find((match) => columnNumber(match[1]) > col);

  if (nextCell?.index !== undefined) {
    const insertAt = openingEnd + nextCell.index;
    return `${rowXml.slice(0, insertAt)}${replacement}${rowXml.slice(insertAt)}`;
  }

  return `${rowXml.slice(0, closingStart)}${replacement}${rowXml.slice(closingStart)}`;
}

function patchSheetXml(xml: string, writes: TemplateWrite[]) {
  return writes.reduce((patchedXml, write) => {
    const rowPattern = new RegExp(`<row\\b(?=[^>]*\\br="${write.row}")[^>]*>[\\s\\S]*?<\\/row>`);
    const existingRow = patchedXml.match(rowPattern)?.[0];

    if (existingRow) {
      return patchedXml.replace(
        rowPattern,
        patchCellInRow(existingRow, write.row, write.col, write.value),
      );
    }

    const ref = cellRef(write.row, write.col);
    const newRow = `<row r="${write.row}">${cellXml(ref, write.value)}</row>`;
    return patchedXml.replace('</sheetData>', `${newRow}</sheetData>`);
  }, xml);
}

async function getWorksheetPaths(zip: JSZip) {
  const workbookXml = await zip.file('xl/workbook.xml')?.async('string');
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('string');

  if (!workbookXml || !relsXml) {
    throw new Error('Template workbook metadata not found');
  }

  const rels = new Map<string, string>();
  for (const match of relsXml.matchAll(/<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*\/>/g)) {
    const target = match[2].replace(/^\/+/, '');
    rels.set(match[1], target.startsWith('xl/') ? target : `xl/${target}`);
  }

  const paths = new Map<string, string>();
  for (const match of workbookXml.matchAll(/<sheet\b[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"[^>]*\/>/g)) {
    const target = rels.get(match[2]);
    if (target) {
      paths.set(unescapeXml(match[1]), target);
    }
  }

  return paths;
}

async function writeTemplateCells(zip: JSZip, writes: TemplateWrite[]) {
  const worksheetPaths = await getWorksheetPaths(zip);
  const writesBySheet = new Map<string, TemplateWrite[]>();

  writes.forEach((write) => {
    const sheetWrites = writesBySheet.get(write.sheet) || [];
    sheetWrites.push(write);
    writesBySheet.set(write.sheet, sheetWrites);
  });

  for (const [sheetName, sheetWrites] of writesBySheet) {
    const path = worksheetPaths.get(sheetName);
    if (!path) {
      throw new Error(`Template sheet "${sheetName}" not found`);
    }

    const sheetFile = zip.file(path);
    const sheetXml = await sheetFile?.async('string');
    if (!sheetFile || !sheetXml) {
      throw new Error(`Template worksheet XML for "${sheetName}" not found`);
    }

    zip.file(path, patchSheetXml(sheetXml, sheetWrites));
  }
}

async function markWorkbookForRecalculation(zip: JSZip) {
  const workbookXml = await zip.file('xl/workbook.xml')?.async('string');
  if (!workbookXml) {
    throw new Error('Template workbook metadata not found');
  }

  const updatedWorkbookXml = workbookXml.includes('<calcPr')
    ? workbookXml.replace(
        /<calcPr\b([^>]*)\/>/,
        (_match, attributes: string) =>
          `<calcPr${attributes.replace(/\s(?:fullCalcOnLoad|forceFullCalc)="[^"]*"/g, '')} fullCalcOnLoad="1" forceFullCalc="1"/>`,
      )
    : workbookXml.replace(
        '</workbook>',
        '<calcPr fullCalcOnLoad="1" forceFullCalc="1"/></workbook>',
      );

  zip.file('xl/workbook.xml', updatedWorkbookXml);
}

export async function exportClassRecordTemplateWorkbook(
  spreadsheet: SpreadsheetData,
  selectedRecord: ClassRecord,
) {
  const response = await fetch(TEMPLATE_URL);
  if (!response.ok) {
    throw new Error(`Template fetch failed (${response.status})`);
  }

  const templateBuffer = await response.arrayBuffer();
  const workbookZip = await JSZip.loadAsync(templateBuffer);
  const { writes } = buildTemplateWrites(spreadsheet, selectedRecord);
  await writeTemplateCells(workbookZip, writes);
  await markWorkbookForRecalculation(workbookZip);

  const output = await workbookZip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  const filename = `class-record-${selectedRecord.gradingPeriod}-${selectedRecord.classId}.xlsx`;
  downloadXlsxBuffer(output, filename);
}
