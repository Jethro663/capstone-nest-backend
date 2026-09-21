import fs from "node:fs";
import path from "node:path";

describe("teacher lesson preview contract", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "TeacherLessonDetailScreen.tsx"), "utf8");

  it("offers truthful mobile and web modes with a dedicated scrollable web preview", () => {
    expect(source).toContain('label: "Mobile"');
    expect(source).toContain('label: "Web"');
    expect(source).not.toContain('label: "Compare"');
    expect(source).not.toContain('"compare"');
    expect(source).toContain("LessonBlockRenderer");
    expect(source).toContain("WebView");
    expect(source).toContain("createPreviewSession");
    expect(source).toContain("nestedScrollEnabled");
    expect(source).toContain("scrollEnabled");
  });

  it("reviews a version detail before timestamp-guarded restore", () => {
    expect(source).toContain("getVersionDetail");
    expect(source).toContain("expectedLessonUpdatedAt");
    expect(source).toContain("TeacherCenteredDialog");
    expect(source).not.toContain('label="Restore"');
  });
});
