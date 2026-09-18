import { readFileSync } from "node:fs";
import path from "node:path";

const source = (name: string) =>
  readFileSync(path.resolve(__dirname, `../${name}`), "utf8");

describe("bounded mobile workspace consumers", () => {
  it.each([
    "CoursesScreen.tsx",
    "TeacherHomeScreen.tsx",
    "CalendarScreen.tsx",
    "TeacherCalendarScreen.tsx",
  ])(
    "uses the aggregate workspace contract without per-class useQueries in %s",
    (file) => {
      const value = source(file);
      expect(value).toContain("mobileWorkspaceApi");
      expect(value).not.toContain("useQueries");
    },
  );

  it("keeps the active Lessons compatibility path bounded to its selected class", () => {
    const value = source("LessonsScreen.tsx");
    expect(value).not.toMatch(/classIds\.map\s*\(/);
    expect(value).not.toContain("useQueries");
  });

  it("loads the teacher module library through one bounded workspace request", () => {
    const value = source("TeacherLibraryScreen.tsx");
    expect(value).toContain("getTeacherLibraryIndex");
    expect(value).not.toContain("useQueries");
    expect(value).not.toContain("modulesApi.getByClass");
  });

  it.each([
    ["CoursesScreen.tsx", "getStudentOverviewForUser"],
    ["LessonsScreen.tsx", "getStudentOverviewForUser"],
    ["TeacherHomeScreen.tsx", "getTeacherOverviewForUser"],
    ["CalendarScreen.tsx", "getCalendarForUser"],
    ["TeacherCalendarScreen.tsx", "getCalendarForUser"],
  ])("renders explicit read-only snapshot state in %s", (file, method) => {
    const value = source(file);
    expect(value).toContain(method);
    expect(value).toContain("OfflineWorkspaceNotice");
    expect(value).toContain("offlineState");
  });

  it("passes read-only state into every student class card action", () => {
    const lessons = source("LessonsScreen.tsx");
    const classesView = readFileSync(
      path.resolve(__dirname, "../student-classes/StudentClassesView.tsx"),
      "utf8",
    );
    expect(lessons).toContain("readOnlyOffline={offline}");
    expect(classesView).toContain("readOnlyOffline");
    expect(classesView).toContain("disabled={readOnlyOffline}");
  });
});
