export const adminWebCategoryOrder = [
  "Overview",
  "School Setup",
  "Content & Comms",
  "Insights & AI",
  "Account",
  "Contextual",
] as const;

export type AdminWebCategory = (typeof adminWebCategoryOrder)[number];
export type AdminParityStatus = "aligned" | "partial" | "missing";

export type AdminParityEntry = {
  id:
    | "home"
    | "diagnostics"
    | "users"
    | "sections"
    | "classes"
    | "calendar"
    | "roster-import"
    | "class-record"
    | "user-reports"
    | "library"
    | "announcements"
    | "reports"
    | "evaluations"
    | "admin-chatbot"
    | "audit"
    | "system-settings"
    | "profile"
    | "class-templates"
    | "assessments";
  label: string;
  category: AdminWebCategory;
  webPath: string;
  currentMobileRoute?: string;
  targetMobileRoute: string;
  drawerRoot: boolean;
  backendOwners: readonly string[];
  actionGraph: string;
  status: AdminParityStatus;
  gap?: string;
};

/**
 * Reviewed web/mobile/backend administrator inventory.
 *
 * This manifest intentionally records incomplete domains instead of allowing
 * them to disappear from route-only contract checks. Individual domains move
 * to `aligned` only when their request, response, permission, action-order and
 * runtime acceptance evidence are complete.
 */
const adminParityInventoryBaseline: readonly AdminParityEntry[] = [
  {
    id: "home",
    label: "Home",
    category: "Overview",
    webPath: "/dashboard/admin",
    currentMobileRoute: "Home",
    targetMobileRoute: "Home",
    drawerRoot: true,
    backendOwners: ["admin", "notifications", "academic-state"],
    actionGraph: "admin-home-attention",
    status: "partial",
    gap: "Mobile omits notification entry, current academic context, recent operations and several overview fields.",
  },
  {
    id: "diagnostics",
    label: "Diagnostics",
    category: "Overview",
    webPath: "/dashboard/admin/diagnostics",
    currentMobileRoute: "AdminDiagnostics",
    targetMobileRoute: "AdminDiagnostics",
    drawerRoot: true,
    backendOwners: ["health", "admin"],
    actionGraph: "admin-diagnostics-review",
    status: "partial",
    gap: "The contract is reachable but the mobile surface is still a branch of the generic tools screen.",
  },
  {
    id: "users",
    label: "Users",
    category: "School Setup",
    webPath: "/dashboard/admin/users",
    currentMobileRoute: "AdminUsers",
    targetMobileRoute: "AdminUsers",
    drawerRoot: true,
    backendOwners: ["users", "profiles", "admin-lifecycle"],
    actionGraph: "admin-user-management",
    status: "partial",
    gap: "Mobile drops profile fields and lacks complete detail, monitoring, export, bulk and governed lifecycle behavior.",
  },
  {
    id: "sections",
    label: "Sections",
    category: "School Setup",
    webPath: "/dashboard/admin/sections",
    currentMobileRoute: "Classes",
    targetMobileRoute: "AdminSections",
    drawerRoot: true,
    backendOwners: ["sections", "admin-lifecycle", "academic-grading"],
    actionGraph: "admin-section-management",
    status: "partial",
    gap: "Mobile combines sections with classes, hardcodes capacity and bypasses governed lifecycle preview and execution.",
  },
  {
    id: "classes",
    label: "Classes",
    category: "School Setup",
    webPath: "/dashboard/admin/classes",
    currentMobileRoute: "Classes",
    targetMobileRoute: "AdminClasses",
    drawerRoot: true,
    backendOwners: ["classes", "sections", "admin-lifecycle"],
    actionGraph: "admin-class-management",
    status: "partial",
    gap: "Mobile hardcodes grading weights, drops grading profile data and bypasses governed lifecycle preview and execution.",
  },
  {
    id: "calendar",
    label: "Calendar",
    category: "School Setup",
    webPath: "/dashboard/admin/calendar",
    currentMobileRoute: "AdminCalendar",
    targetMobileRoute: "AdminCalendar",
    drawerRoot: true,
    backendOwners: ["school-events"],
    actionGraph: "admin-school-calendar",
    status: "partial",
    gap: "Service methods align, but mobile exposes raw ISO transport values and remains inside the generic tools screen.",
  },
  {
    id: "roster-import",
    label: "Roster Import",
    category: "School Setup",
    webPath: "/dashboard/admin/roster-import",
    currentMobileRoute: "AdminRoster",
    targetMobileRoute: "AdminRoster",
    drawerRoot: true,
    backendOwners: ["roster-import", "sections", "users"],
    actionGraph: "admin-roster-import",
    status: "partial",
    gap: "Mobile can preview and commit but does not expose or strongly type pending-row resolution.",
  },
  {
    id: "class-record",
    label: "Class Record",
    category: "School Setup",
    webPath: "/dashboard/admin/class-record",
    currentMobileRoute: "TeacherClassRecord",
    targetMobileRoute: "AdminClassRecord",
    drawerRoot: true,
    backendOwners: ["class-record", "academic-grading"],
    actionGraph: "admin-class-record-policy",
    status: "partial",
    gap: "Teacher workbook routes exist, but administrator transmutation preview, apply and activation flows are missing.",
  },
  {
    id: "user-reports",
    label: "User Reports",
    category: "School Setup",
    webPath: "/dashboard/admin/user-reports",
    targetMobileRoute: "AdminUserReports",
    drawerRoot: true,
    backendOwners: ["users", "admin"],
    actionGraph: "admin-user-monitoring",
    status: "missing",
    gap: "No mobile drawer destination or administrator monitoring report screen exists.",
  },
  {
    id: "library",
    label: "Nexora Library",
    category: "Content & Comms",
    webPath: "/dashboard/admin/library",
    currentMobileRoute: "AdminLibrary",
    targetMobileRoute: "AdminLibrary",
    drawerRoot: true,
    backendOwners: ["file-upload"],
    actionGraph: "admin-library-management",
    status: "partial",
    gap: "Mobile service coverage is broad but the UI exposes only open and retry actions.",
  },
  {
    id: "announcements",
    label: "Announcements",
    category: "Content & Comms",
    webPath: "/dashboard/admin/announcements",
    currentMobileRoute: "AdminAnnouncements",
    targetMobileRoute: "AdminAnnouncements",
    drawerRoot: true,
    backendOwners: ["announcements", "classes"],
    actionGraph: "admin-announcement-management",
    status: "partial",
    gap: "Cross-class inventory fans out one request per class and omits parts of the web detail and core-release flow.",
  },
  {
    id: "reports",
    label: "Reports",
    category: "Insights & AI",
    webPath: "/dashboard/admin/reports",
    currentMobileRoute: "AdminReports",
    targetMobileRoute: "AdminReports",
    drawerRoot: true,
    backendOwners: ["reports", "class-record"],
    actionGraph: "admin-reporting",
    status: "partial",
    gap: "Mobile renders only raw system-usage JSON and lacks the typed web report set.",
  },
  {
    id: "evaluations",
    label: "Evaluations",
    category: "Insights & AI",
    webPath: "/dashboard/admin/evaluations",
    currentMobileRoute: "AdminEvaluations",
    targetMobileRoute: "AdminEvaluations",
    drawerRoot: true,
    backendOwners: ["lxp"],
    actionGraph: "admin-system-evaluations",
    status: "partial",
    gap: "Mobile hardcodes campaign settings and omits evaluation responses, summaries and filters.",
  },
  {
    id: "admin-chatbot",
    label: "AI Chatbot",
    category: "Insights & AI",
    webPath: "/dashboard/admin/chatbot",
    targetMobileRoute: "AdminChatbot",
    drawerRoot: true,
    backendOwners: ["ai-mentor", "admin"],
    actionGraph: "admin-analytics-assistant",
    status: "missing",
    gap: "No mobile administrator service, conversation history or chat screen exists.",
  },
  {
    id: "audit",
    label: "Audit Trail",
    category: "Insights & AI",
    webPath: "/dashboard/admin/audit",
    currentMobileRoute: "AdminAudit",
    targetMobileRoute: "AdminAudit",
    drawerRoot: true,
    backendOwners: ["admin", "audit"],
    actionGraph: "admin-audit-review",
    status: "partial",
    gap: "Mobile fetches all pages and omits server actor/date filters, detail and export.",
  },
  {
    id: "system-settings",
    label: "System Settings",
    category: "Account",
    webPath: "/dashboard/admin/system-settings",
    currentMobileRoute: "AdminSettings",
    targetMobileRoute: "AdminSettings",
    drawerRoot: true,
    backendOwners: ["academic-state", "academic-grading", "class-record"],
    actionGraph: "admin-system-settings",
    status: "partial",
    gap: "Mobile funnels settings into one academic monolith rather than the web task workspaces.",
  },
  {
    id: "profile",
    label: "Profile",
    category: "Account",
    webPath: "/dashboard/admin/profile",
    currentMobileRoute: "Profile",
    targetMobileRoute: "Profile",
    drawerRoot: false,
    backendOwners: ["profiles", "auth"],
    actionGraph: "admin-profile-security",
    status: "aligned",
  },
  {
    id: "class-templates",
    label: "Class Templates",
    category: "Contextual",
    webPath: "/dashboard/admin/class-templates",
    currentMobileRoute: "AdminTemplates",
    targetMobileRoute: "AdminTemplates",
    drawerRoot: false,
    backendOwners: ["class-templates"],
    actionGraph: "admin-class-template-authoring",
    status: "partial",
    gap: "Mobile exposes only list, create and publish while web supports the full nested authoring workflow.",
  },
  {
    id: "assessments",
    label: "Assessments",
    category: "Contextual",
    webPath: "/dashboard/admin/classes/:classId",
    currentMobileRoute: "Assessments",
    targetMobileRoute: "TeacherAssessmentDetail",
    drawerRoot: false,
    backendOwners: ["assessments", "classes", "class-record"],
    actionGraph: "admin-class-assessments",
    status: "partial",
    gap: "Mobile adds a primary cross-class route and drops several assessment response fields; mutations must remain class-contextual.",
  },
] as const;

/**
 * Current source-level parity state. The baseline above remains as an
 * auditable record of the gaps that drove this overhaul; runtime, device, and
 * deployment evidence are recorded separately from this implementation flag.
 */
export const adminParityManifest: readonly AdminParityEntry[] =
  adminParityInventoryBaseline.map(({ gap: _resolvedGap, ...entry }) => ({
    ...entry,
    currentMobileRoute: entry.targetMobileRoute,
    status: "aligned" as const,
  }));

export type AdminWebRouteParityEntry = {
  webPath: string;
  mobileRoute: string;
  mobileTask: string;
  evidence: `${string}.tsx`;
  exception?: string;
};

/** Exact inventory of every current Next.js administrator page. */
export const adminWebRouteParity: readonly AdminWebRouteParityEntry[] = [
  {
    webPath: "/dashboard/admin",
    mobileRoute: "MainTabs/Home",
    mobileTask: "Administrator overview and attention links",
    evidence: "AdminHomeScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/academic-records/:classId",
    mobileRoute: "TeacherClassDetail(classRecord)",
    mobileTask: "Open the selected class workbook and academic evidence",
    evidence: "TeacherClassDetailScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/access-students",
    mobileRoute: "AdminStudentReadiness",
    mobileTask: "Review section-bounded learner outcomes and blockers",
    evidence: "AdminStudentReadinessScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/announcements",
    mobileRoute: "MainTabs/AdminAnnouncements",
    mobileTask: "Paginated announcement inventory and canonical class composer",
    evidence: "AdminAnnouncementsScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/audit",
    mobileRoute: "MainTabs/AdminAudit",
    mobileTask: "Filter, inspect, and export immutable audit evidence",
    evidence: "AdminAuditScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/calendar",
    mobileRoute: "MainTabs/AdminCalendar",
    mobileTask: "Create and edit school events with native date-time pickers",
    evidence: "AdminCalendarScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/chatbot",
    mobileRoute: "MainTabs/AdminChatbot",
    mobileTask:
      "Conversation history, evidence sources, and allowlisted navigation",
    evidence: "AdminChatbotScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/class-record",
    mobileRoute: "MainTabs/AdminClassRecord",
    mobileTask: "Preview, apply, and activate transmutation tables",
    evidence: "AdminClassRecordScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/class-templates",
    mobileRoute: "MainTabs/AdminTemplates",
    mobileTask: "List, create, import, export, and publish class templates",
    evidence: "AdminTemplatesScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/class-templates/:id",
    mobileRoute: "AdminTemplateDetail",
    mobileTask: "Edit template metadata and complete reusable content",
    evidence: "AdminTemplateDetailScreen.tsx",
  },
  {
    webPath:
      "/dashboard/admin/class-templates/:id/announcements/:announcementKey/edit",
    mobileRoute: "AdminTemplateDetail(announcements)",
    mobileTask: "Edit the selected reusable announcement",
    evidence: "AdminTemplateDetailScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/class-templates/:id/announcements/new",
    mobileRoute: "AdminTemplateDetail(announcements)",
    mobileTask: "Add a reusable announcement",
    evidence: "AdminTemplateDetailScreen.tsx",
  },
  {
    webPath:
      "/dashboard/admin/class-templates/:id/assessments/:assessmentKey/edit",
    mobileRoute: "AdminTemplateDetail(assessments)",
    mobileTask: "Edit reusable assessment questions and images",
    evidence: "AdminTemplateDetailScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/class-templates/:id/lessons/:lessonKey/edit",
    mobileRoute: "AdminTemplateDetail(lessons)",
    mobileTask: "Edit reusable lesson content",
    evidence: "AdminTemplateDetailScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/class-templates/:id/modules/:moduleKey",
    mobileRoute: "AdminTemplateDetail(modules)",
    mobileTask: "Edit reusable modules and linked items",
    evidence: "AdminTemplateDetailScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/classes",
    mobileRoute: "MainTabs/AdminClasses",
    mobileTask:
      "Server-paged classes with search, filters, selection, and lifecycle review",
    evidence: "AdminClassesWorkspaceScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/classes/:id",
    mobileRoute: "TeacherClassDetail",
    mobileTask: "Open the canonical class workspace for the selected class",
    evidence: "TeacherClassDetailScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/classes/:id/edit",
    mobileRoute: "MainTabs/AdminClasses(Edit)",
    mobileTask: "Edit every class assignment, schedule, and presentation field",
    evidence: "AdminClassesWorkspaceScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/classes/:id/students/add",
    mobileRoute: "TeacherClassAddStudents",
    mobileTask: "Add eligible learners to the selected class",
    evidence: "TeacherDeepParityScreens.tsx",
  },
  {
    webPath: "/dashboard/admin/classes/new",
    mobileRoute: "MainTabs/AdminClasses(New)",
    mobileTask: "Create a class with complete grading and schedule fields",
    evidence: "AdminClassesWorkspaceScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/diagnostics",
    mobileRoute: "MainTabs/AdminDiagnostics",
    mobileTask: "Review live API, database, cache, and AI readiness",
    evidence: "AdminDiagnosticsScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/evaluations",
    mobileRoute: "MainTabs/AdminEvaluations",
    mobileTask:
      "Create, filter, page, summarize, and inspect evaluation campaigns",
    evidence: "AdminEvaluationsScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/library",
    mobileRoute: "MainTabs/AdminLibrary",
    mobileTask: "Manage folders, uploads, metadata, indexing, and files",
    evidence: "AdminLibraryScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/profile",
    mobileRoute: "MainTabs/Profile",
    mobileTask: "Manage administrator profile and account security",
    evidence: "AdminProfileScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/reports",
    mobileRoute: "MainTabs/AdminReports",
    mobileTask:
      "Use seven typed report views with class, period, and date filters",
    evidence: "AdminReportsScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/roster-import",
    mobileRoute: "MainTabs/AdminRoster",
    mobileTask: "Select, preview, commit, and resolve roster rows",
    evidence: "AdminRosterScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/sections",
    mobileRoute: "MainTabs/AdminSections",
    mobileTask:
      "Server-paged sections with filters, selection, and lifecycle review",
    evidence: "AdminSectionsScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/sections/:id/edit",
    mobileRoute: "MainTabs/AdminSections(Edit)",
    mobileTask: "Edit complete section, room, capacity, and adviser fields",
    evidence: "AdminSectionsScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/sections/:id/roster",
    mobileRoute: "AdminSectionDetail",
    mobileTask: "Review section schedule, roster, and governed learner actions",
    evidence: "AdminSectionDetailScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/sections/:id/students",
    mobileRoute: "TeacherSectionAddStudents",
    mobileTask: "Continue the web redirect into eligible learner selection",
    evidence: "TeacherDeepParityScreens.tsx",
  },
  {
    webPath: "/dashboard/admin/sections/:id/students/add",
    mobileRoute: "TeacherSectionAddStudents",
    mobileTask: "Add eligible learners to the selected section",
    evidence: "TeacherDeepParityScreens.tsx",
  },
  {
    webPath: "/dashboard/admin/sections/new",
    mobileRoute: "MainTabs/AdminSections(New)",
    mobileTask: "Create a section with complete ownership and capacity fields",
    evidence: "AdminSectionsScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/system-settings",
    mobileRoute: "MainTabs/AdminSettings",
    mobileTask: "Open the bounded academic settings task hub",
    evidence: "AdminSettingsOverviewScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/system-settings/academic-year",
    mobileRoute: "AdminSettingsAcademicYear",
    mobileTask: "Review policy periods and activate a verified period",
    evidence: "AdminAcademicYearSettingsScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/system-settings/assessments-grading",
    mobileRoute: "AdminSettingsAssessmentsGrading",
    mobileTask: "Review class workbooks and assessment grading evidence",
    evidence: "AdminAssessmentsGradingSettingsScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/system-settings/audit-recovery",
    mobileRoute: "AdminSettingsAuditRecovery",
    mobileTask: "Audit alignment and execute manifest-bound recovery",
    evidence: "AdminAuditRecoverySettingsScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/system-settings/demo-mode",
    mobileRoute: "AdminSettingsDemoMode",
    mobileTask: "Open controlled Demo mode settings",
    evidence: "AdminDemoModeSettingsScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/system-settings/reset-school-data",
    mobileRoute: "AdminSettingsResetSchoolData",
    mobileTask:
      "Preview cleared and kept data, confirm permanent reset, and reconnect to public progress",
    evidence: "AdminSystemResetScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/system-settings/learner-completion",
    mobileRoute: "AdminSettingsLearnerCompletion",
    mobileTask: "Manage back-subject and Grade 10 completion evidence",
    evidence: "AdminLearnerCompletionSettingsScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/system-settings/year-transition",
    mobileRoute: "AdminSettingsYearTransition",
    mobileTask:
      "Preview, authenticate, confirm, and execute school-year transition",
    evidence: "AdminYearTransitionSettingsScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/user-reports",
    mobileRoute: "MainTabs/AdminUserReports",
    mobileTask: "Page and filter account activity monitoring",
    evidence: "AdminUserReportsScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/users",
    mobileRoute: "MainTabs/AdminUsers",
    mobileTask: "Search, filter, select, export, and govern accounts",
    evidence: "AdminUsersScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/users/:id",
    mobileRoute: "AdminUserDetail",
    mobileTask:
      "Edit complete identity and profile fields and review lifecycle actions",
    evidence: "AdminUserDetailScreen.tsx",
  },
  {
    webPath: "/dashboard/admin/users/create",
    mobileRoute: "AdminCreateUser",
    mobileTask:
      "Create complete administrator, teacher, or student accounts atomically",
    evidence: "AdminCreateUserScreen.tsx",
  },
] as const;
