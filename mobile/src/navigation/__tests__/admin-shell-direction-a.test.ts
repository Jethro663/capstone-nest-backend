import fs from "node:fs";
import path from "node:path";
import { ROLE_DRAWER_GROUPS } from "../role-drawer-model";
import { adminDrawerRouteNames } from "../admin-route-manifest";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(__dirname, relativePath), "utf8");

describe("Direction A administrator shell", () => {
  it("mirrors the accepted web category hierarchy and contextual ownership", () => {
    const groups = ROLE_DRAWER_GROUPS.admin;
    expect(groups.map((group) => group.label)).toEqual([
      "Overview",
      "School Setup",
      "Content & Comms",
      "Insights & AI",
      "Account",
    ]);
    expect(
      groups.map((group) => group.items.map((item) => item.label)),
    ).toEqual([
      ["Home", "Diagnostics"],
      [
        "Users",
        "Sections",
        "Classes",
        "Calendar",
        "Roster Import",
        "Class Record",
        "User Reports",
      ],
      ["Nexora Library", "Announcements"],
      ["Reports", "Evaluations", "AI Chatbot", "Audit Trail"],
      ["System Settings"],
    ]);
    const labels = groups.flatMap((group) =>
      group.items.map((item) => item.label),
    );
    expect(labels).not.toContain("Assessments");
    expect(labels).not.toContain("Class Templates");
    expect(labels).not.toContain("Academic");
  });

  it("registers separate class/section and all formerly missing roots", () => {
    expect(adminDrawerRouteNames).toEqual([
      "Home",
      "AdminDiagnostics",
      "AdminUsers",
      "AdminSections",
      "AdminClasses",
      "AdminCalendar",
      "AdminRoster",
      "AdminClassRecord",
      "AdminUserReports",
      "AdminLibrary",
      "AdminAnnouncements",
      "AdminReports",
      "AdminEvaluations",
      "AdminChatbot",
      "AdminAudit",
      "AdminSettings",
      "Profile",
    ]);
  });

  it("uses the GABHS red/white administrator palette", () => {
    const source = read("../../theme/admin.ts");
    expect(source).toContain('primary: "#98484A"');
    expect(source).toContain('primarySoft: "#FFF5F2"');
    expect(source).not.toContain("#24466F");
    expect(source).not.toContain("#E8EEF8");
  });

  it("exposes notifications from Home and profile plus logout in the admin drawer footer", () => {
    const home = read("../../screens/AdminHomeScreen.tsx");
    const drawer = read("../../components/navigation/RoleNavigationDrawer.tsx");
    const navigator = read("../AppNavigator.tsx");
    expect(home).toContain('accessibilityLabel="Open notifications"');
    expect(home).toContain('navigate("Notifications")');
    expect(drawer).toContain('role === "admin" || role === "student"');
    expect(navigator).toContain('role="admin"');
    expect(navigator).toContain("onLogout={logout}");
  });
});
