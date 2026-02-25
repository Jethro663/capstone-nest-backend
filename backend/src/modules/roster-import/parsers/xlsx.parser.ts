import * as ExcelJS from 'exceljs';

/**
 * Reads an XLSX file from disk and returns all rows in the first worksheet
 * as a 2-D array of strings.  Empty cells are converted to empty strings.
 */
export async function parseXlsx(filePath: string): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('The Excel file contains no worksheets.');
  }

  const rows: string[][] = [];

  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      // Normalise all cell types to plain strings
      const raw = cell.value;
      if (raw === null || raw === undefined) {
        cells.push('');
      } else if (typeof raw === 'object' && 'richText' in (raw as object)) {
        // RichText cell → join segments
        cells.push(
          (raw as ExcelJS.CellRichTextValue).richText
            .map((t) => t.text)
            .join(''),
        );
      } else if (typeof raw === 'object' && 'text' in (raw as object)) {
        // Hyperlink cell
        cells.push(String((raw as ExcelJS.CellHyperlinkValue).text));
      } else if (raw instanceof Date) {
        cells.push(raw.toISOString());
      } else {
        cells.push(String(raw));
      }
    });

    // Trim trailing empty cells from each row to keep things clean
    while (cells.length > 0 && cells[cells.length - 1].trim() === '') {
      cells.pop();
    }

    if (cells.length > 0) {
      rows.push(cells);
    }
  });

  return rows;
}
