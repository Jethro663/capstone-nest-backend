import type { RootStackParamList } from "../../navigation/types";

export type AdminLifecycleRepairRoute = Extract<
  keyof RootStackParamList,
  | "AdminSettingsYearTransition"
  | "AdminSettingsAuditRecovery"
  | "AdminSettingsMaintenance"
>;

const repairRoutes: Record<string, AdminLifecycleRepairRoute> = {
  "/dashboard/admin/system-settings/year-transition":
    "AdminSettingsYearTransition",
  "/dashboard/admin/system-settings/audit-recovery":
    "AdminSettingsAuditRecovery",
  "/dashboard/admin/system-settings/maintenance-access":
    "AdminSettingsMaintenance",
};

export function repairRouteForHref(
  href: string,
): AdminLifecycleRepairRoute | null {
  return repairRoutes[href.replace(/\/+$/, "")] ?? null;
}
