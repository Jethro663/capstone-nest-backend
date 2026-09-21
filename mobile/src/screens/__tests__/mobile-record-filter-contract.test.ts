import fs from "node:fs";
import path from "node:path";

const screen = (file: string) =>
  fs.readFileSync(path.resolve(__dirname, "..", file), "utf8");
const component = (file: string) =>
  fs.readFileSync(
    path.resolve(__dirname, "../../components/teacher", file),
    "utf8",
  );

describe("shared mobile record-filter contract", () => {
  it.each([
    ["TeacherClassesScreen.tsx", 'label="Class status"'],
    ["TeacherSectionsScreen.tsx", 'label="Section status"'],
    ["TeacherLibraryScreen.tsx", 'label="Folder"'],
    ["TeacherAnnouncementsScreen.tsx", 'label="Filter announcements"'],
    ["TeacherCalendarScreen.tsx", 'label="Class filter"'],
    ["TeacherEvaluationsScreen.tsx", 'label="Evaluation type"'],
    ["TeacherInterventionsScreen.tsx", 'label="Case status"'],
    ["TeacherPerformanceScreen.tsx", 'label="Comparison group"'],
  ])("uses the shared selector on %s", (file, marker) => {
    expect(screen(file)).toContain("TeacherSelectMenu");
    expect(screen(file)).toContain(marker);
  });

  it("uses the shared selector for discussion and extraction history", () => {
    expect(component("TeacherDiscussionBoard.tsx")).toContain(
      'label="Thread status"',
    );
    expect(component("TeacherExtractionBoard.tsx")).toContain(
      'label="Extraction status"',
    );
  });

  it.each([
    ["student-announcements/StudentAnnouncementsView.tsx", 'label="Announcement status"'],
    ["student-assessments/StudentAssessmentsView.tsx", 'label="Assessment status"'],
  ])("uses one student selector on %s", (file, marker) => {
    const source = screen(file);
    expect(source).toContain("StudentSelectMenu");
    expect(source).toContain(marker);
    expect(source).not.toContain("StudentSegmentedControl");
  });
});
