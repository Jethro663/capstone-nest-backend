import fs from "node:fs";
import path from "node:path";

function readSource(relativePath: string) {
  return fs.readFileSync(path.resolve(__dirname, relativePath), "utf8");
}

describe("role drawer integration", () => {
  const appNavigator = readSource("../AppNavigator.tsx");
  const teacherNavigatorSource = appNavigator.match(
    /function TeacherNavigator\(\)[\s\S]*?function RoleTabs/,
  )?.[0] ?? "";

  it("mounts the drawer for every role while keeping the existing tab navigators", () => {
    expect(appNavigator.match(/<RoleDrawerProvider/g)).toHaveLength(3);
    expect(appNavigator.match(/<Tab\.Navigator/g)).toHaveLength(3);
    expect(appNavigator.match(/tabBar=\{\(\) => null\}/g)).toHaveLength(3);
  });

  it("makes the teacher drawer the primary navigator for all fourteen workspaces", () => {
    expect(appNavigator).toContain("function TeacherDrawerNavigator()");
    expect(appNavigator).toContain('backBehavior="history"');
    expect(teacherNavigatorSource).toContain(
      '<RootStack.Screen name="TeacherDrawer" component={TeacherDrawerNavigator} />',
    );

    for (const routeName of [
      "TeacherCalendar",
      "TeacherLessons",
      "TeacherLibrary",
      "TeacherClassRecord",
      "TeacherAnnouncements",
      "TeacherReports",
      "TeacherInterventions",
      "TeacherPerformance",
      "TeacherEvaluations",
    ]) {
      expect(appNavigator).toContain(`<Tab.Screen name="${routeName}"`);
      expect(teacherNavigatorSource).not.toContain(`<RootStack.Screen name="${routeName}"`);
    }
  });

  it.each([
    "../../screens/TeacherCalendarScreen.tsx",
    "../../screens/TeacherLessonsScreen.tsx",
    "../../screens/TeacherLibraryScreen.tsx",
    "../../screens/TeacherClassRecordScreen.tsx",
    "../../screens/TeacherAnnouncementsScreen.tsx",
    "../../screens/TeacherReportsScreen.tsx",
    "../../screens/TeacherInterventionsScreen.tsx",
    "../../screens/TeacherPerformanceScreen.tsx",
    "../../screens/TeacherEvaluationsScreen.tsx",
  ])("uses the hamburger instead of Back on teacher drawer root %s", (screenPath) => {
    const source = readSource(screenPath);
    expect(source).not.toContain("showBackButton");
    expect(source).toContain("onBackPress={() => navigation.goBack()}");
  });

  it.each([
    "../../screens/TeacherClassDetailScreen.tsx",
    "../../screens/TeacherModuleDetailScreen.tsx",
    "../../screens/TeacherLessonDetailScreen.tsx",
    "../../screens/TeacherAiDraftScreen.tsx",
    "../../screens/TeacherDeepParityScreens.tsx",
  ])("uses durable Back handling on redesigned teacher detail %s", (screenPath) => {
    const source = readSource(screenPath);
    expect(source).toContain("showBackButton");
    expect(source).toContain("navigateTeacherDetailBack");
    expect(source).toContain("onBackPress={handleBack}");
  });

  it.each([
    "../../screens/TeacherSectionDetailScreen.tsx",
    "../../screens/TeacherAssessmentDetailScreen.tsx",
    "../../screens/TeacherAssessmentReviewScreen.tsx",
    "../../screens/TeacherCreateModuleScreen.tsx",
  ])("puts Back in the leading header position on unchanged teacher detail %s", (screenPath) => {
    const source = readSource(screenPath);
    expect(source).toContain("showBackButton");
    expect(source).toContain("onBackPress={() => navigation.goBack()}");
  });

  it("carries source metadata into alternate teacher detail entries", () => {
    expect(readSource("../../screens/TeacherLibraryScreen.tsx")).toContain(
      'source: "library"',
    );
    expect(readSource("../../screens/TeacherLessonsScreen.tsx")).toContain(
      'source: "lessons"',
    );
    expect(readSource("../../screens/TeacherAssessmentsScreen.tsx")).toContain(
      'source: "assessments"',
    );
    expect(readSource("../../screens/TeacherModuleDetailScreen.tsx")).toContain(
      "moduleId",
    );
    expect(readSource("../../screens/TeacherModuleDetailScreen.tsx")).toContain(
      'source: "module"',
    );
    expect(readSource("../../screens/TeacherModuleDetailScreen.tsx")).toContain(
      "moduleSource: route.params.source",
    );
  });

  it("gives the root-stack Notifications utility a visible Back action", () => {
    const source = readSource("../../screens/NotificationsInboxScreen.tsx");
    expect(source).toContain('NativeStackScreenProps<RootStackParamList, "Notifications">');
    expect(source).toContain('accessibilityLabel="Back"');
    expect(source).toContain('navigation.navigate("TeacherDrawer", { screen: "Home" })');
  });

  it("keeps Calendar announcement links inside the teacher drawer navigator", () => {
    const source = readSource("../../screens/TeacherCalendarScreen.tsx");
    expect(source).toContain('navigation.navigate("TeacherAnnouncements")');
    expect(source).not.toContain("navigation.getParent()");
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
