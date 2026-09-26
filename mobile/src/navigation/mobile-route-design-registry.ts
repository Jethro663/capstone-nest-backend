import { adminDrawerRouteNames } from "./admin-route-manifest";
import { studentParityRouteNames } from "./student-route-manifest";
import { teacherParityRouteNames } from "./teacher-route-manifest";

export type MobileDesignRole = "student" | "teacher" | "admin";
export type MobileDesignStatus = "legacy" | "partial" | "migrated" | "accepted";

export type MobileRouteDesignEntry = {
  role: MobileDesignRole;
  route: string;
  ownerComponent: string;
  generation: string;
  status: MobileDesignStatus;
  preservedBehaviors: readonly string[];
  evidence: readonly string[];
  reviewedRevision: string;
  reviewedDate: string;
  knownResidue?: string;
};

const auditRevision = "0ea3122212cdd14053fba70d4e50b2d1f6b7a9a9";
const auditDate = "2026-09-18";
const reviewedRevision =
  process.env.EXPO_PUBLIC_SOURCE_REVISION?.trim() || auditRevision;
const sourceMigrationEvidence = [
  "screens/__tests__/design-generation-contract.test.ts",
  "screens/__tests__/screen-render.test.tsx",
] as const;
const deviceAcceptancePending =
  "Source migration and focused interaction tests pass; Android and iPhone visual/accessibility acceptance remains pending.";

function routeDesign(
  role: MobileDesignRole,
  route: string,
  ownerComponent: string,
  status: MobileDesignStatus,
  generation: string,
  preservedBehaviors: readonly string[],
  knownResidue?: string,
  evidence: readonly string[] = [],
): MobileRouteDesignEntry {
  return {
    role,
    route,
    ownerComponent,
    generation,
    status,
    preservedBehaviors,
    evidence,
    reviewedRevision,
    reviewedDate: auditDate,
    ...(knownResidue ? { knownResidue } : {}),
  };
}

const studentEntries = [
  routeDesign(
    "student",
    "Dashboard",
    "DashboardScreen.tsx",
    "migrated",
    "student-guided-workbench-v2",
    ["priority routing", "notifications", "JA entry"],
  ),
  routeDesign(
    "student",
    "Classes",
    "LessonsScreen.tsx",
    "migrated",
    "student-guided-workbench-v2",
    ["class navigation", "module progress"],
  ),
  routeDesign(
    "student",
    "Assessments",
    "AssessmentsScreen.tsx",
    "migrated",
    "student-guided-workbench-v2",
    ["assessment filters", "attempt navigation"],
  ),
  routeDesign(
    "student",
    "StudentCalendar",
    "CalendarScreen.tsx",
    "migrated",
    "student-workspace-v2",
    ["event navigation", "class filtering", "offline read-only guard"],
    deviceAcceptancePending,
    sourceMigrationEvidence,
  ),
  routeDesign(
    "student",
    "JA",
    "JaScreen.tsx",
    "migrated",
    "student-guided-workbench-v2",
    ["Ask", "Replay", "Learner's Path"],
  ),
  routeDesign(
    "student",
    "Announcements",
    "AnnouncementsScreen.tsx",
    "migrated",
    "student-guided-workbench-v2",
    ["announcement detail", "read state"],
  ),
  routeDesign(
    "student",
    "StudentEvaluations",
    "StudentEvaluationsScreen.tsx",
    "migrated",
    "student-workspace-v2",
    [
      "assigned evaluation inbox",
      "deliberate zero-to-five ratings",
      "teacher and system evaluation submission",
      "drawer and tab history",
    ],
    deviceAcceptancePending,
    [
      "screens/__tests__/student-evaluations.test.tsx",
      "navigation/__tests__/role-drawer-integration.test.ts",
      ...sourceMigrationEvidence,
    ],
  ),
  routeDesign(
    "student",
    "Profile",
    "ProfileScreen.tsx",
    "migrated",
    "student-workspace-v2",
    ["profile update", "logout", "version status"],
    deviceAcceptancePending,
    sourceMigrationEvidence,
  ),
  routeDesign(
    "student",
    "ClassDetail",
    "ClassDetailScreen.tsx",
    "migrated",
    "student-workspace-v2",
    ["module navigation", "classmate visibility"],
  ),
  routeDesign(
    "student",
    "ModuleDetail",
    "ModuleDetailScreen.tsx",
    "migrated",
    "student-workspace-v2",
    ["lesson navigation", "completion state"],
  ),
  routeDesign(
    "student",
    "Calendar",
    "CalendarScreen.tsx",
    "migrated",
    "student-workspace-v2",
    ["event navigation", "class filtering", "offline read-only guard"],
    deviceAcceptancePending,
    sourceMigrationEvidence,
  ),
  routeDesign(
    "student",
    "Courses",
    "CoursesScreen.tsx",
    "migrated",
    "student-workspace-v2",
    [
      "class navigation",
      "bounded completion summaries",
      "offline read-only guard",
    ],
    deviceAcceptancePending,
    [
      "screens/__tests__/mobile-workspace-aggregate-contract.test.ts",
      ...sourceMigrationEvidence,
    ],
  ),
  routeDesign(
    "student",
    "Lessons",
    "AppNavigator.tsx",
    "migrated",
    "student-guided-workbench-v2",
    ["Learner's Path navigation"],
  ),
  routeDesign(
    "student",
    "LessonDetail",
    "LessonDetailScreen.tsx",
    "migrated",
    "student-workspace-v2",
    ["lesson rendering", "completion"],
  ),
  routeDesign(
    "student",
    "AssessmentDetail",
    "AssessmentDetailScreen.tsx",
    "migrated",
    "student-assessment-v2",
    ["attempt admission", "instructions"],
  ),
  routeDesign(
    "student",
    "AssessmentTake",
    "AssessmentTakeScreen.tsx",
    "migrated",
    "student-assessment-v2",
    ["attempt state", "anti-cheat containment", "submission"],
  ),
  routeDesign(
    "student",
    "AssessmentResults",
    "AssessmentResultsScreen.tsx",
    "migrated",
    "student-workspace-v2",
    ["score visibility", "review navigation"],
    deviceAcceptancePending,
    sourceMigrationEvidence,
  ),
  routeDesign(
    "student",
    "AssessmentHistory",
    "AssessmentHistoryScreen.tsx",
    "migrated",
    "student-workspace-v2",
    ["attempt history", "result navigation"],
    deviceAcceptancePending,
    sourceMigrationEvidence,
  ),
  routeDesign(
    "student",
    "Chatbot",
    "AppNavigator.tsx",
    "migrated",
    "student-guided-workbench-v2",
    ["JA Ask routing"],
  ),
  routeDesign(
    "student",
    "Performance",
    "PerformanceScreen.tsx",
    "partial",
    "student-primitives-v1",
    ["derived performance display"],
    "Visual acceptance and current workspace migration evidence are incomplete.",
  ),
  routeDesign(
    "student",
    "Transcript",
    "TranscriptScreen.tsx",
    "migrated",
    "student-workspace-v2",
    ["released academic history"],
    deviceAcceptancePending,
    sourceMigrationEvidence,
  ),
  routeDesign(
    "student",
    "LXP",
    "AppNavigator.tsx",
    "migrated",
    "student-guided-workbench-v2",
    ["Learner's Path routing"],
  ),
] as const satisfies readonly MobileRouteDesignEntry[];

const teacherEntries = [
  routeDesign(
    "teacher",
    "Home",
    "TeacherHomeScreen.tsx",
    "migrated",
    "teacher-workbench-v2",
    [
      "attention summary",
      "class navigation",
      "bounded overview",
      "offline read-only guard",
    ],
    deviceAcceptancePending,
    [
      "screens/__tests__/teacher-mobile-render.test.tsx",
      ...sourceMigrationEvidence,
    ],
  ),
  routeDesign(
    "teacher",
    "Classes",
    "TeacherClassesScreen.tsx",
    "migrated",
    "teacher-workbench-v2",
    ["class navigation", "roster entry"],
    deviceAcceptancePending,
    sourceMigrationEvidence,
  ),
  routeDesign(
    "teacher",
    "Sections",
    "TeacherSectionsScreen.tsx",
    "migrated",
    "teacher-workbench-v2",
    ["section navigation", "roster entry"],
    deviceAcceptancePending,
    sourceMigrationEvidence,
  ),
  routeDesign(
    "teacher",
    "Assessments",
    "TeacherAssessmentsScreen.tsx",
    "migrated",
    "teacher-workbench-v2",
    ["assessment filtering", "authoring entry"],
    deviceAcceptancePending,
    [
      "screens/__tests__/teacher-assessments-layout.test.tsx",
      ...sourceMigrationEvidence,
    ],
  ),
  routeDesign(
    "teacher",
    "TeacherCalendar",
    "TeacherCalendarScreen.tsx",
    "migrated",
    "teacher-workbench-v2",
    [
      "assessment and announcement calendar",
      "bounded overview",
      "offline read-only guard",
    ],
    deviceAcceptancePending,
    [
      "screens/__tests__/mobile-workspace-aggregate-contract.test.ts",
      ...sourceMigrationEvidence,
    ],
  ),
  routeDesign(
    "teacher",
    "TeacherLessons",
    "TeacherLessonsScreen.tsx",
    "migrated",
    "teacher-workbench-v2",
    ["lesson list", "authoring entry"],
  ),
  routeDesign(
    "teacher",
    "TeacherLibrary",
    "TeacherLibraryScreen.tsx",
    "migrated",
    "teacher-workbench-v2",
    ["file and module navigation", "bounded cross-class module index"],
    deviceAcceptancePending,
    [
      "screens/__tests__/mobile-workspace-aggregate-contract.test.ts",
      ...sourceMigrationEvidence,
    ],
  ),
  routeDesign(
    "teacher",
    "TeacherClassRecord",
    "TeacherClassRecordScreen.tsx",
    "migrated",
    "teacher-workbench-v2",
    ["grading", "scored exemptions", "release readiness"],
  ),
  routeDesign(
    "teacher",
    "TeacherAnnouncements",
    "TeacherAnnouncementsScreen.tsx",
    "migrated",
    "teacher-workbench-v2",
    ["announcement lifecycle"],
  ),
  routeDesign(
    "teacher",
    "TeacherReports",
    "TeacherReportsScreen.tsx",
    "migrated",
    "teacher-workbench-v2",
    ["report filters", "exports"],
  ),
  routeDesign(
    "teacher",
    "TeacherInterventions",
    "TeacherInterventionsScreen.tsx",
    "migrated",
    "teacher-workbench-v2",
    ["intervention review"],
  ),
  routeDesign(
    "teacher",
    "TeacherPerformance",
    "TeacherPerformanceScreen.tsx",
    "migrated",
    "teacher-workbench-v2",
    ["performance review"],
  ),
  routeDesign(
    "teacher",
    "TeacherEvaluations",
    "TeacherEvaluationsScreen.tsx",
    "migrated",
    "teacher-workbench-v2",
    ["evaluation response"],
  ),
  routeDesign(
    "teacher",
    "Profile",
    "TeacherProfileScreen.tsx",
    "migrated",
    "teacher-workbench-v2",
    ["profile update", "logout"],
    deviceAcceptancePending,
    [
      "screens/__tests__/teacher-mobile-render.test.tsx",
      ...sourceMigrationEvidence,
    ],
  ),
  routeDesign(
    "teacher",
    "TeacherClassDetail",
    "TeacherClassDetailScreen.tsx",
    "migrated",
    "teacher-workbench-v2",
    ["class overview", "roster and modules"],
  ),
  routeDesign(
    "teacher",
    "TeacherModuleDetail",
    "TeacherModuleDetailScreen.tsx",
    "migrated",
    "teacher-workbench-v2",
    ["module authoring"],
  ),
  routeDesign(
    "teacher",
    "TeacherModuleFileDetail",
    "TeacherDeepParity.tsx",
    "migrated",
    "teacher-workbench-v2",
    ["file detail"],
  ),
  routeDesign(
    "teacher",
    "TeacherLessonDetail",
    "TeacherLessonDetailScreen.tsx",
    "migrated",
    "teacher-workbench-v2",
    ["lesson detail"],
  ),
  routeDesign(
    "teacher",
    "TeacherLessonEditor",
    "TeacherDeepParity.tsx",
    "migrated",
    "teacher-workbench-v2",
    ["structured lesson authoring"],
  ),
  routeDesign(
    "teacher",
    "TeacherAssessmentDetail",
    "TeacherAssessmentDetailScreen.tsx",
    "migrated",
    "teacher-workbench-v2",
    ["assessment detail", "results navigation"],
  ),
  routeDesign(
    "teacher",
    "TeacherAssessmentEditor",
    "TeacherAssessmentEditorScreen.tsx",
    "migrated",
    "teacher-workbench-v2",
    ["assessment authoring"],
  ),
  routeDesign(
    "teacher",
    "TeacherAssessmentReview",
    "TeacherAssessmentReviewScreen.tsx",
    "migrated",
    "teacher-workbench-v2",
    ["assessment review"],
  ),
  routeDesign(
    "teacher",
    "TeacherAssessmentAttemptResult",
    "TeacherDeepParity.tsx",
    "migrated",
    "teacher-workbench-v2",
    ["attempt result review"],
  ),
  routeDesign(
    "teacher",
    "TeacherCreateModule",
    "TeacherCreateModuleScreen.tsx",
    "migrated",
    "teacher-workbench-v2",
    ["module creation"],
  ),
  routeDesign(
    "teacher",
    "TeacherCreateAssessment",
    "TeacherCreateAssessmentScreen.tsx",
    "migrated",
    "teacher-workbench-v2",
    ["assessment setup"],
  ),
  routeDesign(
    "teacher",
    "TeacherClassAddStudents",
    "TeacherDeepParity.tsx",
    "migrated",
    "teacher-workbench-v2",
    ["class enrollment"],
  ),
  routeDesign(
    "teacher",
    "TeacherClassStudentOverview",
    "TeacherDeepParity.tsx",
    "migrated",
    "teacher-workbench-v2",
    ["student overview"],
  ),
  routeDesign(
    "teacher",
    "TeacherSectionDetail",
    "TeacherSectionDetailScreen.tsx",
    "migrated",
    "teacher-workbench-v2",
    ["section roster"],
  ),
  routeDesign(
    "teacher",
    "TeacherSectionAddStudents",
    "TeacherDeepParity.tsx",
    "migrated",
    "teacher-workbench-v2",
    ["section enrollment"],
  ),
  routeDesign(
    "teacher",
    "TeacherSectionStudentProfile",
    "TeacherDeepParity.tsx",
    "migrated",
    "teacher-workbench-v2",
    ["student profile"],
  ),
  routeDesign(
    "teacher",
    "TeacherExtractionDetail",
    "TeacherDeepParity.tsx",
    "migrated",
    "teacher-workbench-v2",
    ["extraction review"],
  ),
  routeDesign(
    "teacher",
    "TeacherAiDraft",
    "TeacherDeepParity.tsx",
    "migrated",
    "teacher-workbench-v2",
    ["AI draft review and apply"],
  ),
  routeDesign(
    "teacher",
    "TeacherInterventionDetail",
    "TeacherDeepParity.tsx",
    "migrated",
    "teacher-workbench-v2",
    ["intervention detail"],
  ),
  routeDesign(
    "teacher",
    "TeacherMore",
    "TeacherMoreScreen.tsx",
    "migrated",
    "teacher-workbench-v2",
    ["secondary route navigation"],
  ),
] as const satisfies readonly MobileRouteDesignEntry[];

const adminOwnerByRoute: Record<
  (typeof adminDrawerRouteNames)[number],
  string
> = {
  Home: "AdminHomeScreen.tsx",
  AdminDiagnostics: "AdminDiagnosticsScreen.tsx",
  AdminUsers: "AdminUsersScreen.tsx",
  AdminSections: "AdminSectionsScreen.tsx",
  AdminClasses: "AdminClassesWorkspaceScreen.tsx",
  AdminCalendar: "AdminCalendarScreen.tsx",
  AdminRoster: "AdminRosterScreen.tsx",
  AdminClassRecord: "AdminClassRecordScreen.tsx",
  AdminUserReports: "AdminUserReportsScreen.tsx",
  AdminLibrary: "AdminLibraryScreen.tsx",
  AdminAnnouncements: "AdminAnnouncementsScreen.tsx",
  AdminReports: "AdminReportsScreen.tsx",
  AdminEvaluations: "AdminEvaluationsScreen.tsx",
  AdminChatbot: "AdminChatbotScreen.tsx",
  AdminAudit: "AdminAuditScreen.tsx",
  AdminSettings: "AdminSettingsOverviewScreen.tsx",
  Profile: "AdminProfileScreen.tsx",
};

const adminEntries = adminDrawerRouteNames.map((route) =>
  routeDesign(
    "admin",
    route,
    adminOwnerByRoute[route],
    "migrated",
    "admin-mobile-workspace-v2",
    ["web-aligned task workspace", "backend-authoritative actions"],
  ),
);

export const mobileRouteDesignRegistry = [
  ...studentEntries,
  ...teacherEntries,
  ...adminEntries,
] as const satisfies readonly MobileRouteDesignEntry[];

const governedRouteCount =
  studentParityRouteNames.length +
  teacherParityRouteNames.length +
  adminDrawerRouteNames.length;

if (mobileRouteDesignRegistry.length !== governedRouteCount) {
  throw new Error("Mobile design registry route count is inconsistent.");
}
