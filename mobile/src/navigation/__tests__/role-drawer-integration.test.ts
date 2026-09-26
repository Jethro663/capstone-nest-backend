import fs from "node:fs";
import path from "node:path";

function readSource(relativePath: string) {
  return fs.readFileSync(path.resolve(__dirname, relativePath), "utf8");
}

describe("role drawer integration", () => {
  const appNavigator = readSource("../AppNavigator.tsx");
  const normalizedAppNavigator = appNavigator.replace(/\s+/g, " ");
  const teacherNavigatorSource =
    appNavigator
      .match(/function TeacherNavigator\(\)[\s\S]*?function RoleTabs/)?.[0]
      .replace(/\s+/g, " ") ?? "";

  it("mounts the drawer for every role while keeping the existing tab navigators", () => {
    expect(appNavigator.match(/<RoleDrawerProvider/g)).toHaveLength(4);
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
      expect(normalizedAppNavigator).toContain(
        `<Tab.Screen name="${routeName}"`,
      );
      expect(teacherNavigatorSource).not.toContain(
        `<RootStack.Screen name="${routeName}"`,
      );
    }
  });

  it("keeps student history and exposes Calendar through the drawer without removing contextual Calendar", () => {
    const studentTabsSource = appNavigator.slice(
      appNavigator.indexOf("function StudentTabs"),
      appNavigator.indexOf("function StudentNavigator"),
    );
    const drawerModel = readSource("../role-drawer-model.ts").replace(
      /\s+/g,
      " ",
    );
    expect(studentTabsSource).toContain('backBehavior="history"');
    expect(appNavigator).toContain('case "StudentCalendar"');
    expect(appNavigator).toContain(
      "component={studentTabScreens.StudentCalendar}",
    );
    expect(drawerModel).toContain(
      '{ label: "Calendar", route: "StudentCalendar", kind: "tab"',
    );
    expect(appNavigator).toContain('case "Calendar"');
    expect(appNavigator).toContain("component={studentStackScreens.Calendar}");
  });

  it("owns Student Evaluations in the student tab drawer without a duplicate root route", () => {
    const studentTabsSource = appNavigator.slice(
      appNavigator.indexOf("function StudentTabs"),
      appNavigator.indexOf("function StudentNavigator"),
    );
    const studentNavigatorSource = appNavigator.slice(
      appNavigator.indexOf("function StudentNavigator"),
      appNavigator.indexOf("function TeacherDrawerNavigator"),
    );
    expect(appNavigator).toContain('case "StudentEvaluations"');
    expect(appNavigator).toContain(
      "component={studentTabScreens.StudentEvaluations}",
    );
    expect(studentTabsSource).toContain('backBehavior="history"');
    expect(studentNavigatorSource).not.toContain(
      '<RootStack.Screen name="StudentEvaluations"',
    );
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
  ])(
    "uses the hamburger instead of Back on teacher drawer root %s",
    (screenPath) => {
      const source = readSource(screenPath);
      expect(source).not.toContain("showBackButton");
      expect(source).toContain("onBackPress={() => navigation.goBack()}");
    },
  );

  it.each([
    "../../screens/TeacherClassDetailScreen.tsx",
    "../../screens/TeacherModuleDetailScreen.tsx",
    "../../screens/TeacherLessonDetailScreen.tsx",
    "../../screens/TeacherAiDraftScreen.tsx",
    "../../screens/TeacherDeepParityScreens.tsx",
  ])(
    "uses durable Back handling on redesigned teacher detail %s",
    (screenPath) => {
      const source = readSource(screenPath);
      expect(source).toContain("showBackButton");
      expect(source).toContain("navigateTeacherDetailBack");
      expect(source).toContain("onBackPress={handleBack}");
    },
  );

  it.each([
    "../../screens/TeacherSectionDetailScreen.tsx",
    "../../screens/TeacherAssessmentDetailScreen.tsx",
    "../../screens/TeacherAssessmentReviewScreen.tsx",
    "../../screens/TeacherCreateModuleScreen.tsx",
  ])(
    "puts Back in the leading header position on unchanged teacher detail %s",
    (screenPath) => {
      const source = readSource(screenPath);
      expect(source).toContain("showBackButton");
      expect(source).toContain("onBackPress={() => navigation.goBack()}");
    },
  );

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
    expect(source).toContain(
      'NativeStackScreenProps<RootStackParamList, "Notifications">',
    );
    expect(source).toContain('navigationLabel="Back"');
    expect(source).toContain('navigationIcon="arrow-left"');
    expect(source).toContain(
      'navigation.navigate("TeacherDrawer", { screen: "Home" })',
    );
  });

  it("keeps Calendar announcement links inside the teacher drawer navigator", () => {
    const source = readSource("../../screens/TeacherCalendarScreen.tsx");
    expect(source).toContain('navigation.navigate("TeacherAnnouncements")');
    expect(source).not.toContain("navigation.getParent()");
  });

  it.each([
    [
      "../../screens/DashboardScreen.tsx",
      "../../screens/student-home/StudentHomeView.tsx",
    ],
    [
      "../../screens/LessonsScreen.tsx",
      "../../screens/student-classes/StudentClassesView.tsx",
    ],
    [
      "../../screens/AssessmentsScreen.tsx",
      "../../screens/student-assessments/StudentAssessmentsView.tsx",
    ],
    [
      "../../screens/AnnouncementsScreen.tsx",
      "../../screens/student-announcements/StudentAnnouncementsView.tsx",
    ],
    ["../../screens/ProfileScreen.tsx", "../../screens/ProfileScreen.tsx"],
  ])(
    "gives the student tab root %s a drawer trigger through its mounted StudentScreen owner",
    (screenPath, mountedViewPath) => {
      const rootSource = readSource(screenPath);
      const mountedViewSource = readSource(mountedViewPath);
      const sharedShell = readSource(
        "../../components/student/StudentWorkspacePrimitives.tsx",
      );
      expect(rootSource).toMatch(
        /Student(Home|Classes|Assessments|Announcements)View|StudentScreen/,
      );
      expect(mountedViewSource).toContain("<StudentScreen");
      expect(sharedShell).toContain("RoleHeaderNavigationButton");
      expect(sharedShell).toContain("<RoleHeaderNavigationButton");
    },
  );

  it("removes bottom-bar reservation from the long student Home and Profile screens", () => {
    expect(readSource("../../screens/DashboardScreen.tsx")).not.toContain(
      "paddingBottom: 88",
    );
    expect(readSource("../../screens/ProfileScreen.tsx")).not.toContain(
      "paddingBottom: 132",
    );
  });

  it("lets the shared JA surface show Back when it is opened as a stack route", () => {
    const source = readSource("../../screens/JaScreen.tsx");
    const chat = readSource("../../components/ja/JaChatWorkspace.tsx");
    const navigator = readSource("../AppNavigator.tsx");
    expect(source).toContain("RoleHeaderNavigationButton");
    expect(source).toContain("onBackPress={navigation.goBack}");
    expect(source).toContain("leadingAction=");
    expect(chat).toContain("leadingAction");
    expect(navigator).toContain('role="student"');
    expect(navigator).toMatch(
      /function ChatbotRouteScreen[\s\S]*RoleDrawerProvider/,
    );
  });

  it("passes logout authority into the teacher drawer provider", () => {
    const source = readSource("../AppNavigator.tsx");
    const teacherDrawer = source.slice(
      source.indexOf("function TeacherDrawerNavigator"),
      source.indexOf("function TeacherNavigator"),
    );
    expect(teacherDrawer).toContain("const { logout } = useAuth()");
    expect(teacherDrawer).toContain("onLogout={logout}");
  });
});
