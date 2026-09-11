export type AdminDemoModeState =
  "unavailable" | "disabled" | "active" | "expired";

export type AdminDemoModeRelaxedRuleCode =
  | "user_lifecycle_sequence"
  | "class_membership_window"
  | "section_membership_window"
  | "section_capacity"
  | "schedule_collision"
  | "room_adviser_exclusivity"
  | "archive_active_memberships"
  | "restore_archived_class"
  | "admin_academic_window"
  | "governed_execution_availability";

export type AdminDemoModeProtectedRuleCode =
  | "authentication_and_rbac"
  | "self_account_protection"
  | "dto_and_content_validation"
  | "unique_user_and_academic_identity"
  | "referential_integrity"
  | "academic_transaction_lock"
  | "finalized_and_locked_workbooks"
  | "attempt_and_returned_grade_history"
  | "score_and_percentage_invariants"
  | "append_only_lifecycle_and_audit"
  | "evidence_aware_permanent_deletion"
  | "ai_non_authority";

export type AdminDemoModeRule = {
  code: AdminDemoModeRelaxedRuleCode | AdminDemoModeProtectedRuleCode;
  label: string;
  description: string;
};

export type AdminDemoModeStatus = {
  available: boolean;
  active: boolean;
  state: AdminDemoModeState;
  version: number;
  serverTime: string;
  activatedAt: string | null;
  expiresAt: string | null;
  reason: string | null;
  activatedBy: { id: string; displayName: string } | null;
  relaxedRules: AdminDemoModeRule[];
  protectedRules: AdminDemoModeRule[];
};

export const ADMIN_DEMO_MODE_ACKNOWLEDGEMENTS = [
  "SHARED_DATA_CAN_CHANGE",
  "ACTIONS_REMAIN_AUDITED",
  "HARD_SAFEGUARDS_REMAIN",
] as const;

export type AdminDemoModeAcknowledgement =
  (typeof ADMIN_DEMO_MODE_ACKNOWLEDGEMENTS)[number];

export type ActivateAdminDemoMode = {
  currentPassword: string;
  confirmation: "ENABLE DEMO MODE";
  reason: string;
  durationMinutes: 15 | 30 | 60 | 120;
  expectedVersion: number;
  acknowledgements: AdminDemoModeAcknowledgement[];
};

export type DeactivateAdminDemoMode = {
  confirmation: "DISABLE DEMO MODE";
  expectedVersion: number;
};

export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export function hasAdminDemoModeRule(
  status: AdminDemoModeStatus | null | undefined,
  code: AdminDemoModeRelaxedRuleCode,
) {
  return Boolean(
    status?.active && status.relaxedRules.some((rule) => rule.code === code),
  );
}
