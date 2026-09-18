import fs from "node:fs";
import path from "node:path";

describe("teacher lesson preview contract", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "TeacherLessonDetailScreen.tsx"), "utf8");

  it("offers exact mobile, web, and comparison modes", () => {
    expect(source).toContain('label: "Mobile"');
    expect(source).toContain('label: "Web"');
    expect(source).toContain('label: "Compare"');
    expect(source).toContain("LessonBlockRenderer");
    expect(source).toContain("WebView");
    expect(source).toContain("createPreviewSession");
  });

  it("reviews a version detail before timestamp-guarded restore", () => {
    expect(source).toContain("getVersionDetail");
    expect(source).toContain("expectedLessonUpdatedAt");
    expect(source).toContain("TeacherCenteredDialog");
    expect(source).not.toContain('label="Restore"');
  });
});
