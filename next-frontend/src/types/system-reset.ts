import type { AcademicPolicy } from "./academic-grading";

export type ResetPeriodKey = "Q1" | "Q2" | "Q3" | "Q4" | "T1" | "T2" | "T3";
export type ResetAcademicPolicy = Omit<AcademicPolicy, "periods"> & {
  periods: Array<{ key: ResetPeriodKey; label: string }>;
};
export type ResetEnvelope<T> = { success: boolean; message: string; data: T };
export type ResetActor = { id: string; email: string; displayName: string };
export interface ResetCapability {
  available: boolean;
  environment: string;
  blockers: Array<{ code: string; message: string }>;
  active: boolean;
  operationId: string | null;
  phase: string | null;
  retainedAdmin: ResetActor;
  acknowledgements: Array<{ code: string; label: string }>;
}
export interface ResetPreview {
  actor: ResetActor;
  environment: string;
  schoolYear: string;
  period: ResetPeriodKey;
  policy: ResetAcademicPolicy;
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
export interface ExecuteSystemReset {
  previewToken: string;
  idempotencyKey: string;
  reason: string;
  currentPassword: string;
  confirmation: string;
  acknowledgements: string[];
}
export interface ResetPublicStatus {
  active: boolean;
  operationId: string | null;
  phase: string | null;
  status: "idle" | "running" | "completed" | "aborted";
  retrying: boolean;
}
export interface ResetOperation {
  operationId: string;
  phase: string;
  status: "running" | "completed" | "aborted";
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  failureCode: string | null;
  retrying: boolean;
  schoolYear: string;
  period: ResetPeriodKey;
}
