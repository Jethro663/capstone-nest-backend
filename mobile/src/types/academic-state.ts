import type {
  AcademicPolicy,
  AcademicPeriod,
  AcademicReadiness,
} from "./academic-grading";
export type AcademicQuarter = "Q1" | "Q2" | "Q3" | "Q4";

export interface AcademicStateSnapshot {
  schoolYear: string;
  quarter: AcademicQuarter;
}

export interface AcademicStateCurrent extends AcademicStateSnapshot {
  id: string;
  version: number;
  policy: AcademicPolicy;
  periods: AcademicPeriod[];
  updatedAt: string;
  updatedBy?: string | null;
  transitionConfirmationText: string;
}

export interface AcademicStateImpactPreview {
  current: AcademicStateSnapshot & { version: number };
  target: AcademicStateSnapshot;
  impact: {
    classRecordsToFinalize: number;
    enrollmentsToComplete: number;
    classesToArchive: number;
    sectionsToArchive: number;
    schoolEventsToArchive: number;
    reusableSectionsToCreate: number;
    reusableClassesToCreate: number;
    promotionReadiness: AcademicReadiness;
  };
  transitionConfirmationText: string;
}

export interface AcademicActivationPreview {
  state: AcademicStateCurrent;
  target: AcademicPeriod;
  overrideRequired: boolean;
  alreadyActive: boolean;
  currentOpenRecords: number;
  targetMissingRecords: number;
  ongoingAttempts: number;
  details: Array<{
    classId: string;
    subjectName: string;
    teacherId: string | null;
    currentStatus: string;
    targetStatus: string;
  }>;
  message: string;
}
export interface ActivateAcademicPeriod {
  expectedSchoolYear: string;
  expectedQuarter: AcademicQuarter;
  expectedVersion: number;
  targetQuarter: AcademicQuarter;
  currentPassword: string;
  requestId: string;
  override?: boolean;
  reason?: string;
}
