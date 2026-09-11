import fs from "node:fs";
import path from "node:path";

const read = (file: string) =>
  fs.readFileSync(path.resolve(__dirname, "..", file), "utf8");

describe("web-mirrored administrator System Settings", () => {
  it("provides one overview and five bounded task destinations", () => {
    const overview = read("AdminSettingsOverviewScreen.tsx");
    expect(overview).toContain("AdminStudentReadiness");
    expect(overview).toContain("AdminSettingsAcademicYear");
    expect(overview).toContain("AdminSettingsAssessmentsGrading");
    expect(overview).toContain("AdminSettingsYearTransition");
    expect(overview).toContain("AdminSettingsLearnerCompletion");
    expect(overview).toContain("AdminSettingsAuditRecovery");
    for (const file of [
      "AdminAcademicYearSettingsScreen.tsx",
      "AdminAssessmentsGradingSettingsScreen.tsx",
      "AdminYearTransitionSettingsScreen.tsx",
      "AdminLearnerCompletionSettingsScreen.tsx",
      "AdminAuditRecoverySettingsScreen.tsx",
    ])
      expect(read(file)).toContain("AdminAcademicScreen");
  });

  it("registers the settings overview as the drawer root and task pages in the admin stack", () => {
    const navigator = read("../navigation/AppNavigator.tsx");
    for (const [route, component] of [
      ["AdminSettings", "AdminSettingsOverviewScreen"],
      ["AdminSettingsAcademicYear", "AdminAcademicYearSettingsScreen"],
      [
        "AdminSettingsAssessmentsGrading",
        "AdminAssessmentsGradingSettingsScreen",
      ],
      ["AdminSettingsYearTransition", "AdminYearTransitionSettingsScreen"],
      [
        "AdminSettingsLearnerCompletion",
        "AdminLearnerCompletionSettingsScreen",
      ],
      ["AdminSettingsAuditRecovery", "AdminAuditRecoverySettingsScreen"],
      ["AdminStudentReadiness", "AdminStudentReadinessScreen"],
    ]) {
      expect(navigator).toMatch(
        new RegExp(`name="${route}"\\s+component=\\{${component}\\}`),
      );
    }
  });

  it("mirrors the web student academic readiness evidence route without duplicating outcome mutations", () => {
    const source = read("AdminStudentReadinessScreen.tsx");
    expect(source).toContain("sectionsApi.getAccessStudentsOverview");
    expect(source).toContain("sectionsApi.getPage");
    expect(source).toContain("finalizationLabel");
    expect(source).toContain("blockers");
    expect(source).toContain("TeacherClassDetail");
    expect(source).toContain('initialTab: "classRecord"');
    expect(source).not.toContain("moveUpStudents");
    expect(source).not.toContain("graduateStudents");
  });

  it("keeps preview, authentication, confirmation, execution, and audit evidence in focused workspaces", () => {
    const source = read("AdminAcademicScreen.tsx");
    expect(source).toContain('workspace === "year-transition"');
    expect(source).toContain("getImpactPreview");
    expect(source).toContain("currentPassword");
    expect(source).toContain("transitionConfirmationText");
    expect(source).toContain("AcademicRecoveryPanel");
    expect(source).toContain("manifestHash");
  });
});
