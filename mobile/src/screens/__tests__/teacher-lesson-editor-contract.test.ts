import fs from "node:fs";
import path from "node:path";

describe("teacher lesson editor workbench contract", () => {
  it("uses the focused typed editor and all eleven authoring choices", () => {
    const source = fs.readFileSync(path.join(__dirname, "..", "TeacherLessonEditorScreen.tsx"), "utf8");
    expect(source).toContain("TeacherSegmentedTabs");
    expect(source).toContain("LessonBlockEditorDialog");
    expect(source).toContain("LESSON_BLOCK_CHOICES");
    expect(source).toContain("MobileRichTextEditor");
    expect(source).toContain('label="Add here"');
    expect(source).not.toContain("extractLessonBlockText");
  });

  it("exports the new focused screen instead of the legacy deep-parity editor", () => {
    const barrel = fs.readFileSync(path.join(__dirname, "..", "TeacherDeepParity.ts"), "utf8");
    expect(barrel).toContain('export { TeacherLessonEditorScreen } from "./TeacherLessonEditorScreen"');
    expect(barrel).not.toMatch(/TeacherLessonEditorScreen,\s*\n/);
  });
});
