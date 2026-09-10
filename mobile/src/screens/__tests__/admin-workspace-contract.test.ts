import fs from "node:fs";
import path from "node:path";

function readScreen(name: string) {
  return fs.readFileSync(path.resolve(__dirname, `../${name}.tsx`), "utf8");
}

describe("administrator mobile workspace design contract", () => {
  const screenNames = [
    "AdminHomeScreen",
    "AdminClassesScreen",
    "AdminAssessmentsScreen",
    "AdminAnnouncementsScreen",
    "AdminToolsScreen",
    "AdminAcademicScreen",
    "AdminProfileScreen",
  ];

  it.each(screenNames)("uses admin-owned flat primitives on %s", (screenName) => {
    const source = readScreen(screenName);
    expect(source).toContain("components/admin/AdminMobilePrimitives");
    expect(source).not.toContain("components/teacher/TeacherMobilePrimitives");
    expect(source).not.toMatch(/\bTeacher(?:Panel|Stats|Row|Chip|Search|Screen)\b/);
  });

  it.each([
    "AdminClassesScreen",
    "AdminAssessmentsScreen",
    "AdminAnnouncementsScreen",
    "AdminToolsScreen",
  ])("uses the standard filter bar on %s", (screenName) => {
    expect(readScreen(screenName)).toContain("<AdminFilterBar");
  });

  it("makes Home a short operational review instead of a module button cloud", () => {
    const source = readScreen("AdminHomeScreen");
    expect(source).toContain('title="Review and act"');
    expect(source).toContain("AdminMetricStrip");
    expect(source).not.toContain("openTool");
    expect(source).not.toContain('navigate("AdminTools"');
    expect(source).not.toContain("Administration modules");
  });

  it("removes the eleven-chip tool switcher from dedicated tool routes", () => {
    const source = readScreen("AdminToolsScreen");
    expect(source).toContain("adminToolForRoute");
    expect(source).not.toContain("setTool");
    expect(source).not.toContain("tools.map");
  });

  it("distinguishes filtered empty states from truly empty data", () => {
    for (const screenName of ["AdminClassesScreen", "AdminAssessmentsScreen", "AdminAnnouncementsScreen"]) {
      const source = readScreen(screenName);
      expect(source).toContain("Clear filters");
    }
  });
});
