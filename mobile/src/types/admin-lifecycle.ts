export type AcademicPeriodKey = "Q1" | "Q2" | "Q3" | "Q4";
export type AdminLifecycleMode = "CURRENT_CLOSURE" | "HISTORICAL_RETIREMENT";

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

export type AdminMaintenanceDecisionState =
  | "READY"
  | "AUTO_RESOLVABLE"
  | "NEEDS_CHOICE"
  | "OVERRIDABLE_WARNING"
  | "IMMUTABLE";

export interface AdminMaintenanceNextAction {
  id: string;
  label: string;
  kind: "REPREVIEW" | "NAVIGATE_REPAIR" | "CANCEL";
  intent?: string;
  requiredFields?: string[];
  href?: string;
}

export interface AdminMaintenanceDecisionSummary {
  state: AdminMaintenanceDecisionState;
  disposition?:
    | "EXECUTABLE"
    | "CHOICE_REQUIRED"
    | "REPAIR_REQUIRED"
    | "RETAIN_REQUIRED";
  code: string;
  message: string;
  nextActions: AdminMaintenanceNextAction[];
}

export interface AdminLifecycleManifest {
  schemaVersion: 1;
  action:
    | "STUDENT_RESOLUTION"
    | "ARCHIVE_CLASS"
    | "ARCHIVE_SECTION"
    | "PURGE_CLASS"
    | "PURGE_SECTION"
    | "PURGE_USER";
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
  decision: AdminMaintenanceDecisionSummary;
  manifestHash: string;
}

export interface AdminLifecyclePreview {
  manifest: AdminLifecycleManifest;
  snapshot?: Record<string, unknown>;
  plan?: Record<string, unknown>;
}

export type AdminLifecycleReasonCode =
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

export interface AdminLifecycleExecutionEvidence {
  manifestHash: string;
  manifestExpiresAt: string;
  currentPassword?: string;
  reasonCode: AdminLifecycleReasonCode;
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
  | "CORRECT_ENROLLMENT"
  | "CORRECT_CLASS_ENROLLMENT"
  | "WITHDRAW"
  | "TRANSFER_SECTION"
  | "TRANSFER_CLASS";
export type ClassLifecycleResolution =
  | "ARCHIVE_EMPTY"
  | "COMPLETE"
  | "DROP"
  | "TRANSFER";
export type SectionStudentResolution =
  | "WITHDRAW"
  | "TRANSFER_SECTION"
  | "COMPLETE";

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
  lifecycleMode?: AdminLifecycleMode;
  resolution?: ClassLifecycleResolution;
  replacementClassId?: string;
  effectivePeriod?: AcademicPeriodKey;
}

export interface PreviewSectionLifecycleInput {
  sectionId: string;
  lifecycleMode?: AdminLifecycleMode;
  effectivePeriod?: AcademicPeriodKey;
  studentResolutions?: Array<{
    studentId: string;
    resolution: SectionStudentResolution;
    destinationSectionId?: string;
  }>;
}

export interface PreviewPurgeLifecycleInput {
  targetType: "CLASS" | "SECTION" | "USER";
  targetId: string;
  purgeMode?: AdminPurgeMode;
}

export type AdminPurgeTargetType = "CLASS" | "SECTION" | "USER";
export type AdminPurgeMode = "EMPTY_ONLY" | "CASCADE_ERASE";

export interface AdminErasureBatchPreview {
  schemaVersion: 2;
  targetType: AdminPurgeTargetType;
  targetIds: string[];
  purgeMode: AdminPurgeMode;
  targets: Array<{
    id: string;
    displayName: string;
    lifecycleState: "ACTIVE" | "ARCHIVED" | "SOFT_DELETED" | "MISSING";
    impactGroups: Array<{
      code: string;
      label: string;
      rowCount: number;
      action: "DELETE" | "DETACH" | "PRESERVE_RECEIPT";
    }>;
    storageObjectCount: number;
    storageBytes: number | null;
  }>;
  totals: Record<string, number>;
  warnings: Array<{ code: string; message: string }>;
  blockers: AdminLifecycleBlocker[];
  canExecute: boolean;
  confirmationText: string;
  catalogVersion: number;
  databaseSchemaHash: string;
  manifestHash: string;
  manifestExpiresAt: string;
}

export interface PreviewPurgeBatchInput {
  targetType: AdminPurgeTargetType;
  targetIds: string[];
  purgeMode: AdminPurgeMode;
}

export interface ExecutePurgeBatchInput extends PreviewPurgeBatchInput {
  manifestHash: string;
  manifestExpiresAt: string;
  reasonCode: AdminLifecycleReasonCode;
  notes: string;
  confirmation: string;
  idempotencyKey: string;
}

export interface AdminErasureExecutionResult {
  operationId: string;
  status: "cleanup_pending" | "completed";
  targetType: AdminPurgeTargetType;
  targetIds: string[];
  deletedCount: number;
  cleanupStatus: "pending" | "not_required" | "completed" | "failed";
  replayed: boolean;
}

export type ExecuteLifecycleInput<T> = T & AdminLifecycleExecutionEvidence;
