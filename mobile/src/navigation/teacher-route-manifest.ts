function concatRouteNames<const T extends readonly string[], const U extends readonly string[]>(
  first: T,
  second: U,
) {
  return [...first, ...second] as const;
}

export const teacherRouteManifest = {
  drawer: [
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
  ] as const,
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
    "TeacherMore",
  ] as const,
} as const;

export const teacherDrawerRouteNames = teacherRouteManifest.drawer;
export const teacherStackRouteNames = teacherRouteManifest.stack;
export const teacherParityRouteNames = concatRouteNames(teacherDrawerRouteNames, teacherStackRouteNames);

export type TeacherDrawerRouteName = (typeof teacherDrawerRouteNames)[number];
export type TeacherStackRouteName = (typeof teacherStackRouteNames)[number];
export type TeacherParityRouteName = (typeof teacherParityRouteNames)[number];

export type TeacherWebRouteMapping = {
  web: string;
  mobile: TeacherDrawerRouteName | TeacherStackRouteName;
  coverage: "drawer" | "stack" | "nested-tab";
};

export const teacherWebRouteMappings = [
  { web: "/dashboard/teacher", mobile: "Classes", coverage: "drawer" },
  { web: "/dashboard/teacher/classes", mobile: "Classes", coverage: "drawer" },
  { web: "/dashboard/teacher/classes/[id]", mobile: "TeacherClassDetail", coverage: "stack" },
  { web: "/dashboard/teacher/classes/[id]/ai-draft", mobile: "TeacherAiDraft", coverage: "stack" },
  { web: "/dashboard/teacher/classes/[id]/modules/[moduleId]", mobile: "TeacherModuleDetail", coverage: "stack" },
  { web: "/dashboard/teacher/classes/[id]/modules/[moduleId]/files/[fileId]", mobile: "TeacherModuleFileDetail", coverage: "stack" },
  { web: "/dashboard/teacher/classes/[id]/students/add", mobile: "TeacherClassAddStudents", coverage: "stack" },
  { web: "/dashboard/teacher/classes/[id]/students/[studentId]", mobile: "TeacherClassStudentOverview", coverage: "stack" },
  { web: "/dashboard/teacher/sections", mobile: "Sections", coverage: "drawer" },
  { web: "/dashboard/teacher/sections/[id]/roster", mobile: "TeacherSectionDetail", coverage: "stack" },
  { web: "/dashboard/teacher/sections/[id]/students/add", mobile: "TeacherSectionAddStudents", coverage: "stack" },
  { web: "/dashboard/teacher/sections/[id]/students/[studentId]", mobile: "TeacherSectionStudentProfile", coverage: "stack" },
  { web: "/dashboard/teacher/assessments", mobile: "Assessments", coverage: "drawer" },
  { web: "/dashboard/teacher/assessments/[id]", mobile: "TeacherAssessmentDetail", coverage: "stack" },
  { web: "/dashboard/teacher/assessments/[id]/edit", mobile: "TeacherAssessmentEditor", coverage: "stack" },
  { web: "/dashboard/teacher/assessments/[id]/results/[attemptId]", mobile: "TeacherAssessmentAttemptResult", coverage: "stack" },
  { web: "/dashboard/teacher/lessons", mobile: "TeacherLessons", coverage: "drawer" },
  { web: "/dashboard/teacher/lessons/[id]/view", mobile: "TeacherLessonDetail", coverage: "stack" },
  { web: "/dashboard/teacher/lessons/[id]/edit", mobile: "TeacherLessonEditor", coverage: "stack" },
  { web: "/dashboard/teacher/library", mobile: "TeacherLibrary", coverage: "drawer" },
  { web: "/dashboard/teacher/calendar", mobile: "TeacherCalendar", coverage: "drawer" },
  { web: "/dashboard/teacher/announcements", mobile: "TeacherAnnouncements", coverage: "drawer" },
  { web: "/dashboard/teacher/class-record", mobile: "TeacherClassRecord", coverage: "drawer" },
  { web: "/dashboard/teacher/performance", mobile: "TeacherPerformance", coverage: "drawer" },
  { web: "/dashboard/teacher/interventions", mobile: "TeacherInterventions", coverage: "drawer" },
  { web: "/dashboard/teacher/interventions/[caseId]", mobile: "TeacherInterventionDetail", coverage: "stack" },
  { web: "/dashboard/teacher/evaluations", mobile: "TeacherEvaluations", coverage: "drawer" },
  { web: "/dashboard/teacher/reports", mobile: "TeacherReports", coverage: "drawer" },
  { web: "/dashboard/teacher/profile", mobile: "Profile", coverage: "drawer" },
  { web: "/dashboard/teacher/extractions/[id]", mobile: "TeacherExtractionDetail", coverage: "stack" },
] as const satisfies ReadonlyArray<TeacherWebRouteMapping>;
