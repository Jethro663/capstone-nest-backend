/** Backend-owned academic contracts. Mirror in mobile/src/types/academic-grading.ts. */
export type AcademicPeriodKey = "Q1" | "Q2" | "Q3" | "Q4";
export interface AcademicPeriod {
  key: AcademicPeriodKey;
  label: string;
}
export interface AcademicPolicy {
  id: string;
  schoolYear: string;
  periods: AcademicPeriod[];
  gradeMethod: "legacy_transmutation" | "adjusted_2026" | "zero_based";
  passingGrade: number;
  conditionalPromotion: boolean;
  annualRounding: "half_up";
  examComponents: Array<{ key: "ST1" | "ST2" | "TE"; weight: number }>;
  transmutationBands: Array<{
    minInitialGrade: number;
    transmutedGrade: number;
  }>;
}
export interface AcademicCapabilities {
  schoolYear: string;
  period: AcademicPeriodKey | null;
  periodLabel: string;
  periods: AcademicPeriod[];
  policyId: string;
  activeSchoolYear: string;
  activePeriod: AcademicPeriodKey;
  canPrepare: boolean;
  canRelease: boolean;
  canView: boolean;
  canStart: boolean;
  canContinue: boolean;
  canGrade: boolean;
  workbookStatus: string | null;
  readOnlyReason: string | null;
}
export interface AcademicBlocker {
  code: string;
  message: string;
  studentId?: string;
  classId?: string;
  sectionId?: string;
  classRecordId?: string;
  teacherId?: string | null;
  itemId?: string;
  categoryId?: string;
  period?: AcademicPeriodKey;
  subjectCode?: string;
  sourceIds?: string[];
}
export type PeriodEligibility =
  | "eligible"
  | "not_enrolled"
  | "transferred"
  | "withdrawn";
export interface PeriodRosterParticipant {
  studentId: string;
  firstName: string | null;
  lastName: string | null;
  eligibility: PeriodEligibility | null;
  reason: string | null;
  source: string | null;
  currentlyEnrolled: boolean;
}
export interface PeriodRoster {
  classRecordId: string;
  confirmedAt: string | null;
  confirmedBy: string | null;
  participants: PeriodRosterParticipant[];
}
export interface ConfirmPeriodRoster {
  reason: string;
  participants: Array<{
    studentId: string;
    eligibility: PeriodEligibility;
    reason?: string;
  }>;
}
export interface PeriodReadiness {
  ready: boolean;
  classRecordId: string;
  classId: string;
  period: AcademicPeriodKey;
  eligibleStudentIds: string[];
  blockers: AcademicBlocker[];
  counts: Record<string, number>;
}
export interface PeriodGradePreview {
  classRecordId: string;
  readiness: PeriodReadiness;
  preview: Array<{
    studentId: string;
    initialGrade: number;
    quarterlyGrade: number;
    remarks: "Passed" | "For Intervention";
    categoryBreakdown: Array<{
      categoryId: string;
      categoryName: string;
      weightPercentage: number;
      totalRaw: number;
      totalHPS: number;
      percentageScore: number;
      weightedScore: number;
    }>;
  }>;
  interventionCount: number;
}
export interface AnnualComponent {
  period: AcademicPeriodKey;
  grade: number;
  sourceType: "period_revision" | "external";
  sourceId: string;
  classId: string | null;
}
export interface AnnualGrade {
  id: string;
  studentId: string;
  schoolYear: string;
  subjectCode: string;
  gradeLevel: string;
  components: AnnualComponent[];
  policy: AcademicPolicy;
  sum: number;
  divisor: number;
  rawAverage: string;
  officialGrade: number;
  remarks: "Passed" | "Failed";
  isCurrent: boolean;
  sourceFingerprint: string;
  computedAt: string;
  invalidationReason: string | null;
}
export interface RemediationResult {
  id: string;
  annualGradeId: string;
  remedialClassMark: number;
  rawRecomputedGrade: string;
  recomputedGrade: number;
  sourceReference: string;
  reason: string;
  isCurrent: boolean;
  recordedAt: string;
}
export interface AnnualStudent {
  studentId: string;
  firstName: string | null;
  lastName: string | null;
  components: AnnualComponent[];
  candidates: Array<{
    id: string;
    period: AcademicPeriodKey;
    grade: number;
    sourceType: "period_revision" | "external";
    classId: string | null;
    trusted: boolean;
  }>;
  selections: Array<{
    period: AcademicPeriodKey;
    sourceId: string;
    sourceType: "period_revision" | "external";
  }>;
  blockers: AcademicBlocker[];
  current: AnnualGrade | null;
  history: AnnualGrade[];
  remediation: RemediationResult[];
}
export interface AnnualSummary {
  classId: string;
  schoolYear: string;
  subjectCode: string;
  gradeLevel: string;
  policy: AcademicPolicy;
  periods: AcademicPeriod[];
  students: AnnualStudent[];
}
export interface PeriodHistory {
  revisions: Array<{
    id: string;
    studentId: string;
    revision: number;
    period: AcademicPeriodKey;
    grade: number;
    trusted: boolean;
    isCurrent: boolean;
    computedAt: string;
    evidence: Record<string, unknown>;
  }>;
  legacyEvidence: Array<{
    id: string;
    studentId: string;
    period: AcademicPeriodKey;
    sourceSnapshot: Record<string, unknown>;
    archivedAt: string;
  }>;
}
export type AcademicOutcome =
  | "incomplete"
  | "promoted"
  | "retained"
  | "graduated"
  | "pending_remediation"
  | "conditionally_promoted"
  | "pending_completion";
export interface AcademicReadiness {
  policy: AcademicPolicy;
  schoolYear: string;
  activePeriod: AcademicPeriodKey;
  version: number;
  transitionBlocked: boolean;
  message: string | null;
  blockers: AcademicBlocker[];
  activeStudentsInCurrentYear: number;
  studentsMissingFinalizedGrades: number;
  studentsToPromote: number;
  studentsToRetain: number;
  studentsToGraduate: number;
  studentsToConditionallyPromote: number;
  studentsPendingCompletion: number;
  expectedPeriodRecords: number;
  finalizedPeriodRecords: number;
  expectedAnnualGrades: number;
  classReadiness: Array<{
    classId: string;
    sectionId: string;
    subjectName: string;
    subjectCode: string;
    teacherId: string | null;
    expectedPeriodRecords: number;
    finalizedPeriodRecords: number;
  }>;
  studentOutcomes: Array<{
    studentId: string;
    sourceGradeLevel: string;
    targetGradeLevel: string | null;
    outcome: AcademicOutcome;
    annualGradeIds: string[];
    remediationResultIds: string[];
    backSubjectIds: string[];
  }>;
}
export interface AcademicAudit {
  schoolYear: string | null;
  generatedAt: string;
  readOnly: true;
  states: Array<{
    id: string;
    schoolYear: string;
    quarter: AcademicPeriodKey;
    version: number;
    updatedAt: string;
  }>;
  policies: AcademicPolicy[];
  counts: {
    classes: number;
    records: number;
    legacyEvidenceRows: number;
    unarchivedLegacyGrades: number;
    blockers: number;
    review: number;
  };
  issues: Array<
    AcademicBlocker & {
      severity: "blocker" | "review" | "acknowledged";
      schoolYear?: string;
      assessmentId?: string;
      repairAction?: string;
    }
  >;
}
export interface BackSubject {
  id: string;
  student?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  studentId: string;
  subjectCode: string;
  sourceSchoolYear: string;
  gradeLevel: string;
  status: "pending" | "scheduled" | "cleared" | "invalidated";
  scheduledSchoolYear: string | null;
  scheduledPeriod: AcademicPeriodKey | null;
  clearedGrade: number | null;
  history: Array<{
    id: string;
    action: string;
    evidence: Record<string, unknown>;
    createdAt: string;
  }>;
}
export interface Grade10Completion {
  id: string;
  schoolYear: string;
  studentId: string;
  outcome: "pending_completion";
  student?: { id: string; firstName: string | null; lastName: string | null };
  completion: {
    id: string;
    recordedAt: string;
    evidence: Record<string, unknown>;
  } | null;
}
