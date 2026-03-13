import {
  LRN_REGEX,
  SECTION_HEADER_REGEX,
  HEADER_KEYWORDS,
} from '../constants/roster-import.constants';
import { ParsedNameDto } from '../dto/roster-import.dto';

// ─── Section-header detection ─────────────────────────────────────────────────

export interface SectionHeaderInfo {
  gradeLevel: string; // e.g. "7"
  sectionName: string; // e.g. "HUMSS-A"
  rawHeader: string; // full original cell text
  rowIndex: number; // 0-based index into the parsed rows array
}

/**
 * Scans all rows for one that matches the SECTION_HEADER_REGEX pattern
 * (e.g. "GRADE_7 HUMSS-A").  Returns metadata about the first match found.
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

// ─── Column-header detection ──────────────────────────────────────────────────

export interface ColumnHeaderInfo {
  nameCol: number;
  lrnCol: number;
  emailCol: number;
  rowIndex: number;
}

/**
 * Scans rows starting at `startIndex` for a header row that contains all three
 * required column keywords (name, lrn, email).  Returns the first match.
 */
export function findColumnHeaderRow(
  rows: string[][],
  startIndex: number,
): ColumnHeaderInfo | null {
  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i].map((c) => c.toLowerCase());
    const nameCol = findKeywordIndex(row, HEADER_KEYWORDS.name);
    const lrnCol = findKeywordIndex(row, HEADER_KEYWORDS.lrn);
    const emailCol = findKeywordIndex(row, HEADER_KEYWORDS.email);

    if (nameCol !== -1 && lrnCol !== -1 && emailCol !== -1) {
      return { nameCol, lrnCol, emailCol, rowIndex: i };
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

// ─── Name parsing ─────────────────────────────────────────────────────────────

/**
 * Parses a name cell in "LastName, FirstName M.I." format.
 * The comma is the delimiter between last name and the rest.
 *
 * Examples:
 *   "Dela Cruz, Juan A."  → { lastName: "Dela Cruz", firstName: "Juan", middleInitial: "A" }
 *   "Santos, Maria"       → { lastName: "Santos", firstName: "Maria", middleInitial: null }
 *   "Garcia"              → { lastName: "Garcia", firstName: "", middleInitial: null }
 */
export function parseNameCell(cell: string): ParsedNameDto {
  const trimmed = cell.trim();
  const commaIndex = trimmed.indexOf(',');

  if (commaIndex === -1) {
    return { lastName: trimmed, firstName: '', middleInitial: null };
  }

  const lastName = trimmed.slice(0, commaIndex).trim();
  const rest = trimmed.slice(commaIndex + 1).trim();

  // Split the rest on spaces; last token is the M.I. if it's 1-2 characters (optionally ending in .)
  const parts = rest.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { lastName, firstName: '', middleInitial: null };
  }

  // The last token is treated as M.I. if it matches: one or two letters, optional trailing dot
  const lastPart = parts[parts.length - 1];
  const miMatch = /^([A-Za-z]{1,2})\.?$/.exec(lastPart);

  if (miMatch && parts.length > 1) {
    const firstName = parts.slice(0, -1).join(' ');
    const middleInitial = miMatch[1].toUpperCase();
    return { lastName, firstName, middleInitial };
  }

  return { lastName, firstName: parts.join(' '), middleInitial: null };
}

// ─── Validation helpers ───────────────────────────────────────────────────────

/** Returns true if the LRN is exactly 12 numeric digits. */
export function validateLrn(value: string): boolean {
  return LRN_REGEX.test(value.trim());
}

// Basic RFC 5322–inspired email check (intentionally simple for roster data).
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returns true if the value looks like a valid email address. */
export function validateEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}
