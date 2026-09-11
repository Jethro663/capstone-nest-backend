import fs from "node:fs";
import path from "node:path";

const read = (file: string) =>
  fs.readFileSync(path.resolve(__dirname, "..", file), "utf8");

describe("web-mirrored administrator System Settings", () => {
  it("provides one overview and six bounded task destinations", () => {
    const overview = read("AdminSettingsOverviewScreen.tsx");
    expect(overview).toContain("AdminStudentReadiness");
    expect(overview).toContain("AdminSettingsAcademicYear");
    expect(overview).toContain("AdminSettingsAssessmentsGrading");
    expect(overview).toContain("AdminSettingsYearTransition");
    expect(overview).toContain("AdminSettingsLearnerCompletion");
    expect(overview).toContain("AdminSettingsAuditRecovery");
    expect(overview).toContain("AdminSettingsDemoMode");
    for (const file of [
      "AdminAcademicYearSettingsScreen.tsx",
      "AdminAssessmentsGradingSettingsScreen.tsx",
      "AdminYearTransitionSettingsScreen.tsx",
      "AdminLearnerCompletionSettingsScreen.tsx",
      "AdminAuditRecoverySettingsScreen.tsx",
      "AdminDemoModeSettingsScreen.tsx",
    ])
      expect(read(file)).toMatch(/AdminAcademicScreen|AdminScreen/);
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
      ["AdminSettingsDemoMode", "AdminDemoModeSettingsScreen"],
    ]) {
      expect(navigator).toMatch(
        new RegExp(`name="${route}"\\s+component=\\{${component}\\}`),
      );
    }
  });

  it("keeps native Demo mode activation governed and offline-safe", () => {
    const source = read("AdminDemoModeSettingsScreen.tsx");
    expect(source).toContain("currentPassword");
    expect(source).toContain("ENABLE DEMO MODE");
    expect(source).toContain("DISABLE DEMO MODE");
    expect(source).toContain("SHARED_DATA_CAN_CHANGE");
    expect(source).toContain("ACTIONS_REMAIN_AUDITED");
    expect(source).toContain("HARD_SAFEGUARDS_REMAIN");
    expect(source).toContain("secureTextEntry");
    expect(source).toContain("isOffline");
    expect(source).toContain("Alert.alert");
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
