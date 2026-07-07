function concatRouteNames<const T extends readonly string[], const U extends readonly string[]>(
  first: T,
  second: U,
) {
  return [...first, ...second] as const;
}

export const teacherRouteManifest = {
  tabs: ["Home", "Assessments", "Classes", "Announcements", "Sections", "Profile"] as const,
  stack: [
    "TeacherClassDetail",
    "TeacherModuleDetail",
    "TeacherModuleFileDetail",
    "TeacherLessonDetail",
    "TeacherLessonEditor",
    "TeacherAssessmentDetail",
    "TeacherAssessmentEditor",
    "TeacherAssessmentReview",
    "TeacherAssessmentAttemptResult",
    "TeacherCalendar",
    "TeacherCreateModule",
    "TeacherCreateAssessment",
    "TeacherClassAddStudents",
    "TeacherClassStudentOverview",
    "TeacherSectionDetail",
    "TeacherSectionAddStudents",
    "TeacherSectionStudentProfile",
    "TeacherExtractionDetail",
    "TeacherAiDraft",
    "TeacherInterventionDetail",
    "TeacherLibrary",
    "TeacherClassRecord",
    "TeacherReports",
    "TeacherInterventions",
    "TeacherPerformance",
    "TeacherEvaluations",
    "TeacherAnnouncements",
    "TeacherMore",
  ] as const,
} as const;

export const teacherTabRouteNames = teacherRouteManifest.tabs;
export const teacherStackRouteNames = teacherRouteManifest.stack;
export const teacherParityRouteNames = concatRouteNames(teacherTabRouteNames, teacherStackRouteNames);

export type TeacherTabRouteName = (typeof teacherTabRouteNames)[number];
export type TeacherStackRouteName = (typeof teacherStackRouteNames)[number];
export type TeacherParityRouteName = (typeof teacherParityRouteNames)[number];

export type TeacherWebRouteMapping = {
  web: string;
  mobile: TeacherTabRouteName | TeacherStackRouteName;
  coverage: "tab" | "stack" | "nested-tab";
};

export const teacherWebRouteMappings = [
  { web: "/dashboard/teacher", mobile: "Classes", coverage: "tab" },
  { web: "/dashboard/teacher/classes", mobile: "Classes", coverage: "tab" },
  { web: "/dashboard/teacher/classes/[id]", mobile: "TeacherClassDetail", coverage: "stack" },
  { web: "/dashboard/teacher/classes/[id]/ai-draft", mobile: "TeacherAiDraft", coverage: "stack" },
  { web: "/dashboard/teacher/classes/[id]/modules/[moduleId]", mobile: "TeacherModuleDetail", coverage: "stack" },
  { web: "/dashboard/teacher/classes/[id]/modules/[moduleId]/files/[fileId]", mobile: "TeacherModuleFileDetail", coverage: "stack" },
  { web: "/dashboard/teacher/classes/[id]/students/add", mobile: "TeacherClassAddStudents", coverage: "stack" },
  { web: "/dashboard/teacher/classes/[id]/students/[studentId]", mobile: "TeacherClassStudentOverview", coverage: "stack" },
  { web: "/dashboard/teacher/sections", mobile: "Sections", coverage: "tab" },
  { web: "/dashboard/teacher/sections/[id]/roster", mobile: "TeacherSectionDetail", coverage: "stack" },
  { web: "/dashboard/teacher/sections/[id]/students/add", mobile: "TeacherSectionAddStudents", coverage: "stack" },
  { web: "/dashboard/teacher/sections/[id]/students/[studentId]", mobile: "TeacherSectionStudentProfile", coverage: "stack" },
  { web: "/dashboard/teacher/assessments", mobile: "Assessments", coverage: "tab" },
  { web: "/dashboard/teacher/assessments/[id]", mobile: "TeacherAssessmentDetail", coverage: "stack" },
  { web: "/dashboard/teacher/assessments/[id]/edit", mobile: "TeacherAssessmentEditor", coverage: "stack" },
  { web: "/dashboard/teacher/assessments/[id]/results/[attemptId]", mobile: "TeacherAssessmentAttemptResult", coverage: "stack" },
  { web: "/dashboard/teacher/lessons", mobile: "TeacherLibrary", coverage: "stack" },
  { web: "/dashboard/teacher/lessons/[id]/view", mobile: "TeacherLessonDetail", coverage: "stack" },
  { web: "/dashboard/teacher/lessons/[id]/edit", mobile: "TeacherLessonEditor", coverage: "stack" },
  { web: "/dashboard/teacher/library", mobile: "TeacherLibrary", coverage: "stack" },
  { web: "/dashboard/teacher/calendar", mobile: "TeacherCalendar", coverage: "stack" },
  { web: "/dashboard/teacher/announcements", mobile: "TeacherAnnouncements", coverage: "stack" },
  { web: "/dashboard/teacher/class-record", mobile: "TeacherClassRecord", coverage: "stack" },
  { web: "/dashboard/teacher/performance", mobile: "TeacherPerformance", coverage: "stack" },
  { web: "/dashboard/teacher/interventions", mobile: "TeacherInterventions", coverage: "stack" },
  { web: "/dashboard/teacher/interventions/[caseId]", mobile: "TeacherInterventionDetail", coverage: "stack" },
  { web: "/dashboard/teacher/evaluations", mobile: "TeacherEvaluations", coverage: "stack" },
  { web: "/dashboard/teacher/reports", mobile: "TeacherReports", coverage: "stack" },
  { web: "/dashboard/teacher/profile", mobile: "Profile", coverage: "tab" },
  { web: "/dashboard/teacher/extractions/[id]", mobile: "TeacherExtractionDetail", coverage: "stack" },
] as const satisfies ReadonlyArray<TeacherWebRouteMapping>;
