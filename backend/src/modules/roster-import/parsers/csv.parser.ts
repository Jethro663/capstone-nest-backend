import * as fs from 'fs';
import { parse } from 'csv-parse/sync';

/**
 * Reads a CSV file from disk and returns all rows as a 2-D array of strings.
 * Empty rows are skipped; all values are trimmed.
 */
export function parseCsv(filePath: string): string[][] {
  const content = fs.readFileSync(filePath, { encoding: 'utf-8' });

  const records: string[][] = parse(content, {
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true, // allow rows with varying column counts
  });

  return records;
}
