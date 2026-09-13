export type AdminMaintenanceState =
  | "unavailable"
  | "inactive"
  | "active"
  | "expired";

export type AdminMaintenanceScopeCode =
  | "ACADEMIC_STRUCTURE"
  | "ROSTER"
  | "ACCOUNT_LIFECYCLE";

export type AdminMaintenanceRuleCode =
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

export type AdminMaintenanceRule = {
  code: string;
  label: string;
  description: string;
};

export type AdminMaintenanceStatus = {
  available: boolean;
  active: boolean;
  state: AdminMaintenanceState;
  sessionId: string | null;
  serverTime: string;
  startedAt: string | null;
  expiresAt: string | null;
  reason: string | null;
  scopeCodes: AdminMaintenanceScopeCode[];
  rules: AdminMaintenanceRule[];
  protectedRules: AdminMaintenanceRule[];
};

export const ADMIN_MAINTENANCE_ACKNOWLEDGEMENTS = [
  "LIVE_ACADEMIC_STRUCTURE_CAN_CHANGE",
  "FINALIZED_AND_AUDIT_EVIDENCE_STAYS_PROTECTED",
] as const;

export type AdminMaintenanceAcknowledgement =
  (typeof ADMIN_MAINTENANCE_ACKNOWLEDGEMENTS)[number];

export type OpenAdminMaintenanceSession = {
  currentPassword: string;
  confirmation: "OPEN MAINTENANCE ACCESS";
  reason: string;
  acknowledgements: AdminMaintenanceAcknowledgement[];
};

export type AdminMaintenanceResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export function hasAdminMaintenanceRule(
  status: AdminMaintenanceStatus | null | undefined,
  code: AdminMaintenanceRuleCode,
) {
  return Boolean(
    status?.active && status.rules?.some((rule) => rule.code === code),
  );
}
