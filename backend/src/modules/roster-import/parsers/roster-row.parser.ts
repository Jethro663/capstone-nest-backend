import {
  LRN_REGEX,
  SECTION_HEADER_REGEX,
  HEADER_KEYWORDS,
} from '../constants/roster-import.constants';

// Section-header detection

export interface SectionHeaderInfo {
  gradeLevel: string;
  sectionName: string;
  rawHeader: string;
  rowIndex: number;
}

/**
 * Scans all rows for one that matches the section header pattern,
 * e.g. "GRADE_7 HUMSS-A".
 */
export function findSectionHeaderRow(
  rows: string[][],
): SectionHeaderInfo | null {
  for (let i = 0; i < rows.length; i++) {
    for (const cell of rows[i]) {
      const trimmed = cell.trim();
      const match = SECTION_HEADER_REGEX.exec(trimmed);
      if (match) {
        return {
          gradeLevel: match[1].trim(),
          sectionName: match[2].trim(),
          rawHeader: trimmed,
          rowIndex: i,
        };
      }
    }
  }
  return null;
}

// Column-header detection

export interface ColumnHeaderInfo {
  lastNameCol: number;
  firstNameCol: number;
  middleNameCol: number;
  lrnCol: number;
  emailCol: number;
  rowIndex: number;
}

/**
 * Finds a header row containing all required roster columns.
 */
export function findColumnHeaderRow(
  rows: string[][],
  startIndex: number,
): ColumnHeaderInfo | null {
  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i].map((c) => c.toLowerCase());

    const lastNameCol = findKeywordIndex(row, HEADER_KEYWORDS.lastName);
    const firstNameCol = findKeywordIndex(row, HEADER_KEYWORDS.firstName);
    const middleNameCol = findKeywordIndex(row, HEADER_KEYWORDS.middleName);
    const lrnCol = findKeywordIndex(row, HEADER_KEYWORDS.lrn);
    const emailCol = findKeywordIndex(row, HEADER_KEYWORDS.email);

    if (
      lastNameCol !== -1 &&
      firstNameCol !== -1 &&
      middleNameCol !== -1 &&
      lrnCol !== -1 &&
      emailCol !== -1
    ) {
      return {
        lastNameCol,
        firstNameCol,
        middleNameCol,
        lrnCol,
        emailCol,
        rowIndex: i,
      };
    }
  }

  return null;
}

function findKeywordIndex(
  rowLower: string[],
  keywords: readonly string[],
): number {
  return rowLower.findIndex((cell) => keywords.some((kw) => cell.includes(kw)));
}

// Validation helpers

export function validateLrn(value: string): boolean {
  return LRN_REGEX.test(value.trim());
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}
