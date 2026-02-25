/** Maximum file size accepted by the roster-import endpoint (10 MB). */
export const MAX_ROSTER_FILE_SIZE_BYTES = 10_485_760;

/** MIME types accepted for roster uploads. */
export const ALLOWED_ROSTER_MIME_TYPES = [
  'text/csv',
  'text/plain', // Some OS/browsers report CSV as text/plain
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel', // xls
] as const;

/** Disk directory where roster files are temporarily stored before parsing. */
export const UPLOAD_DEST_ROSTER = './uploads/rosters';

/**
 * LRN must be exactly 12 numeric digits (DepEd Learner Reference Number format).
 * Pattern: XXXXXXYYZZZZ
 */
export const LRN_REGEX = /^\d{12}$/;

/**
 * Matches the section-header row in the roster file.
 * Examples that match:
 *   "GRADE_7 HUMSS-A"
 *   "GRADE 8 STEM"
 *   "grade_10 Science 1"
 */
export const SECTION_HEADER_REGEX = /GRADE[\s_]*(\d{1,2})\s+(.+)/i;

/** Column-header keywords used to auto-detect the header row (case-insensitive). */
export const HEADER_KEYWORDS = {
  name: ['name', 'student'],
  lrn: ['lrn', 'learner reference', 'learner ref'],
  email: ['email', 'e-mail', 'mail'],
} as const;
