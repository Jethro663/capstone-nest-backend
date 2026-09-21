import fs from "node:fs";
import path from "node:path";

function read(file: string) {
  return fs.readFileSync(path.resolve(__dirname, "..", file), "utf8");
}

describe("teacher guided workbench layout contracts", () => {
  it("keeps Teacher Home task-oriented without stat cards", () => {
    const source = read("TeacherHomeScreen.tsx");
    expect(source).not.toContain("TeacherStats");
    expect(source).toContain(">Next up</Text>");
    for (const label of ["Today", "Priority", "Your classes", "Recent update"]) {
      expect(source).toContain(`title=\"${label}\"`);
    }
  });

  it.each([
    ["TeacherAssessmentDetailScreen.tsx", ["MobileFilterSheet", "TeacherSegmentedTabs", "TeacherActionSheet"]],
    ["TeacherSectionDetailScreen.tsx", ["TeacherContextStrip", "TeacherSegmentedTabs", "TeacherSearch"]],
    ["TeacherLessonsScreen.tsx", ["TeacherSelectMenu", "TeacherSegmentedTabs", "TeacherActionSheet"]],
    ["TeacherLibraryScreen.tsx", ["TeacherSelectMenu", "TeacherSegmentedTabs", "TeacherFlatSection"]],
    ["TeacherAnnouncementsScreen.tsx", ["TeacherSelectMenu", "TeacherSegmentedTabs", "TeacherFlatSection"]],
    ["TeacherReportsScreen.tsx", ["TeacherSelectMenu", "TeacherSegmentedTabs", "TeacherFlatSection"]],
    ["TeacherInterventionsScreen.tsx", ["TeacherSelectMenu", "TeacherSegmentedTabs", "TeacherFlatSection"]],
    ["TeacherPerformanceScreen.tsx", ["TeacherSelectMenu", "TeacherSegmentedTabs", "TeacherSummaryStrip"]],
    ["TeacherEvaluationsScreen.tsx", ["TeacherSegmentedTabs", "TeacherSummaryStrip", "TeacherFlatSection"]],
  ])("migrates %s to the shared workbench primitives", (file, primitives) => {
    const source = read(file);
    expect(source).not.toContain("TeacherStats");
    for (const primitive of primitives) expect(source).toContain(primitive);
  });

  it("keeps the evidence-bearing AcademicWorkbook instead of summary cards", () => {
    const source = read("TeacherClassRecordScreen.tsx");
    expect(source).toContain("AcademicWorkbook");
    expect(source).toContain("TeacherSelectMenu");
    expect(source).not.toContain("TeacherStats");
  });

  it("keeps missing assessment rows non-actionable without an attempt", () => {
    const source = read("TeacherAssessmentDetailScreen.tsx");
    expect(source).toContain("submission.latestAttemptId");
    expect(source).toContain('type SubmissionFilter = "all" | "turned_in" | "missing" | "not_started" | "returned"');
    expect(source).toContain('type SubmissionSort = "recent" | "name" | "status"');
  });
});
