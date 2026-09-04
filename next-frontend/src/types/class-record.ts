import type {
  AcademicPolicy,
  AcademicCapabilities,
  AcademicBlocker,
  PeriodEligibility,
} from "./academic-grading";
import type { GradingPeriod } from "@/utils/constants";

export type ClassRecordStatus = "draft" | "finalized" | "locked";

export interface ClassRecord {
  id: string;
  classId: string;
  gradingPeriod: GradingPeriod;
  status: ClassRecordStatus;
  revision?: number;
  rosterConfirmedAt?: string | null;
  policyExclusionReason?: string | null;
  policyExcludedAt?: string | null;
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
  examComponent?: "ST1" | "ST2" | "TE" | null;
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
    examComponent?: "ST1" | "ST2" | "TE" | null;
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
    bonusPoints?: number[];
    bonusReasons?: (string | null)[];
    effectiveScores?: (number | null)[];
    scorePercents?: (number | null)[];
    scoreStatuses?: ("recorded" | "excused" | "missing")[];
    scoreReasons?: (string | null)[];
    total: number | null;
    ps: number | null;
    ws: number | null;
  }[];
  initialGrade: number | null;
  quarterlyGrade: number | null;
  remarks?: "Passed" | "For Intervention" | "Incomplete" | "Not graded";
  eligibility?: PeriodEligibility | null;
  provisional?: boolean;
  gradeProvenance?: "verified_revision" | "legacy_unverified" | "provisional";
  blockers?: AcademicBlocker[];
  isRemoved?: boolean;
  enrollmentState?: "active" | "removed";
}

export interface SpreadsheetData {
  classRecord: ClassRecord;
  policy: AcademicPolicy;
  academicCapabilities: AcademicCapabilities;
  canReopen: boolean;
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

export type ClassRecordSlotStatus =
  | "empty"
  | "manual"
  | "linked_self"
  | "linked_other";

export interface ClassRecordSlotOverviewItem {
  itemId: string;
  title: string;
  order: number;
  maxScore: number;
  assessmentId: string | null;
  assessmentTitle: string | null;
  scoreCount: number;
  status: ClassRecordSlotStatus;
  isSelectable: boolean;
}

export interface ClassRecordSlotOverviewCategory {
  id: string;
  key: "written_work" | "performance_task" | "quarterly_assessment";
  label: string;
  slots: ClassRecordSlotOverviewItem[];
}

export interface ClassRecordSlotOverview {
  classRecordId: string;
  gradingPeriod: GradingPeriod;
  status: ClassRecordStatus;
  categories: ClassRecordSlotOverviewCategory[];
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

export interface TransmutationBand {
  minInitialGrade: number;
  maxInitialGrade: number;
  transmutedGrade: number;
}

export interface TransmutationTableRecord {
  id: string;
  title: string;
  description?: string;
  isActive: boolean;
  isSystemDefault?: boolean;
  bands: TransmutationBand[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TransmutationPreviewResult {
  title: string;
  filename: string;
  bandCount: number;
  isValid: boolean;
  validationMessage?: string;
  bands: TransmutationBand[];
}
