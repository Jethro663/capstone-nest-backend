import type { GradingPeriod } from '@/utils/constants';

export type ClassRecordStatus = 'draft' | 'finalized' | 'locked';

export interface ClassRecord {
  id: string;
  classId: string;
  gradingPeriod: GradingPeriod;
  status: ClassRecordStatus;
  categories?: ClassRecordCategory[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ClassRecordCategory {
  id: string;
  classRecordId: string;
  name: string;
  weightPercentage: number;
  items?: ClassRecordItem[];
}

export interface ClassRecordItem {
  id: string;
  categoryId: string;
  assessmentId?: string;
  title: string;
  maxScore: number;
  highestPossibleScore?: number;
  itemOrder?: number;
  dateGiven?: string;
  scores?: ClassRecordScore[];
}

export interface ClassRecordScore {
  id: string;
  itemId: string;
  studentId: string;
  score: number;
}

export interface FinalGrade {
  studentId: string;
  student?: { firstName?: string; lastName?: string; lrn?: string };
  finalPercentage: number;
  quarterlyGrade: number;
  remarks: 'Passed' | 'For Intervention';
}

export interface CreateClassRecordDto {
  classId: string;
  gradingPeriod: GradingPeriod;
}

export interface RecordScoreDto {
  studentId: string;
  score: number;
}

export interface BulkRecordScoresDto {
  scores: RecordScoreDto[];
}

// Spreadsheet data shape returned by GET /class-record/:id/spreadsheet
export interface SpreadsheetCategory {
  id: string;
  name: string;
  weight: number;
  totalHps?: number;
  items: {
    id: string;
    title: string;
    hps: number | null;
    order: number;
    assessmentId?: string;
  }[];
}

export interface SpreadsheetStudentRow {
  studentId: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  lrn?: string;
  email?: string;
  gender?: string;
  categories: {
    categoryId: string;
    scores: (number | null)[];
    total: number;
    ps: number;
    ws: number;
  }[];
  initialGrade: number;
  quarterlyGrade: number;
  remarks?: 'Passed' | 'For Intervention';
}

export interface SpreadsheetData {
  classRecord: ClassRecord;
  header: {
    region?: string;
    division?: string;
    district?: string;
    schoolName?: string;
    schoolId?: string;
    schoolYear?: string;
    quarter: GradingPeriod;
    gradeLevel?: string;
    section?: string;
    teacher?: string;
    subject?: string;
    subjectCode?: string;
    workbookTitle?: string;
    workbookSubtitle?: string;
    workbookSheetName?: string;
    templateKey?: string;
    templateLabel?: string;
  };
  categories: SpreadsheetCategory[];
  students: SpreadsheetStudentRow[];
}
