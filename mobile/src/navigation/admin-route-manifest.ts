import type { AdminToolSection, MainTabParamList } from "./types";

export const adminToolRouteMap = {
  AdminUsers: "users",
  AdminRoster: "roster",
  AdminEvaluations: "evaluations",
  AdminCalendar: "calendar",
  AdminTemplates: "templates",
  AdminLibrary: "library",
  AdminReports: "reports",
  AdminAudit: "audit",
  AdminDiagnostics: "diagnostics",
  AdminSettings: "settings",
} as const satisfies Partial<Record<keyof MainTabParamList, AdminToolSection>>;

export type AdminToolRouteName = keyof typeof adminToolRouteMap;

export const adminDrawerRouteNames = [
  "Home",
  "AdminUsers",
  "Classes",
  "AdminRoster",
  "Assessments",
  "AdminAnnouncements",
  "AdminEvaluations",
  "Academic",
  "AdminCalendar",
  "AdminTemplates",
  "AdminLibrary",
  "AdminReports",
  "AdminAudit",
  "AdminDiagnostics",
  "AdminSettings",
  "Profile",
] as const satisfies readonly (keyof MainTabParamList)[];

export type AdminDrawerRouteName = (typeof adminDrawerRouteNames)[number];

export function adminToolForRoute(
  routeName: string,
  explicitSection?: AdminToolSection,
): AdminToolSection {
  if (explicitSection) return explicitSection;
  return adminToolRouteMap[routeName as AdminToolRouteName] ?? "users";
}
