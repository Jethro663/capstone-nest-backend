import type { DataValidation, Worksheet } from 'exceljs';
import type { Section } from '@/types/section';
import { downloadXlsxBuffer } from '@/lib/download-xlsx-buffer';

const DATA_START_ROW = 4;
const DATA_END_ROW = 203;
const TEMPLATE_PASSWORD = 'nexora-roster-template';

type TemplateSection = Pick<Section, 'gradeLevel' | 'name'>;
type WorksheetWithRangeValidation = Worksheet & {
  dataValidations: {
    add(range: string, validation: DataValidation): void;
  };
};

function templateHeader(section: TemplateSection) {
  return `GRADE ${String(section.gradeLevel).trim()} ${section.name.trim()}`;
}

function safeFilenamePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export async function createRosterImportTemplateBuffer(section: TemplateSection) {
  const { default: ExcelJS } = await import('exceljs/dist/exceljs.min.js');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Nexora LMS';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Roster Import', {
    views: [{ state: 'frozen', ySplit: 3 }],
  });

  worksheet.columns = [
    { key: 'lastName', width: 24 },
    { key: 'firstName', width: 24 },
    { key: 'middleName', width: 24 },
    { key: 'lrn', width: 18 },
    { key: 'email', width: 36 },
  ];

  worksheet.mergeCells('A1:E1');
  worksheet.getCell('A1').value = templateHeader(section);
  worksheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  worksheet.getCell('A1').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F3A5F' },
  };
  worksheet.getCell('A1').alignment = { horizontal: 'center' };

  worksheet.mergeCells('A2:E2');
  worksheet.getCell('A2').value = 'Only edit the blank rows below. Protected headers keep the import format stable.';
  worksheet.getCell('A2').font = { italic: true, color: { argb: 'FF52657A' } };

  const headerRow = worksheet.getRow(3);
  headerRow.getCell(1).value = 'Last Name';
  headerRow.getCell(2).value = 'First Name';
  headerRow.getCell(3).value = 'Middle Name';
  headerRow.getCell(4).value = 'LRN';
  headerRow.getCell(5).value = 'Email';
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { horizontal: 'center' };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3F5F86' },
    };
  });

  worksheet.autoFilter = 'A3:E3';

  for (let rowNumber = DATA_START_ROW; rowNumber <= DATA_END_ROW; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    row.height = 18;

    for (let colNumber = 1; colNumber <= 5; colNumber += 1) {
      const cell = row.getCell(colNumber);
      cell.protection = { locked: false };
      cell.border = {
        bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } },
      };
      if (colNumber === 4) cell.numFmt = '@';
    }
  }

  worksheet.getCell('A4').note = 'Required. Example: Santos';
  worksheet.getCell('B4').note = 'Required. Example: Ana';
  worksheet.getCell('C4').note = 'Required. Example: Bautista';
  worksheet.getCell('D4').note = 'Required. Enter exactly 12 digits. This column is formatted as text to preserve leading zeroes.';
  worksheet.getCell('E4').note = 'Required. Use the student LMS email address.';

  const lrnValidation: DataValidation = {
    type: 'textLength',
    operator: 'equal',
    allowBlank: true,
    showErrorMessage: true,
    errorTitle: 'Invalid LRN',
    error: 'LRN must be exactly 12 digits.',
    formulae: [12],
  };
  (worksheet as WorksheetWithRangeValidation).dataValidations.add(
    `D${DATA_START_ROW}:D${DATA_END_ROW}`,
    lrnValidation,
  );

  await worksheet.protect(TEMPLATE_PASSWORD, {
    selectLockedCells: false,
    selectUnlockedCells: true,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertColumns: false,
    insertRows: false,
    deleteColumns: false,
    deleteRows: false,
    sort: false,
    autoFilter: true,
    spinCount: 1000,
  });

  return workbook.xlsx.writeBuffer();
}

export async function downloadRosterImportTemplate(section: TemplateSection) {
  const buffer = await createRosterImportTemplateBuffer(section);
  const grade = safeFilenamePart(`grade-${section.gradeLevel}`);
  const name = safeFilenamePart(section.name) || 'section';
  downloadXlsxBuffer(buffer, `roster-template-${grade}-${name}.xlsx`);
}
