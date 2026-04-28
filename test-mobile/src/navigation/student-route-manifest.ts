function concatRouteNames<const T extends readonly string[], const U extends readonly string[]>(
  first: T,
  second: U,
) {
  return [...first, ...second] as const;
}

export const studentRouteManifest = {
  tabs: ["Dashboard", "Classes", "Assessments", "JA", "Announcements", "Profile"] as const,
  stack: [
    "ClassDetail",
    "ModuleDetail",
    "Courses",
    "Lessons",
    "LessonDetail",
    "AssessmentDetail",
    "AssessmentTake",
    "AssessmentResults",
    "AssessmentHistory",
    "Chatbot",
    "Performance",
    "Transcript",
    "LXP",
  ] as const,
  support: ["ClassWorkspace", "AiTutor"] as const,
} as const;

export const studentTabRouteNames = studentRouteManifest.tabs;
export const studentStackRouteNames = studentRouteManifest.stack;
export const studentSupportRouteNames = studentRouteManifest.support;

export const studentParityRouteNames = concatRouteNames(studentTabRouteNames, studentStackRouteNames);
export const studentMountedStackRouteNames = concatRouteNames(
  studentStackRouteNames,
  studentSupportRouteNames,
);

export type StudentTabRouteName = (typeof studentTabRouteNames)[number];
export type StudentStackRouteName = (typeof studentStackRouteNames)[number];
export type StudentParityRouteName = (typeof studentParityRouteNames)[number];
export type StudentSupportRouteName = (typeof studentSupportRouteNames)[number];
export type StudentMountedStackRouteName = (typeof studentMountedStackRouteNames)[number];
