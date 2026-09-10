export type AcademicPeriodKey = "Q1" | "Q2" | "Q3" | "Q4";

export interface AdminLifecycleBlocker {
  code: string;
  message: string;
  resolvable: boolean;
  resolutionOptions?: string[];
}

export interface AdminLifecycleEffect {
  kind: "insert" | "update" | "archive" | "purge" | "preserve";
  entityType: string;
  entityId: string;
  summary: string;
  details?: Record<string, unknown>;
}

export interface AdminLifecycleManifest {
  schemaVersion: 1;
  action:
    | "STUDENT_RESOLUTION"
    | "ARCHIVE_CLASS"
    | "ARCHIVE_SECTION"
    | "PURGE_CLASS"
    | "PURGE_SECTION";
  targetType: string;
  targetId: string;
  request: Record<string, unknown>;
  academicState: { schoolYear: string; period: string; version: number };
  effects: AdminLifecycleEffect[];
  preserved: string[];
  evidence: Record<string, number>;
  blockers: AdminLifecycleBlocker[];
  warnings: Array<{ code: string; message: string }>;
  requiredConfirmations: string[];
  generatedAt: string;
  expiresAt: string;
  safeToExecute: boolean;
  manifestHash: string;
}

export interface AdminLifecyclePreview {
  manifest: AdminLifecycleManifest;
  snapshot?: Record<string, unknown>;
  plan?: Record<string, unknown>;
}

export interface AdminLifecycleExecutionEvidence {
  manifestHash: string;
  manifestExpiresAt: string;
  currentPassword: string;
  reasonCode:
    | "ERRONEOUS_ENROLLMENT"
    | "TRANSFERRED_SECTION"
    | "TRANSFERRED_CLASS"
    | "TRANSFERRED_SCHOOL"
    | "WITHDREW"
    | "COMPLETED"
    | "DUPLICATE_CLASS"
    | "CURRICULUM_CORRECTION"
    | "TEST_OR_EMPTY_RECORD"
    | "OTHER";
  notes: string;
  confirmations: string[];
  idempotencyKey: string;
}

export interface AdminLifecycleExecutionResult {
  operationId: string;
  action: AdminLifecycleManifest["action"];
  targetType: string;
  targetId: string;
  replayed: boolean;
  changed: Array<{ entityType: string; entityId: string; outcome: string }>;
  preserved: string[];
  auditLogId?: string;
}

export interface AdminLifecycleResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export type StudentLifecycleResolution =
  "CORRECT_ENROLLMENT" | "WITHDRAW" | "TRANSFER_SECTION" | "TRANSFER_CLASS";

export type ClassLifecycleResolution =
  "ARCHIVE_EMPTY" | "COMPLETE" | "DROP" | "TRANSFER";

export interface PreviewStudentLifecycleInput {
  studentId: string;
  sectionId: string;
  resolution: StudentLifecycleResolution;
  classId?: string;
  destinationSectionId?: string;
  destinationClassId?: string;
  effectivePeriod: AcademicPeriodKey;
}

export interface PreviewClassLifecycleInput {
  classId: string;
  resolution: ClassLifecycleResolution;
  replacementClassId?: string;
  effectivePeriod: AcademicPeriodKey;
}

export interface PreviewSectionLifecycleInput {
  sectionId: string;
  effectivePeriod: AcademicPeriodKey;
  studentResolutions: Array<{
    studentId: string;
    resolution: "WITHDRAW" | "TRANSFER_SECTION" | "COMPLETE";
    destinationSectionId?: string;
  }>;
}

export interface PreviewPurgeLifecycleInput {
  targetType: "CLASS" | "SECTION";
  targetId: string;
}
