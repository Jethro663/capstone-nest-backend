import {
  teacherMountedDrawerRouteNames,
  teacherMountedStackRouteNames,
  teacherParityRouteInventory,
  teacherParityRouteInventoryNames,
  teacherWebParityMappings,
} from "../screen-flow";
import {
  teacherDrawerRouteNames,
  teacherParityRouteNames,
  teacherRouteManifest,
  teacherStackRouteNames,
} from "../../navigation/teacher-route-manifest";
import type { MainTabParamList, RootStackParamList } from "../../navigation/types";

describe("teacher parity navigation", () => {
  it("owns every teacher primary workspace through the drawer manifest", () => {
    expect(teacherRouteManifest.drawer).toEqual([
      "Home",
      "Classes",
      "Sections",
      "Assessments",
      "TeacherCalendar",
      "TeacherLessons",
      "TeacherLibrary",
      "TeacherClassRecord",
      "TeacherAnnouncements",
      "TeacherReports",
      "TeacherInterventions",
      "TeacherPerformance",
      "TeacherEvaluations",
      "Profile",
    ]);
    expect(teacherStackRouteNames).not.toContain("TeacherCalendar");
    expect(teacherStackRouteNames).not.toContain("TeacherAnnouncements");
  });

  it("keeps the required teacher route set typed across tabs and stack routes", () => {
    const drawerRoutes: ReadonlyArray<keyof MainTabParamList> = teacherDrawerRouteNames;
    const stackRoutes: ReadonlyArray<keyof RootStackParamList> = teacherStackRouteNames;

    expect(drawerRoutes).toEqual(teacherMountedDrawerRouteNames);
    expect(stackRoutes).toEqual(teacherMountedStackRouteNames);
    expect(teacherParityRouteNames).toEqual([...teacherDrawerRouteNames, ...teacherStackRouteNames]);
    expect(teacherParityRouteInventory.map((route) => route.name)).toEqual(teacherParityRouteInventoryNames);
  });

  it("maps every current teacher web surface to a mobile route", () => {
    const webRoutes = teacherWebParityMappings.map((entry) => entry.web);
    expect(webRoutes).toEqual([
      "/dashboard/teacher",
      "/dashboard/teacher/classes",
      "/dashboard/teacher/classes/[id]",
      "/dashboard/teacher/classes/[id]/ai-draft",
      "/dashboard/teacher/classes/[id]/modules/[moduleId]",
      "/dashboard/teacher/classes/[id]/modules/[moduleId]/files/[fileId]",
      "/dashboard/teacher/classes/[id]/students/add",
      "/dashboard/teacher/classes/[id]/students/[studentId]",
      "/dashboard/teacher/sections",
      "/dashboard/teacher/sections/[id]/roster",
      "/dashboard/teacher/sections/[id]/students/add",
      "/dashboard/teacher/sections/[id]/students/[studentId]",
      "/dashboard/teacher/assessments",
      "/dashboard/teacher/assessments/[id]",
      "/dashboard/teacher/assessments/[id]/edit",
      "/dashboard/teacher/assessments/[id]/results/[attemptId]",
      "/dashboard/teacher/lessons",
      "/dashboard/teacher/lessons/[id]/view",
      "/dashboard/teacher/lessons/[id]/edit",
      "/dashboard/teacher/library",
      "/dashboard/teacher/calendar",
      "/dashboard/teacher/announcements",
      "/dashboard/teacher/class-record",
      "/dashboard/teacher/performance",
      "/dashboard/teacher/interventions",
      "/dashboard/teacher/interventions/[caseId]",
      "/dashboard/teacher/evaluations",
      "/dashboard/teacher/reports",
      "/dashboard/teacher/profile",
      "/dashboard/teacher/extractions/[id]",
    ]);

    const mountedRoutes = new Set<string>([...teacherDrawerRouteNames, ...teacherStackRouteNames]);
    for (const mapping of teacherWebParityMappings) {
      expect(mountedRoutes.has(mapping.mobile)).toBe(true);
    }
  });
});
