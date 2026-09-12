import type {
  AdminToolSection,
  MainTabParamList,
  RootStackParamList,
} from "./types";

export const adminSettingsTaskRoutes = {
  resetSchoolData: "AdminSettingsResetSchoolData",
} as const satisfies Record<string, keyof RootStackParamList>;

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
  AdminClassRecord: "records",
  AdminUserReports: "userReports",
  AdminChatbot: "chatbot",
} as const satisfies Partial<Record<keyof MainTabParamList, AdminToolSection>>;

export type AdminToolRouteName = keyof typeof adminToolRouteMap;

export const adminDrawerRouteNames = [
  "Home",
  "AdminDiagnostics",
  "AdminUsers",
  "AdminSections",
  "AdminClasses",
  "AdminCalendar",
  "AdminRoster",
  "AdminClassRecord",
  "AdminUserReports",
  "AdminLibrary",
  "AdminAnnouncements",
  "AdminReports",
  "AdminEvaluations",
  "AdminChatbot",
  "AdminAudit",
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

export function legacyAdminRouteForSection(
  section: AdminToolSection,
): keyof MainTabParamList {
  const routes: Record<AdminToolSection, keyof MainTabParamList> = {
    users: "AdminUsers",
    evaluations: "AdminEvaluations",
    calendar: "AdminCalendar",
    library: "AdminLibrary",
    reports: "AdminReports",
    audit: "AdminAudit",
    diagnostics: "AdminDiagnostics",
    roster: "AdminRoster",
    templates: "AdminTemplates",
    settings: "AdminSettings",
    records: "AdminClassRecord",
    userReports: "AdminUserReports",
    chatbot: "AdminChatbot",
  };
  return routes[section];
}
