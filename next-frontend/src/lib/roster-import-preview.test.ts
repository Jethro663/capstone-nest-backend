import {
  createSpreadsheetFilePreview,
  createSpreadsheetPreviewUpload,
  updateSpreadsheetPreviewCell,
} from './roster-import-preview';

describe('roster import spreadsheet draft', () => {
  it('serializes edited CSV cells with safe quoting and original row positions', async () => {
    const original = new File(
      ['Last Name,First Name,Middle Name,LRN,Email\n\nDela Cruz,Ana,Santos,202407000010,ana@nexora.edu'],
      'roster.csv',
      { type: 'text/csv' },
    );
    const parsed = await createSpreadsheetFilePreview(original);
    const edited = updateSpreadsheetPreviewCell(parsed, 0, 3, 0, 'Santiago, Jr.');
    const upload = await createSpreadsheetPreviewUpload(edited);
    const reparsed = await createSpreadsheetFilePreview(upload);

    expect(reparsed.kind).toBe('csv');
    expect(reparsed.sheets[0].rows.map((row) => row.rowNumber)).toEqual([1, 3]);
    expect(reparsed.sheets[0].rows[1].cells[0]).toBe('Santiago, Jr.');
  });

  it('preserves XLSX sheet order, source row numbers, and edited values', async () => {
    const { default: ExcelJS } = await import('exceljs/dist/exceljs.min.js');
    const workbook = new ExcelJS.Workbook();
    const source = workbook.addWorksheet('Roster Import');
    source.getCell('A1').value = 'Last Name';
    source.getCell('A4').value = 'Dela Cruz';
    const notes = workbook.addWorksheet('Notes');
    notes.getCell('A2').value = 'Reference only';
    const original = new File(
      [await workbook.xlsx.writeBuffer()],
      'roster.xlsx',
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    );

    const parsed = await createSpreadsheetFilePreview(original);
    const edited = updateSpreadsheetPreviewCell(parsed, 0, 4, 0, 'Santiago');
    const upload = await createSpreadsheetPreviewUpload(edited);
    const reparsed = await createSpreadsheetFilePreview(upload);

    expect(reparsed.kind).toBe('xlsx');
    expect(reparsed.sheets.map((sheet) => sheet.name)).toEqual(['Roster Import', 'Notes']);
    expect(reparsed.sheets[0].rows.map((row) => row.rowNumber)).toEqual([1, 4]);
    expect(reparsed.sheets[0].rows[1].cells[0]).toBe('Santiago');
    expect(reparsed.sheets[1].rows[0]).toEqual({ rowNumber: 2, cells: ['Reference only'] });
  });

  it('does not mutate the parsed preview when a cell is updated', async () => {
    const parsed = await createSpreadsheetFilePreview(
      new File(['Last Name\nDela Cruz'], 'roster.csv', { type: 'text/csv' }),
    );
    const edited = updateSpreadsheetPreviewCell(parsed, 0, 2, 0, 'Santiago');

    expect(parsed.sheets[0].rows[1].cells[0]).toBe('Dela Cruz');
    expect(edited.sheets[0].rows[1].cells[0]).toBe('Santiago');
  });
});
