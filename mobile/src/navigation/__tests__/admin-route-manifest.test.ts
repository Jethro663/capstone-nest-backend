import fs from "node:fs";
import path from "node:path";

describe("administrator navigation manifest", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../AppNavigator.tsx"), "utf8");
  const adminSource = source.slice(source.indexOf("function AdminNavigator"), source.indexOf("type ActiveRouteState"));

  it.each([
    ["Home", "AdminHomeScreen"],
    ["AdminUsers", "AdminToolsScreen"],
    ["Classes", "AdminClassesScreen"],
    ["AdminRoster", "AdminToolsScreen"],
    ["Assessments", "AdminAssessmentsScreen"],
    ["AdminAnnouncements", "AdminAnnouncementsScreen"],
    ["AdminEvaluations", "AdminToolsScreen"],
    ["Academic", "AdminAcademicScreen"],
    ["AdminCalendar", "AdminToolsScreen"],
    ["AdminTemplates", "AdminToolsScreen"],
    ["AdminLibrary", "AdminToolsScreen"],
    ["AdminReports", "AdminToolsScreen"],
    ["AdminAudit", "AdminToolsScreen"],
    ["AdminDiagnostics", "AdminToolsScreen"],
    ["AdminSettings", "AdminToolsScreen"],
    ["Profile", "AdminProfileScreen"],
  ])("maps the %s drawer root to its truthful domain workspace", (name, component) => {
    expect(source).toContain(`<Tab.Screen name="${name}" component={${component}}`);
  });

  it("uses one drawer-led hidden tab navigator with retained history", () => {
    const adminDrawerSource = source.slice(source.indexOf("function AdminDrawerNavigator"), source.indexOf("function AdminNavigator"));
    expect(adminDrawerSource).toContain("<RoleDrawerProvider");
    expect(adminDrawerSource).toContain('role="admin"');
    expect(adminDrawerSource).toContain('backBehavior="history"');
    expect(adminDrawerSource).toContain("tabBar={() => null}");
    expect(adminDrawerSource).not.toContain("BottomTabBar");
  });

  it("keeps notifications and legacy direct-entry fallbacks on the feature stack", () => {
    expect(source).toContain('<RootStack.Screen name="Notifications" component={NotificationsInboxScreen} />');
    expect(source).toContain('<RootStack.Screen name="AdminTools" component={AdminToolsScreen} />');
    expect(source).toContain('<RootStack.Screen name="AdminAcademic" component={AdminAcademicScreen} />');
    expect(source).toContain('<RootStack.Screen name="AdminAnnouncements" component={AdminAnnouncementsScreen} />');
  });

  it.each([
    "AdminAcademicScreen.tsx",
    "AdminAnnouncementsScreen.tsx",
  ])("gives legacy stack entry %s a visible Back action while drawer roots keep the menu", (fileName) => {
    const screenSource = fs.readFileSync(path.resolve(__dirname, `../../screens/${fileName}`), "utf8");
    expect(screenSource).toContain('navigation?.getState?.().type === "stack"');
    expect(screenSource).toContain("showBackButton={legacyStackEntry}");
    expect(screenSource).toContain("onBackPress={legacyStackEntry ? navigation?.goBack : undefined}");
  });

  it.each([
    "TeacherCalendar",
    "TeacherExtractionDetail",
    "TeacherAiDraft",
    "TeacherLibrary",
    "TeacherClassRecord",
    "TeacherReports",
  ])("keeps reused administrator class workflows reachable through %s", (routeName) => {
    expect(adminSource).toContain(`<RootStack.Screen name="${routeName}"`);
  });

  it("does not mount the former generic role workspace", () => {
    expect(source).not.toContain("RoleWorkspaceScreen");
  });

  it("keeps tab state while replacing every visible bottom bar with the role drawer", () => {
    expect(source).toContain("RoleDrawerProvider");
    expect(source.match(/tabBar=\{\(\) => null\}/g)).toHaveLength(3);
    expect(source).not.toContain("<BottomTabBar");
    expect(source).not.toContain('from "../components/ui/BottomTabBar"');
  });
});
