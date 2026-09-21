import fs from "node:fs";
import path from "node:path";

describe("teacher module outline contract", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "TeacherModuleDetailScreen.tsx"), "utf8");

  it("keeps settings in context, exposes quiet labeled overflow actions and per-section insertion, and supports arrange mode", () => {
    expect(source).toContain('statusPlacement="leading"');
    expect(source).toContain('label="Module settings"');
    expect(source).toContain("MobileOverflowAction");
    expect(source).toContain("More actions for section");
    expect(source).toContain("More actions for ${itemTitle}");
    expect(source).not.toContain('label="Manage section"');
    expect(source).not.toContain('label="Manage item"');
    expect(source).toContain('label="Add content"');
    expect(source).toContain('"Arrange"');
    expect(source).toContain("TeacherCenteredDialog");
    expect(source).not.toContain("TeacherQuickActionRail");
    expect(source).not.toContain('name="dots-horizontal"');
  });

  it("keeps module item kinds closed to the backend enum", () => {
    const types = fs.readFileSync(path.join(__dirname, "..", "..", "types", "module.ts"), "utf8");
    const api = fs.readFileSync(path.join(__dirname, "..", "..", "api", "services", "modules.ts"), "utf8");
    expect(types).toContain('export type ModuleItemType = "lesson" | "assessment" | "file"');
    expect(types).not.toContain('"file" | string');
    expect(api).toContain("itemType: ModuleItemType");
  });
});
