import {
  studentParityRouteInventory,
  studentSupportRouteInventory,
} from "../../screens/screen-flow";
import type { MainTabParamList, RootStackParamList } from "../../navigation/types";

const studentTabRoutes = [
  "Dashboard",
  "Classes",
  "Assessments",
  "JA",
  "Announcements",
  "Profile",
] as const satisfies ReadonlyArray<keyof MainTabParamList>;

const studentStackRoutes = [
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
] as const satisfies ReadonlyArray<keyof RootStackParamList>;

const studentSupportRoutes = [
  "ClassWorkspace",
  "AiTutor",
] as const satisfies ReadonlyArray<keyof RootStackParamList>;

describe("student parity navigation", () => {
  it("keeps the required student route set typed across tabs and stack routes", () => {
    expect(studentTabRoutes).toEqual([
      "Dashboard",
      "Classes",
      "Assessments",
      "JA",
      "Announcements",
      "Profile",
    ]);

    expect(studentStackRoutes).toEqual([
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
    ]);

    expect(studentSupportRoutes).toEqual([
      "ClassWorkspace",
      "AiTutor",
    ]);

    expect(studentParityRouteInventory.map((route) => route.name)).toEqual([
      "Dashboard",
      "Classes",
      "ClassDetail",
      "ModuleDetail",
      "Courses",
      "Lessons",
      "LessonDetail",
      "Assessments",
      "AssessmentDetail",
      "AssessmentTake",
      "AssessmentResults",
      "AssessmentHistory",
      "Announcements",
      "JA",
      "LXP",
      "Chatbot",
      "Performance",
      "Profile",
      "Transcript",
    ]);

    expect(studentSupportRouteInventory.map((route) => route.name)).toEqual([
      "ClassWorkspace",
      "AiTutor",
    ]);
  });
});
