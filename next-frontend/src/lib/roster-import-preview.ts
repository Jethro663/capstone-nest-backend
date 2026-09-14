export type SpreadsheetPreviewRow = {
  rowNumber: number;
  cells: string[];
};

export type SpreadsheetPreviewSheet = {
  name: string;
  rowCount: number;
  columnCount: number;
  rows: SpreadsheetPreviewRow[];
};

export type SpreadsheetFilePreview = {
  kind: 'csv' | 'xlsx';
  fileName: string;
  fileSizeLabel: string;
  sheets: SpreadsheetPreviewSheet[];
};

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function formatFileSize(bytes: number): string {
  return `${Math.max(bytes / 1_048_576, 0.01).toFixed(2)} MB`;
}

function cleanSpreadsheetText(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function formatSpreadsheetCellValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value !== 'object') return cleanSpreadsheetText(value);
  const record = value as Record<string, unknown>;
  if (typeof record.text === 'string') return cleanSpreadsheetText(record.text);
  if ('result' in record) return formatSpreadsheetCellValue(record.result);
  if (Array.isArray(record.richText)) {
    return record.richText
      .map((part) => cleanSpreadsheetText((part as { text?: unknown }).text))
      .filter(Boolean)
      .join(' ');
  }
  if (typeof record.hyperlink === 'string' && typeof record.text === 'string') {
    return cleanSpreadsheetText(record.text);
  }
  if (typeof record.error === 'string') return record.error;
  return Object.values(record)
    .map((entry) => (typeof entry === 'object' ? '' : cleanSpreadsheetText(entry)))
    .filter(Boolean)
    .join(' ');
}

function rowHasPreviewValue(cells: string[]): boolean {
  return cells.some((cell) => cell.trim().length > 0);
}

function normalizePreviewSheet(
  name: string,
  rows: SpreadsheetPreviewRow[],
): SpreadsheetPreviewSheet {
  const columnCount = Math.max(...rows.map((row) => row.cells.length), 0);
  return {
    name,
    rowCount: rows.length,
    columnCount,
    rows: rows.map((row) => ({
      rowNumber: row.rowNumber,
      cells: Array.from(
        { length: columnCount },
        (_, index) => row.cells[index] ?? '',
      ),
    })),
  };
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [[]];
  let currentCell = '';
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      rows[rows.length - 1].push(cleanSpreadsheetText(currentCell));
      currentCell = '';
      continue;
    }
    const charCode = char.charCodeAt(0);
    const nextCharCode = nextChar?.charCodeAt(0);
    if ((charCode === 10 || charCode === 13) && !inQuotes) {
      if (charCode === 13 && nextCharCode === 10) index += 1;
      rows[rows.length - 1].push(cleanSpreadsheetText(currentCell));
      rows.push([]);
      currentCell = '';
      continue;
    }
    currentCell += char;
  }
  rows[rows.length - 1].push(cleanSpreadsheetText(currentCell));
  return rows;
}

function readFileAsText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read file text'));
    reader.readAsText(file);
  });
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') return file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read workbook'));
    reader.readAsArrayBuffer(file);
  });
}

function getFilePreviewKind(file: File): 'csv' | 'xlsx' | 'unsupported' {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'csv' || file.type.includes('csv')) return 'csv';
  if (extension === 'xlsx' || file.type.includes('spreadsheetml')) return 'xlsx';
  return 'unsupported';
}

function escapeCsvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function previewSheetToCsv(sheet: SpreadsheetPreviewSheet): string {
  const rowsByNumber = new Map(sheet.rows.map((row) => [row.rowNumber, row]));
  const lastRowNumber = Math.max(...sheet.rows.map((row) => row.rowNumber), 0);
  return Array.from({ length: lastRowNumber }, (_, rowIndex) => {
    const row = rowsByNumber.get(rowIndex + 1);
    if (!row) return '';
    return Array.from(
      { length: sheet.columnCount },
      (_, columnIndex) => escapeCsvCell(row.cells[columnIndex] ?? ''),
    ).join(',');
  }).join('\r\n');
}

export function getSpreadsheetColumnLabel(columnIndex: number): string {
  let label = '';
  let current = columnIndex;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    current = Math.floor((current - 1) / 26);
  }
  return label;
}

export async function createSpreadsheetFilePreview(
  file: File,
): Promise<SpreadsheetFilePreview> {
  const kind = getFilePreviewKind(file);
  if (kind === 'csv') {
    const rows = parseCsvRows(await readFileAsText(file))
      .map((cells, index) => ({ rowNumber: index + 1, cells }))
      .filter((row) => rowHasPreviewValue(row.cells));
    return {
      kind,
      fileName: file.name,
      fileSizeLabel: formatFileSize(file.size),
      sheets: [
        normalizePreviewSheet(
          file.name.replace(/\.[^.]+$/, '') || 'CSV Preview',
          rows,
        ),
      ],
    };
  }
  if (kind !== 'xlsx') {
    throw new Error(
      'Browser preview and editing support CSV and .xlsx files only. Convert old .xls files to .xlsx before importing.',
    );
  }
  const { default: ExcelJS } = await import('exceljs/dist/exceljs.min.js');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await readFileAsArrayBuffer(file));
  const sheets = workbook.worksheets.map((worksheet) => {
    const rows: SpreadsheetPreviewRow[] = [];
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const cellCount = Math.max(row.cellCount, row.actualCellCount);
      const cells = Array.from({ length: cellCount }, (_, index) =>
        formatSpreadsheetCellValue(row.getCell(index + 1).value),
      );
      if (rowHasPreviewValue(cells)) rows.push({ rowNumber, cells });
    });
    return normalizePreviewSheet(worksheet.name, rows);
  });
  return {
    kind,
    fileName: file.name,
    fileSizeLabel: formatFileSize(file.size),
    sheets:
      sheets.length > 0 ? sheets : [normalizePreviewSheet('Sheet 1', [])],
  };
}

export function updateSpreadsheetPreviewCell(
  preview: SpreadsheetFilePreview,
  sheetIndex: number,
  rowNumber: number,
  columnIndex: number,
  value: string,
): SpreadsheetFilePreview {
  return {
    ...preview,
    sheets: preview.sheets.map((sheet, currentSheetIndex) => {
      if (currentSheetIndex !== sheetIndex) return sheet;
      return {
        ...sheet,
        rows: sheet.rows.map((row) => {
          if (row.rowNumber !== rowNumber) return row;
          return {
            ...row,
            cells: row.cells.map((cell, currentColumnIndex) =>
              currentColumnIndex === columnIndex ? value : cell,
            ),
          };
        }),
      };
    }),
  };
}

export async function createSpreadsheetPreviewUpload(
  preview: SpreadsheetFilePreview,
): Promise<File> {
  if (preview.kind === 'csv') {
    return new File([previewSheetToCsv(preview.sheets[0])], preview.fileName, {
      type: 'text/csv',
    });
  }

  const { default: ExcelJS } = await import('exceljs/dist/exceljs.min.js');
  const workbook = new ExcelJS.Workbook();
  preview.sheets.forEach((sheet) => {
    const worksheet = workbook.addWorksheet(sheet.name);
    sheet.rows.forEach((row) => {
      row.cells.forEach((cell, columnIndex) => {
        worksheet.getCell(row.rowNumber, columnIndex + 1).value = cell;
      });
    });
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const arrayBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  return new File([arrayBuffer], preview.fileName, { type: XLSX_MIME });
}
