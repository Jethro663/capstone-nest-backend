import fs from "node:fs";
import path from "node:path";

function readSource(relativePath: string) {
  return fs.readFileSync(path.resolve(__dirname, relativePath), "utf8");
}

describe("role drawer integration", () => {
  const appNavigator = readSource("../AppNavigator.tsx");

  it("mounts the drawer for every role while keeping the existing tab navigators", () => {
    expect(appNavigator.match(/<RoleDrawerProvider/g)).toHaveLength(3);
    expect(appNavigator.match(/<Tab\.Navigator/g)).toHaveLength(3);
    expect(appNavigator.match(/tabBar=\{\(\) => null\}/g)).toHaveLength(3);
  });

  it.each([
    "../../screens/DashboardScreen.tsx",
    "../../screens/LessonsScreen.tsx",
    "../../screens/AssessmentsScreen.tsx",
    "../../screens/AnnouncementsScreen.tsx",
    "../../screens/ProfileScreen.tsx",
  ])("gives the student tab root %s a drawer trigger", (screenPath) => {
    const source = readSource(screenPath);
    expect(source).toContain("RoleMenuButton");
    expect(source).toContain("<RoleMenuButton");
  });

  it("removes bottom-bar reservation from the long student Home and Profile screens", () => {
    expect(readSource("../../screens/DashboardScreen.tsx")).not.toContain("paddingBottom: 88");
    expect(readSource("../../screens/ProfileScreen.tsx")).not.toContain("paddingBottom: 132");
  });

  it("lets the shared JA surface show Back when it is opened as a stack route", () => {
    const source = readSource("../../screens/JaScreen.tsx");
    expect(source).toContain("RoleHeaderNavigationButton");
    expect(source).toContain("onBackPress={navigation.goBack}");
  });
});
