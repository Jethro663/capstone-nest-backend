import fs from "node:fs";
import path from "node:path";

function readScreen(name: string) {
  return fs.readFileSync(path.resolve(__dirname, `../${name}.tsx`), "utf8");
}

describe("administrator mobile workspace design contract", () => {
  const screenNames = [
    "AdminHomeScreen",
    "AdminClassesScreen",
    "AdminAssessmentsScreen",
    "AdminAnnouncementsScreen",
    "AdminToolsScreen",
    "AdminAcademicScreen",
    "AdminProfileScreen",
  ];

  it.each(screenNames)(
    "uses admin-owned flat primitives on %s",
    (screenName) => {
      const source = readScreen(screenName);
      expect(source).toContain("components/admin/AdminMobilePrimitives");
      expect(source).not.toContain(
        "components/teacher/TeacherMobilePrimitives",
      );
      expect(source).not.toMatch(
        /\bTeacher(?:Panel|Stats|Row|Chip|Search|Screen)\b/,
      );
    },
  );

  it.each([
    "AdminClassesScreen",
    "AdminAssessmentsScreen",
    "AdminAnnouncementsScreen",
  ])("uses the standard filter bar on %s", (screenName) => {
    expect(readScreen(screenName)).toContain("<AdminFilterBar");
  });

  it("makes Home a short operational review instead of a module button cloud", () => {
    const source = readScreen("AdminHomeScreen");
    expect(source).toContain('title="Review and act"');
    expect(source).toContain("AdminMetricStrip");
    expect(source).toContain("academicStateService.getCurrent");
    expect(source).toContain("adminApi.getAuditPage({ page: 1, limit: 5 })");
    expect(source).toContain('title="Current academic state"');
    expect(source).toContain('title="Needs attention"');
    expect(source).toContain('title="Recent operations"');
    expect(source).not.toContain("openTool");
    expect(source).not.toContain('navigate("AdminTools"');
    expect(source).not.toContain("Administration modules");
  });

  it("makes the legacy AdminTools route a migration redirect with no production domain branches", () => {
    const source = readScreen("AdminToolsScreen");
    expect(source).toContain("legacyAdminRouteForSection");
    expect(source).toContain('navigate("MainTabs"');
    expect(source).not.toContain("tool ===");
    expect(source).not.toContain("useQuery");
  });

  it("includes grade level in the mobile student creation contract", () => {
    const source = readScreen("AdminCreateUserScreen");
    expect(source).toContain("label={`Grade ${entry}`}");
    expect(source).toContain("{ lrn: lrn.trim(), gradeLevel }");
    expect(source).toContain('role === "student"');
  });

  it("distinguishes filtered empty states from truly empty data", () => {
    for (const screenName of [
      "AdminClassesScreen",
      "AdminAssessmentsScreen",
      "AdminAnnouncementsScreen",
    ]) {
      const source = readScreen(screenName);
      expect(source).toContain("Clear filters");
    }
  });

  it("matches the web user purge guard with deleted-state and typed-name confirmation", () => {
    const source = readScreen("AdminUserDetailScreen");
    expect(source).toContain("adminApi.purgeUser");
    expect(source).toContain("purgeConfirmName");
    expect(source).toContain("fullName");
    expect(source).toContain('record.status === "DELETED"');
  });

  it("uses the exact user-lifecycle capability without weakening permanent purge", () => {
    const source = readScreen("AdminUserDetailScreen");
    expect(source).toContain("useAdminDemoMode");
    expect(source).toContain("hasExactRule");
    expect(source).toContain('"user_lifecycle_sequence"');
    expect(source).toContain("canEditDeletedUser");
    expect(source).toContain("canDirectArchive");
    expect(source).toContain("canReactivateDeletedUser");
    expect(source).toContain("demoMode.refresh()");
    expect(source).toContain("purgeConfirmName !== exactName");
  });

  it("keeps the web bulk-user lifecycle and visible export tasks available", () => {
    const source = readScreen("AdminUsersScreen");
    expect(source).toContain("adminApi.bulkUserLifecycle");
    expect(source).toContain("Select all visible");
    expect(source).toContain("Export visible");
    expect(source).toContain("result.data.failed");
  });

  it("matches the web user-detail edit contract without typed transport dates", () => {
    const source = readScreen("AdminUserDetailScreen");
    expect(source).toContain("adminApi.updateUser");
    for (const field of [
      "First name",
      "Middle name",
      "Last name",
      "Email",
      "LRN",
      "Grade level",
      "Date of birth",
      "Gender",
      "Phone",
      "Address",
      "Guardian name",
      "Relationship",
      "Guardian contact",
    ]) {
      expect(source).toContain(field);
    }
    expect(source).toContain("DateTimePicker");
    expect(source).toContain("handleBack");
    expect(source).not.toContain('label="ISO');
  });

  it("marks cached offline lists and uses skeletons without replacing retained rows", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../../components/admin/AdminPaginatedList.tsx"),
      "utf8",
    );
    expect(source).toContain("initialLoading");
    expect(source).toContain("AdminSkeletonRows");
    expect(source).toContain("Offline · cached");
    expect(source).toContain("lastUpdatedAt");
  });

  it("keeps list screens mounted behind details so Back restores local list state", () => {
    const navigator = fs.readFileSync(
      path.resolve(__dirname, "../../navigation/AppNavigator.tsx"),
      "utf8",
    );
    expect(navigator).toContain('backBehavior="history"');
    expect(navigator).toContain('name="AdminUserDetail"');
    expect(navigator).toContain('name="AdminSectionDetail"');
  });

  it.each([
    "AdminAcademicScreen",
    "AdminRosterScreen",
    "AdminCreateUserScreen",
  ])("fails high-risk writes closed while offline on %s", (screenName) => {
    const source = readScreen(screenName);
    expect(source).toContain("useAdminNetworkStatus");
    expect(source).toContain("network.isOffline");
    expect(source).toContain("never queued");
  });
});
