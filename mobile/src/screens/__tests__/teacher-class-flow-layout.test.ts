import fs from "node:fs";
import path from "node:path";

function source(file: string) {
  return fs.readFileSync(path.resolve(__dirname, "..", file), "utf8");
}

function exportedFunction(file: string, name: string, nextName: string) {
  const contents = source(file);
  const start = contents.indexOf(`export function ${name}`);
  const end = contents.indexOf(`export function ${nextName}`, start + 1);
  return contents.slice(start, end === -1 ? undefined : end);
}

describe("teacher class flow compact layouts", () => {
  it("uses one class workspace switcher and flat active sections", () => {
    const contents = source("TeacherClassDetailScreen.tsx");
    expect(contents).toContain("TeacherContextStrip");
    expect(contents).toContain("TeacherWorkspaceSwitcher");
    expect(contents).toContain("TeacherQuickActionRail");
    expect(contents).toContain("TeacherFlatSection");
    expect(contents).not.toContain("TeacherStats");
    expect(contents).not.toContain("<ScrollView");
    expect(contents).not.toContain('title="Class actions"');
    for (const key of ["modules", "assessments", "announcements", "extraction", "discussion", "classRecord", "calendar", "students"]) {
      expect(contents).toContain(`key: "${key}"`);
    }
  });

  it("makes Add Students a flat roster with locked scope and a sticky action", () => {
    const contents = exportedFunction(
      "TeacherDeepParityScreens.tsx",
      "TeacherClassAddStudentsScreen",
      "TeacherSectionAddStudentsScreen",
    );
    expect(contents).toContain("TeacherInlineNotice");
    expect(contents).toContain("TeacherStepTabs");
    expect(contents).toContain("TeacherFlatSection");
    expect(contents).toContain("TeacherBottomActionBar");
    expect(contents).toContain("bottomAction={");
    expect(contents).not.toContain("<TeacherPanel");
    expect(contents).not.toContain("<TeacherChip");
    expect(contents).not.toContain('title="Eligible students"');
  });

  it("uses an expandable module outline with sheet-based management and sticky add", () => {
    const contents = source("TeacherModuleDetailScreen.tsx");
    expect(contents).toContain("TeacherContextStrip");
    expect(contents).toContain("TeacherAccordionSection");
    expect(contents).toContain("TeacherActionSheet");
    expect(contents).toContain("TeacherBottomActionBar");
    expect(contents).toContain('primaryLabel="Add to module"');
    expect(contents).toContain('source: "module"');
    expect(contents).toContain("moduleId");
    expect(contents).not.toContain("TeacherStats");
    expect(contents).not.toContain("<TeacherPanel");
  });

  it("makes lesson content reading-first and moves controls and versions to a sheet", () => {
    const contents = source("TeacherLessonDetailScreen.tsx");
    expect(contents).toContain("TeacherContextStrip");
    expect(contents).toContain("TeacherFlatSection");
    expect(contents).toContain("TeacherActionSheet");
    expect(contents).toContain("TeacherBottomActionBar");
    expect(contents).toContain('primaryLabel="Edit lesson"');
    expect(contents).not.toContain("TeacherStats");
    expect(contents).not.toContain("<TeacherPanel");
    expect(contents.indexOf('title="Lesson content"')).toBeLessThan(
      contents.indexOf('title="Version history"'),
    );
  });

  it("organizes AI drafting into focused sources, setup, and review stages", () => {
    const contents = source("TeacherAiDraftScreen.tsx");
    expect(contents).toContain("TeacherStepTabs");
    expect(contents).toContain("TeacherContextStrip");
    expect(contents).toContain("TeacherFlatSection");
    expect(contents).toContain("TeacherBottomActionBar");
    expect(contents).toContain("TeacherActionSheet");
    expect(contents).toContain('key: "sources"');
    expect(contents).toContain('key: "setup"');
    expect(contents).toContain('key: "review"');
    expect(contents).not.toContain("TeacherStats");
    expect(contents).not.toContain("<TeacherPanel");
  });
});
