import fs from "node:fs";
import path from "node:path";

describe("administrator navigation manifest", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../AppNavigator.tsx"), "utf8");
  const adminSource = source.slice(source.indexOf("function AdminNavigator"), source.indexOf("type ActiveRouteState"));

  it.each([
    ["Home", "AdminHomeScreen"],
    ["Classes", "AdminClassesScreen"],
    ["Assessments", "AdminAssessmentsScreen"],
    ["Announcements", "AdminAnnouncementsScreen"],
    ["Academic", "AdminAcademicScreen"],
    ["Profile", "AdminProfileScreen"],
  ])("maps the %s tab to its truthful domain workspace", (name, component) => {
    expect(source).toContain(`<Tab.Screen name="${name}" component={${component}} />`);
  });

  it("exposes notifications separately and mounts the administrator tools stack", () => {
    expect(source).toContain('<RootStack.Screen name="Notifications" component={NotificationsInboxScreen as never} />');
    expect(source).toContain('<RootStack.Screen name="AdminTools" component={AdminToolsScreen} />');
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
});
