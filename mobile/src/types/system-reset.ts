import type { AcademicPolicy } from "./academic-grading";

export type ResetPeriodKey = "Q1" | "Q2" | "Q3" | "Q4" | "T1" | "T2" | "T3";
export type ResetPolicy = Omit<AcademicPolicy, "periods"> & {
  periods: Array<{ key: ResetPeriodKey; label: string }>;
};
export interface ResetCapability {
  available: boolean;
  environment: string;
  blockers: Array<{ code: string; message: string }>;
  active: boolean;
  operationId: string | null;
  phase: string | null;
  retainedAdmin: { id: string; email: string; displayName: string };
  acknowledgements: Array<{ code: string; label: string }>;
}
export interface ResetTarget {
  schoolYear: string;
  period: ResetPeriodKey;
}
export interface ResetPreview extends ResetTarget {
  actor: ResetCapability["retainedAdmin"];
  environment: string;
  policy: ResetPolicy;
  schemaHash: string;
  counts: Record<string, number>;
  external: Record<string, unknown>;
  epoch: number;
  catalogVersion: number;
  generatedAt: string;
  expiresAt: string;
  confirmation: string;
  previewToken: string;
  tables: Array<{
    name: string;
    action: "preserve" | "clear" | "archive" | "administrator" | "initialize";
    group: string;
    count: number;
  }>;
}
export interface ResetConfirmation {
  reason: string;
  currentPassword: string;
  confirmation: string;
  acknowledgements: string[];
}
export interface ExecuteReset extends ResetConfirmation {
  previewToken: string;
  idempotencyKey: string;
}
export interface ResetAccepted {
  operationId: string;
  phase: string;
  status: "running";
  acceptedAt: string;
}
export interface ResetMaintenance {
  active: boolean;
  operationId: string | null;
  phase: string | null;
  status: "idle" | "running" | "completed" | "aborted";
  retrying: boolean;
}
export interface ResetOperation
  extends Omit<ResetMaintenance, "active" | "operationId">, ResetTarget {
  operationId: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  failureCode: string | null;
}
export interface ResetResponse<T> {
  success: true;
  message: string;
  data: T;
}

export const RESET_ACKNOWLEDGEMENTS = [
  "OTHER_ACCOUNTS_REMOVED",
  "SCHOOL_CONTENT_REMOVED",
  "FILES_AND_INDEXES_REMOVED",
  "AUDIT_AND_SETTINGS_RETAINED",
  "SIGN_IN_AGAIN",
] as const;
