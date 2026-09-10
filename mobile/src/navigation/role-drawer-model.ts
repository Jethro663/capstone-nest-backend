import type { ComponentProps } from "react";
import type { MaterialCommunityIcons } from "@expo/vector-icons";
import type { MainTabParamList, RootStackParamList } from "./types";

export type RoleDrawerRole = "student" | "teacher" | "admin";
export type RoleDrawerIcon = ComponentProps<typeof MaterialCommunityIcons>["name"];
export type RoleDrawerRoute = keyof MainTabParamList | keyof RootStackParamList;

export type RoleDrawerDestination = {
  label: string;
  route: RoleDrawerRoute;
  kind: "tab" | "stack";
  icon: RoleDrawerIcon;
};

export type RoleDrawerGroup = {
  label: string;
  items: readonly RoleDrawerDestination[];
};

export const ROLE_DRAWER_GROUPS = {
  teacher: [
    {
      label: "Teaching",
      items: [
        { label: "Home", route: "Home", kind: "tab", icon: "home-outline" },
        { label: "My Classes", route: "Classes", kind: "tab", icon: "book-open-variant-outline" },
        { label: "My Sections", route: "Sections", kind: "tab", icon: "account-group-outline" },
        { label: "Assessments", route: "Assessments", kind: "tab", icon: "clipboard-text-outline" },
        { label: "Calendar", route: "TeacherCalendar", kind: "tab", icon: "calendar-month-outline" },
      ],
    },
    {
      label: "Content & records",
      items: [
        { label: "Lessons", route: "TeacherLessons", kind: "tab", icon: "book-education-outline" },
        { label: "Nexora Library", route: "TeacherLibrary", kind: "tab", icon: "bookshelf" },
        { label: "Class Record", route: "TeacherClassRecord", kind: "tab", icon: "table-large" },
        { label: "Announcements", route: "TeacherAnnouncements", kind: "tab", icon: "bullhorn-outline" },
      ],
    },
    {
      label: "Insights & support",
      items: [
        { label: "Reports", route: "TeacherReports", kind: "tab", icon: "file-chart-outline" },
        { label: "Interventions", route: "TeacherInterventions", kind: "tab", icon: "account-heart-outline" },
        { label: "Performance", route: "TeacherPerformance", kind: "tab", icon: "chart-line" },
        { label: "Evaluations", route: "TeacherEvaluations", kind: "tab", icon: "clipboard-check-outline" },
      ],
    },
  ],
  student: [
    {
      label: "Learning",
      items: [
        { label: "Home", route: "Dashboard", kind: "tab", icon: "home-outline" },
        { label: "My Classes", route: "Classes", kind: "tab", icon: "book-open-variant-outline" },
        { label: "Assessments", route: "Assessments", kind: "tab", icon: "clipboard-text-outline" },
        { label: "Calendar", route: "StudentCalendar", kind: "tab", icon: "calendar-month-outline" },
        { label: "JA", route: "JA", kind: "tab", icon: "creation-outline" },
        { label: "Announcements", route: "Announcements", kind: "tab", icon: "bullhorn-outline" },
      ],
    },
  ],
  admin: [
    {
      label: "Overview",
      items: [
        { label: "Home", route: "Home", kind: "tab", icon: "home-outline" },
      ],
    },
    {
      label: "People & learning",
      items: [
        { label: "Users", route: "AdminUsers", kind: "tab", icon: "account-multiple-outline" },
        { label: "Classes & sections", route: "Classes", kind: "tab", icon: "book-open-variant-outline" },
        { label: "Roster import", route: "AdminRoster", kind: "tab", icon: "account-arrow-right-outline" },
        { label: "Assessments", route: "Assessments", kind: "tab", icon: "clipboard-text-outline" },
        { label: "Announcements", route: "AdminAnnouncements", kind: "tab", icon: "bullhorn-outline" },
        { label: "Evaluations", route: "AdminEvaluations", kind: "tab", icon: "clipboard-check-outline" },
      ],
    },
    {
      label: "School operations",
      items: [
        { label: "Academic", route: "Academic", kind: "tab", icon: "school-outline" },
        { label: "Calendar", route: "AdminCalendar", kind: "tab", icon: "calendar-month-outline" },
        { label: "Class templates", route: "AdminTemplates", kind: "tab", icon: "content-copy" },
        { label: "Library", route: "AdminLibrary", kind: "tab", icon: "folder-open-outline" },
      ],
    },
    {
      label: "Oversight",
      items: [
        { label: "Reports", route: "AdminReports", kind: "tab", icon: "chart-box-outline" },
        { label: "Audit log", route: "AdminAudit", kind: "tab", icon: "shield-star-outline" },
        { label: "Diagnostics", route: "AdminDiagnostics", kind: "tab", icon: "heart-pulse" },
        { label: "System settings", route: "AdminSettings", kind: "tab", icon: "cog-outline" },
      ],
    },
  ],
} as const satisfies Record<RoleDrawerRole, readonly RoleDrawerGroup[]>;

export const ROLE_DRAWER_PROFILE_DESTINATION = {
  label: "Profile",
  route: "Profile",
  kind: "tab",
  icon: "account-circle-outline",
} as const satisfies RoleDrawerDestination;

export function flattenRoleDrawerDestinations(role: RoleDrawerRole): RoleDrawerDestination[] {
  const groups: readonly RoleDrawerGroup[] = ROLE_DRAWER_GROUPS[role];
  return groups.flatMap((group) => group.items);
}
