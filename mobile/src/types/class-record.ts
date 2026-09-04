import type {
  AcademicPolicy,
  AcademicCapabilities,
  AcademicBlocker,
  PeriodEligibility,
} from "./academic-grading";
export type GradingPeriod = "Q1" | "Q2" | "Q3" | "Q4";
export type ClassRecordStatus = "draft" | "finalized" | "locked";

export interface ClassRecord {
  revision?: number;
  rosterConfirmedAt?: string | null;
  id: string;
  classId: string;
  gradingPeriod: GradingPeriod;
  status: ClassRecordStatus;
  teacherId?: string;
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
  score: number | null;
  bonusPoints?: number;
  bonusReason?: string | null;
  status?: "recorded" | "excused";
  reason?: string | null;
}

export interface FinalGrade {
  studentId: string;
  student?: { firstName?: string; lastName?: string; lrn?: string };
  finalPercentage: number;
  quarterlyGrade: number;
  remarks: "Passed" | "For Intervention";
}

export interface CreateClassRecordDto {
  classId: string;
  gradingPeriod: GradingPeriod;
}

export interface RecordScoreDto {
  studentId: string;
  score?: number | null;
  bonusPoints?: number;
  bonusReason?: string;
  status?: "recorded" | "excused";
  reason?: string;
}

export interface UpdateClassRecordItemDto {
  maxScore: number;
}

export interface BulkRecordScoresDto {
  scores: RecordScoreDto[];
}

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
    examComponent?: "ST1" | "ST2" | "TE" | null;
  }[];
}

export interface SpreadsheetStudentRow {
  eligibility?: PeriodEligibility | null;
  eligibilityReason?: string | null;
  provisional?: boolean;
  gradeProvenance?: "verified_revision" | "legacy_unverified" | "provisional";
  blockers?: AcademicBlocker[];
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
    bonusPoints?: number[];
    bonusReasons?: Array<string | null>;
    effectiveScores?: Array<number | null>;
    scorePercents?: Array<number | null>;
    total: number | null;
    ps: number | null;
    ws: number | null;
    scoreStatuses?: Array<"recorded" | "excused" | "missing">;
    scoreReasons?: Array<string | null>;
  }[];
  initialGrade: number | null;
  quarterlyGrade: number | null;
  remarks?: "Passed" | "For Intervention" | "Incomplete" | "Not graded";
  isRemoved?: boolean;
  enrollmentState?: "active" | "removed";
}

export interface SpreadsheetData {
  policy: AcademicPolicy;
  academicCapabilities: AcademicCapabilities;
  canReopen: boolean;
  classRecord: ClassRecord;
  header: {
    region?: string;
    division?: string;
    district?: string;
    schoolName?: string;
    schoolId?: string;
    schoolYear?: string;
    quarter: GradingPeriod;
    periodLabel?: string;
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

export interface ClassAverageReport {
  classRecordId: string;
  average: number;
  count: number;
  interventionCount: number;
}

export interface GradeDistributionReport {
  classRecordId: string;
  distribution: Record<string, number>;
  total: number;
}

export interface InterventionReportRow {
  id: string;
  classRecordId: string;
  studentId: string;
  finalPercentage: string;
  remarks: "Passed" | "For Intervention";
  computedAt: string;
  student?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    middleName: string | null;
    email: string | null;
  } | null;
}
