import fs from "node:fs";
import path from "node:path";

const readType = (file: string) =>
  fs.readFileSync(path.resolve(__dirname, "..", file), "utf8");

const readScreen = (file: string) =>
  fs.readFileSync(path.resolve(__dirname, "../../screens", file), "utf8");

const declaration = (source: string, name: string) => {
  const match = source.match(
    new RegExp(
      `export (?:interface|type) ${name}(?=\\s|=|\\{)[\\s\\S]*?(?=\\nexport (?:interface|type)|$)`,
    ),
  );
  expect(match).not.toBeNull();
  return match?.[0] ?? "";
};

describe("administrator shared contract field parity", () => {
  it("keeps the complete class-scoped student profile and overview envelopes", () => {
    const source = readType("class.ts");
    const profile = declaration(source, "TeacherClassStudentProfile");
    const overview = declaration(source, "TeacherClassStudentOverview");
    const history = declaration(source, "TeacherStudentAssessmentHistoryItem");

    expect(profile).toContain("classInfo:");
    expect(profile).toContain("student:");
    expect(profile).toContain("section:");
    expect(profile).toContain("familyRelationship");
    expect(profile).toContain("roomNumber");
    expect(overview).toContain("section:");
    expect(overview).toContain("id: string");
    for (const field of [
      "status:",
      "returnedAt",
      "isLate",
      "lateByMinutes",
      "directScore",
      "passed",
      "isReturned",
    ]) {
      expect(history).toContain(field);
    }
  });

  it("retains lifecycle and content fields returned to both web and mobile", () => {
    expect(declaration(readType("profile.ts"), "StudentProfile")).toContain(
      "graduatedAt",
    );

    const announcement = declaration(
      readType("announcement.ts"),
      "Announcement",
    );
    expect(announcement).toContain("class?:");
    expect(announcement).toContain("section:");

    const assessment = declaration(readType("assessment.ts"), "Assessment");
    for (const field of [
      "templateId",
      "templateSourceId",
      "studentActivity",
      "createdAt",
      "updatedAt",
    ]) {
      expect(assessment).toContain(field);
    }
  });

  it("retains and presents every state-alignment evidence collection", () => {
    const source = readType("academic-grading.ts");
    const preview = declaration(source, "AcademicAlignmentPreview");
    for (const field of [
      "policies:",
      "proposedPolicies:",
      "candidates:",
      "selectedClasses:",
      "sections:",
      "ambiguousCounts:",
    ]) {
      expect(preview).toContain(field);
    }

    const screen = readScreen("AdminAcademicScreen.tsx");
    expect(screen).toContain("Alignment evidence");
    expect(screen).toContain("alignmentPreview.policies");
    expect(screen).toContain("alignmentPreview.candidates");
    expect(screen).toContain("alignmentPreview.sections");
    expect(screen).toContain("alignmentPreview.ambiguousCounts");
  });
});
