import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const screen = (name: string) =>
  readFileSync(path.resolve(__dirname, `../${name}.tsx`), "utf8");

describe("active mobile design generation", () => {
  it.each([
    "AssessmentHistoryScreen",
    "AssessmentResultsScreen",
    "TranscriptScreen",
    "CalendarScreen",
    "ProfileScreen",
  ])("uses the current student workspace shell in %s", (name) => {
    expect(screen(name)).toContain("StudentScreen");
  });

  it.each([
    "TeacherClassesScreen",
    "TeacherSectionsScreen",
    "TeacherAssessmentsScreen",
    "TeacherCalendarScreen",
    "TeacherProfileScreen",
  ])("composes current teacher workspace primitives in %s", (name) => {
    expect(screen(name)).toContain("TeacherWorkspacePrimitives");
  });

  it("composes Teacher Home from the shared navy brand system", () => {
    expect(screen("TeacherHomeScreen")).toContain("mobileBrand");
    expect(screen("TeacherHomeScreen")).toContain('testID="teacher-next-up"');
  });

  it.each([
    "DashboardScreen",
    "LessonsScreen",
    "AssessmentsScreen",
    "AnnouncementsScreen",
  ])("removes the unreachable legacy render tree from %s", (name) => {
    const value = screen(name);
    expect(value).not.toMatch(
      /if \((studentDarkTheme|darkTheme|theme)\.bg === "#FBFAF8"\)/,
    );
    expect(value).not.toContain("RoleMenuButton");
    expect(value).toMatch(
      /Student(Home|Classes|Assessments|Announcements)View/,
    );
  });

  it("removes unused placeholder factories from the production navigator", () => {
    const navigator = readFileSync(
      path.resolve(__dirname, "../../navigation/AppNavigator.tsx"),
      "utf8",
    );
    expect(navigator).not.toContain("StudentRoutePlaceholder");
    expect(navigator).not.toContain("createTabPlaceholderScreen");
    expect(navigator).not.toContain("createStackPlaceholderScreen");
  });

  it.each([
    "LxpScreen.tsx",
    "AiTutorScreen.tsx",
    "TeacherUnsupportedScreen.tsx",
    "ProgressScreen.tsx",
    "RoleWorkspaceScreen.tsx",
  ])("removes dormant production screen %s", (file) => {
    expect(existsSync(path.resolve(__dirname, `../${file}`))).toBe(false);
  });
});
