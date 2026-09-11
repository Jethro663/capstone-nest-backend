import fs from "node:fs";
import path from "node:path";

const read = (relative: string) =>
  fs.readFileSync(path.resolve(__dirname, "..", relative), "utf8");

describe("administrator class-template workspace", () => {
  it("is contextual from Classes and no longer runs as an AdminTools conditional", () => {
    const navigator = read("../navigation/AppNavigator.tsx").replace(
      /\s+/g,
      " ",
    );
    const classes = read("AdminClassesWorkspaceScreen.tsx");
    expect(classes).toContain('navigate("AdminTemplates"');
    expect(navigator).toContain(
      '<Tab.Screen name="AdminTemplates" component={AdminTemplatesScreen}',
    );
    expect(navigator).toContain(
      '<RootStack.Screen name="AdminTemplateDetail" component={AdminTemplateDetailScreen}',
    );
    expect(navigator).not.toContain(
      '<Tab.Screen name="AdminTemplates" component={AdminToolsScreen}',
    );
  });

  it("offers structured content authoring plus import, export, image, publish, and delete flows", () => {
    const list = read("AdminTemplatesScreen.tsx");
    const detail = read("AdminTemplateDetailScreen.tsx");
    for (const token of [
      "getCompatible",
      "validateEngineImport",
      "importEngine",
    ])
      expect(list).toContain(token);
    for (const token of [
      "updateContent",
      "uploadAssessmentImage",
      "exportEngine",
      "publish",
      "remove",
    ])
      expect(detail).toContain(token);
    for (const label of ["Modules", "Lessons", "Assessments", "Announcements"])
      expect(detail).toContain(label);
    expect(detail).not.toContain("JSON.stringify(content");
  });
});
