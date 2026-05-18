import { Component, type ComponentProps, type ComponentType, type ReactNode, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator, type BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator, type NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../providers/AuthProvider";
import { BottomTabBar } from "../components/ui/BottomTabBar";
import { DashboardScreen } from "../screens/DashboardScreen";
import { CalendarScreen } from "../screens/CalendarScreen";
import { ClassDetailScreen } from "../screens/ClassDetailScreen";
import { CoursesScreen } from "../screens/CoursesScreen";
import { LessonsScreen as ClassesScreen } from "../screens/LessonsScreen";
import { LessonDetailScreen } from "../screens/LessonDetailScreen";
import { ModuleDetailScreen } from "../screens/ModuleDetailScreen";
import { AssessmentsScreen } from "../screens/AssessmentsScreen";
import { JaScreen } from "../screens/JaScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { NotificationsInboxScreen } from "../screens/NotificationsInboxScreen";
import { SubjectLessonsScreen as ClassWorkspaceScreen } from "../screens/SubjectLessonsScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { VerifyEmailScreen } from "../screens/VerifyEmailScreen";
import { ForgotPasswordScreen } from "../screens/ForgotPasswordScreen";
import { ResetPasswordScreen } from "../screens/ResetPasswordScreen";
import { SetInitialPasswordScreen } from "../screens/SetInitialPasswordScreen";
import { AssessmentDetailScreen } from "../screens/AssessmentDetailScreen";
import { AssessmentHistoryScreen } from "../screens/AssessmentHistoryScreen";
import { AssessmentTakeScreen } from "../screens/AssessmentTakeScreen";
import { AssessmentResultsScreen } from "../screens/AssessmentResultsScreen";
import { StudentGuidedAssessmentScreen } from "../screens/StudentGuidedAssessmentScreen";
import { StudentJaReviewAssessmentScreen } from "../screens/StudentJaReviewAssessmentScreen";
import { PerformanceScreen } from "../screens/PerformanceScreen";
import { TranscriptScreen } from "../screens/TranscriptScreen";
import { RoleWorkspaceScreen } from "../screens/RoleWorkspaceScreen";
import { TeacherAnnouncementsScreen } from "../screens/TeacherAnnouncementsScreen";
import { TeacherAssessmentDetailScreen } from "../screens/TeacherAssessmentDetailScreen";
import { TeacherAssessmentEditorScreen } from "../screens/TeacherAssessmentEditorScreen";
import { TeacherAssessmentReviewScreen } from "../screens/TeacherAssessmentReviewScreen";
import { TeacherAssessmentsScreen } from "../screens/TeacherAssessmentsScreen";
import { TeacherCalendarScreen } from "../screens/TeacherCalendarScreen";
import { TeacherClassDetailScreen } from "../screens/TeacherClassDetailScreen";
import { TeacherClassRecordScreen } from "../screens/TeacherClassRecordScreen";
import { TeacherClassesScreen } from "../screens/TeacherClassesScreen";
import { TeacherCreateAssessmentScreen } from "../screens/TeacherCreateAssessmentScreen";
import { TeacherCreateModuleScreen } from "../screens/TeacherCreateModuleScreen";
import { TeacherEvaluationsScreen } from "../screens/TeacherEvaluationsScreen";
import { TeacherHomeScreen } from "../screens/TeacherHomeScreen";
import { TeacherInterventionsScreen } from "../screens/TeacherInterventionsScreen";
import { TeacherLessonDetailScreen } from "../screens/TeacherLessonDetailScreen";
import { TeacherLibraryScreen } from "../screens/TeacherLibraryScreen";
import { TeacherMoreScreen } from "../screens/TeacherMoreScreen";
import { TeacherModuleDetailScreen } from "../screens/TeacherModuleDetailScreen";
import { TeacherPerformanceScreen } from "../screens/TeacherPerformanceScreen";
import { TeacherProfileScreen } from "../screens/TeacherProfileScreen";
import { TeacherReportsScreen } from "../screens/TeacherReportsScreen";
import { TeacherSectionDetailScreen } from "../screens/TeacherSectionDetailScreen";
import { TeacherSectionsScreen } from "../screens/TeacherSectionsScreen";
import {
  TeacherAiDraftScreen,
  TeacherAssessmentAttemptResultScreen,
  TeacherClassAddStudentsScreen,
  TeacherClassStudentOverviewScreen,
  TeacherExtractionDetailScreen,
  TeacherInterventionDetailScreen,
  TeacherLessonEditorScreen,
  TeacherModuleFileDetailScreen,
  TeacherSectionAddStudentsScreen,
  TeacherSectionStudentProfileScreen,
} from "../screens/TeacherDeepParity";
import { colors } from "../theme/tokens";
import {
  studentStackRouteNames,
  studentSupportRouteNames,
  studentTabRouteNames,
  type StudentStackRouteName,
  type StudentSupportRouteName,
  type StudentTabRouteName,
} from "./student-route-manifest";
import type { AuthStackParamList, MainTabParamList, RootStackParamList } from "./types";
import { resolveMobileRole } from "./role-resolver";
import { rootNavigationRef } from "./navigation-ref";

const Tab = createBottomTabNavigator<MainTabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

function StudentRoutePlaceholder({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, paddingHorizontal: 24 }}>
      <View
        style={{
          maxWidth: 360,
          width: "100%",
          borderRadius: 28,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
          padding: 24,
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: "900", color: colors.indigo }}>Student parity route</Text>
        <Text style={{ marginTop: 10, fontSize: 22, fontWeight: "900", color: colors.text }}>{title}</Text>
        <Text style={{ marginTop: 8, fontSize: 13, lineHeight: 20, color: colors.textSecondary }}>{subtitle}</Text>
      </View>
    </View>
  );
}

type TabScreenComponent<Name extends StudentTabRouteName> = ComponentType<
  BottomTabScreenProps<MainTabParamList, Name>
>;

type StackScreenComponent<Name extends StudentStackRouteName | StudentSupportRouteName> = ComponentType<
  NativeStackScreenProps<RootStackParamList, Name>
>;

function createTabPlaceholderScreen<Name extends StudentTabRouteName>(
  title: string,
  subtitle: string,
): TabScreenComponent<Name> {
  return function TabPlaceholderScreen(_props) {
    return <StudentRoutePlaceholder title={title} subtitle={subtitle} />;
  };
}

function createStackPlaceholderScreen<Name extends StudentStackRouteName | StudentSupportRouteName>(
  title: string,
  subtitle: string,
): StackScreenComponent<Name> {
  return function StackPlaceholderScreen(_props) {
    return <StudentRoutePlaceholder title={title} subtitle={subtitle} />;
  };
}

function ClassesRouteScreen(props: BottomTabScreenProps<MainTabParamList, "Classes">) {
  return <ClassesScreen {...(props as ComponentProps<typeof ClassesScreen>)} />;
}

function DashboardRouteScreen(props: BottomTabScreenProps<MainTabParamList, "Dashboard">) {
  return <DashboardScreen {...(props as ComponentProps<typeof DashboardScreen>)} />;
}

function JaRouteScreen(props: BottomTabScreenProps<MainTabParamList, "JA">) {
  return <JaScreen {...(props as ComponentProps<typeof JaScreen>)} />;
}

function ChatbotRouteScreen(props: NativeStackScreenProps<RootStackParamList, "Chatbot">) {
  return <JaScreen navigation={props.navigation as never} route={{ params: { panel: "ask", classId: props.route.params?.classId } }} />;
}

function LxpRouteScreen(props: NativeStackScreenProps<RootStackParamList, "LXP">) {
  return (
    <JaScreen
      navigation={props.navigation as never}
      route={{ params: { panel: "lxp", lxpClassId: props.route.params?.classId, lxpTab: props.route.params?.tab } }}
    />
  );
}

function LessonsRouteScreen(props: NativeStackScreenProps<RootStackParamList, "Lessons">) {
  return <JaScreen navigation={props.navigation as never} route={{ params: { panel: "lxp" } }} />;
}

function AiTutorRouteScreen(props: NativeStackScreenProps<RootStackParamList, "AiTutor">) {
  return <JaScreen navigation={props.navigation as never} route={{ params: { panel: "ask", classId: props.route.params?.classId } }} />;
}

const studentTabScreens = {
  Dashboard: DashboardRouteScreen,
  Classes: ClassesRouteScreen,
  Assessments: AssessmentsScreen,
  JA: JaRouteScreen,
  Announcements: NotificationsInboxScreen,
  Profile: ProfileScreen,
} satisfies { [K in StudentTabRouteName]: TabScreenComponent<K> };

const studentStackScreens = {
  ClassDetail: ClassDetailScreen,
  ModuleDetail: ModuleDetailScreen,
  Calendar: CalendarScreen,
  Courses: CoursesScreen,
  Lessons: LessonsRouteScreen,
  LessonDetail: LessonDetailScreen,
  AssessmentDetail: AssessmentDetailScreen,
  AssessmentTake: AssessmentTakeScreen,
  AssessmentResults: AssessmentResultsScreen,
  AssessmentHistory: AssessmentHistoryScreen,
  Chatbot: ChatbotRouteScreen,
  Performance: PerformanceScreen,
  Transcript: TranscriptScreen,
  LXP: LxpRouteScreen,
} satisfies { [K in StudentStackRouteName]: StackScreenComponent<K> };

const studentSupportScreens = {
  ClassWorkspace: ClassWorkspaceScreen,
  AiTutor: AiTutorRouteScreen,
} satisfies { [K in StudentSupportRouteName]: StackScreenComponent<K> };

const [classWorkspaceRouteName, aiTutorRouteName] = studentSupportRouteNames;

function renderStudentTabScreen(name: StudentTabRouteName) {
  switch (name) {
    case "Dashboard":
      return <Tab.Screen key={name} name={name} component={studentTabScreens.Dashboard} />;
    case "Classes":
      return <Tab.Screen key={name} name={name} component={studentTabScreens.Classes} />;
    case "Assessments":
      return <Tab.Screen key={name} name={name} component={studentTabScreens.Assessments} />;
    case "JA":
      return <Tab.Screen key={name} name={name} component={studentTabScreens.JA} />;
    case "Announcements":
      return <Tab.Screen key={name} name={name} component={studentTabScreens.Announcements} />;
    case "Profile":
      return <Tab.Screen key={name} name={name} component={studentTabScreens.Profile} />;
  }
}

function renderStudentStackScreen(name: StudentStackRouteName) {
  switch (name) {
    case "ClassDetail":
      return <RootStack.Screen key={name} name={name} component={studentStackScreens.ClassDetail} />;
    case "ModuleDetail":
      return <RootStack.Screen key={name} name={name} component={studentStackScreens.ModuleDetail} />;
    case "Calendar":
      return <RootStack.Screen key={name} name={name} component={studentStackScreens.Calendar} />;
    case "Courses":
      return <RootStack.Screen key={name} name={name} component={studentStackScreens.Courses} />;
    case "Lessons":
      return <RootStack.Screen key={name} name={name} component={studentStackScreens.Lessons} />;
    case "LessonDetail":
      return <RootStack.Screen key={name} name={name} component={studentStackScreens.LessonDetail} />;
    case "AssessmentDetail":
      return <RootStack.Screen key={name} name={name} component={studentStackScreens.AssessmentDetail} />;
    case "AssessmentTake":
      return <RootStack.Screen key={name} name={name} component={studentStackScreens.AssessmentTake} />;
    case "AssessmentResults":
      return <RootStack.Screen key={name} name={name} component={studentStackScreens.AssessmentResults} />;
    case "AssessmentHistory":
      return <RootStack.Screen key={name} name={name} component={studentStackScreens.AssessmentHistory} />;
    case "Chatbot":
      return <RootStack.Screen key={name} name={name} component={studentStackScreens.Chatbot} />;
    case "Performance":
      return <RootStack.Screen key={name} name={name} component={studentStackScreens.Performance} />;
    case "Transcript":
      return <RootStack.Screen key={name} name={name} component={studentStackScreens.Transcript} />;
    case "LXP":
      return <RootStack.Screen key={name} name={name} component={studentStackScreens.LXP} />;
  }
}

function renderStudentSupportScreen(name: StudentSupportRouteName) {
  switch (name) {
    case "ClassWorkspace":
      return <RootStack.Screen key={name} name={name} component={studentSupportScreens.ClassWorkspace} />;
    case "AiTutor":
      return <RootStack.Screen key={name} name={name} component={studentSupportScreens.AiTutor} />;
  }
}

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.surface,
    card: colors.card,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

function RootFallback() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, paddingHorizontal: 24 }}>
      <View
        style={{
          width: 86,
          height: 86,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 2,
          borderColor: colors.paleIndigo,
          backgroundColor: colors.card,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
      <Text style={{ marginTop: 14, fontSize: 14, fontWeight: "900", color: colors.text }}>Warming up Nexora...</Text>
      <Text style={{ marginTop: 4, fontSize: 12, fontWeight: "700", color: colors.textSecondary }}>
        Syncing classes, JA, and announcements
      </Text>
    </View>
  );
}

type NavigationErrorBoundaryProps = {
  children: ReactNode;
  currentRouteName: string;
};

type NavigationErrorBoundaryState = {
  error: Error | null;
};

class NavigationErrorBoundary extends Component<NavigationErrorBoundaryProps, NavigationErrorBoundaryState> {
  state: NavigationErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidUpdate(prevProps: NavigationErrorBoundaryProps) {
    if (this.state.error && prevProps.currentRouteName !== this.props.currentRouteName) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 20, backgroundColor: colors.surface }}>
        <View
          style={{
            borderRadius: 28,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
            padding: 20,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "900", color: colors.red }}>Screen Render Error</Text>
          <Text style={{ marginTop: 8, fontSize: 22, fontWeight: "900", color: colors.text }}>
            {this.props.currentRouteName}
          </Text>
          <Text style={{ marginTop: 10, fontSize: 13, lineHeight: 20, color: colors.textSecondary }}>
            {this.state.error.message || "This screen failed to render."}
          </Text>
          <Pressable
            onPress={() => this.setState({ error: null })}
            style={{
              marginTop: 18,
              alignItems: "center",
              borderRadius: 16,
                backgroundColor: colors.primary,
                minHeight: 48,
                paddingVertical: 14,
            }}
          >
            <Text style={{ color: colors.white, fontSize: 13, fontWeight: "800" }}>Try rendering again</Text>
          </Pressable>
        </View>
      </View>
    );
  }
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <AuthStack.Screen name="SetInitialPassword" component={SetInitialPasswordScreen} />
    </AuthStack.Navigator>
  );
}

function StudentTabs() {
  const tabBar = Platform.OS === "web" ? undefined : ((props: Parameters<typeof BottomTabBar>[0]) => <BottomTabBar {...props} />);
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={tabBar}>
      {studentTabRouteNames.map(renderStudentTabScreen)}
    </Tab.Navigator>
  );
}

function StudentNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="MainTabs" component={StudentTabs} />
      {renderStudentSupportScreen(classWorkspaceRouteName)}
      {studentStackRouteNames.map(renderStudentStackScreen)}
      <RootStack.Screen name="StudentGuidedAssessment" component={StudentGuidedAssessmentScreen} />
      <RootStack.Screen name="StudentJaReviewAssessment" component={StudentJaReviewAssessmentScreen} />
      {renderStudentSupportScreen(aiTutorRouteName)}
    </RootStack.Navigator>
  );
}

function TeacherTabs() {
  const tabBar = Platform.OS === "web" ? undefined : ((props: Parameters<typeof BottomTabBar>[0]) => <BottomTabBar {...props} />);
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={tabBar}>
      <Tab.Screen name="Home" component={TeacherHomeScreen} />
      <Tab.Screen name="Assessments" component={TeacherAssessmentsScreen} />
      <Tab.Screen name="Classes" component={TeacherClassesScreen} />
      <Tab.Screen name="Sections" component={TeacherSectionsScreen} />
      <Tab.Screen name="Profile" component={TeacherProfileScreen} />
    </Tab.Navigator>
  );
}

function TeacherNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="MainTabs" component={TeacherTabs} />
      <RootStack.Screen name="TeacherClassDetail" component={TeacherClassDetailScreen} />
      <RootStack.Screen name="TeacherModuleDetail" component={TeacherModuleDetailScreen} />
      <RootStack.Screen name="TeacherModuleFileDetail" component={TeacherModuleFileDetailScreen} />
      <RootStack.Screen name="TeacherLessonDetail" component={TeacherLessonDetailScreen} />
      <RootStack.Screen name="TeacherLessonEditor" component={TeacherLessonEditorScreen} />
      <RootStack.Screen name="TeacherAssessmentDetail" component={TeacherAssessmentDetailScreen} />
      <RootStack.Screen name="TeacherAssessmentEditor" component={TeacherAssessmentEditorScreen} />
      <RootStack.Screen name="TeacherAssessmentReview" component={TeacherAssessmentReviewScreen} />
      <RootStack.Screen name="TeacherAssessmentAttemptResult" component={TeacherAssessmentAttemptResultScreen} />
      <RootStack.Screen name="TeacherCalendar" component={TeacherCalendarScreen} />
      <RootStack.Screen name="TeacherCreateModule" component={TeacherCreateModuleScreen} />
      <RootStack.Screen name="TeacherCreateAssessment" component={TeacherCreateAssessmentScreen} />
      <RootStack.Screen name="TeacherClassAddStudents" component={TeacherClassAddStudentsScreen} />
      <RootStack.Screen name="TeacherClassStudentOverview" component={TeacherClassStudentOverviewScreen} />
      <RootStack.Screen name="TeacherSectionDetail" component={TeacherSectionDetailScreen} />
      <RootStack.Screen name="TeacherSectionAddStudents" component={TeacherSectionAddStudentsScreen} />
      <RootStack.Screen name="TeacherSectionStudentProfile" component={TeacherSectionStudentProfileScreen} />
      <RootStack.Screen name="TeacherExtractionDetail" component={TeacherExtractionDetailScreen} />
      <RootStack.Screen name="TeacherAiDraft" component={TeacherAiDraftScreen} />
      <RootStack.Screen name="TeacherInterventionDetail" component={TeacherInterventionDetailScreen} />
      <RootStack.Screen name="TeacherLibrary" component={TeacherLibraryScreen} />
      <RootStack.Screen name="TeacherClassRecord" component={TeacherClassRecordScreen} />
      <RootStack.Screen name="TeacherReports" component={TeacherReportsScreen} />
      <RootStack.Screen name="TeacherInterventions" component={TeacherInterventionsScreen} />
      <RootStack.Screen name="TeacherPerformance" component={TeacherPerformanceScreen} />
      <RootStack.Screen name="TeacherEvaluations" component={TeacherEvaluationsScreen} />
      <RootStack.Screen name="TeacherAnnouncements" component={TeacherAnnouncementsScreen} />
      <RootStack.Screen name="TeacherMore" component={TeacherMoreScreen} />
    </RootStack.Navigator>
  );
}

function RoleTabs({ role }: { role: "teacher" | "admin" }) {
  if (role === "teacher") {
    return <TeacherNavigator />;
  }

  const tabBar = Platform.OS === "web" ? undefined : ((props: Parameters<typeof BottomTabBar>[0]) => <BottomTabBar {...props} />);

  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={tabBar}>
      <Tab.Screen name="Home">{() => <RoleWorkspaceScreen role={role} section="overview" />}</Tab.Screen>
      <Tab.Screen name="Classes">{() => <RoleWorkspaceScreen role={role} section="classes" />}</Tab.Screen>
      <Tab.Screen name="Assessments">{() => <RoleWorkspaceScreen role={role} section="assessments" />}</Tab.Screen>
      <Tab.Screen name="Announcements" component={NotificationsInboxScreen} />
      <Tab.Screen name="Profile">{() => <RoleWorkspaceScreen role={role} section="profile" />}</Tab.Screen>
    </Tab.Navigator>
  );
}

type ActiveRouteState = {
  index?: number;
  routes?: Array<{
    name?: string;
    state?: ActiveRouteState;
  }>;
};

function getActiveRouteName(state?: ActiveRouteState): string {
  const route = state?.routes?.[state?.index ?? 0];
  if (!route) {
    return "Dashboard";
  }

  if (route.state?.routes?.length) {
    return getActiveRouteName(route.state);
  }

  return route.name || "Dashboard";
}

export function AppNavigator() {
  const { isAuthenticated, loading, user } = useAuth();
  const [currentRouteName, setCurrentRouteName] = useState("Home");
  const mobileRole = resolveMobileRole(user?.roles);

  if (loading) {
    return <RootFallback />;
  }

  let navigator = <AuthNavigator />;
  if (isAuthenticated) {
    navigator =
      mobileRole === "student" ? (
        <NavigationErrorBoundary currentRouteName={currentRouteName}>
          <StudentNavigator />
        </NavigationErrorBoundary>
      ) : (
        <NavigationErrorBoundary currentRouteName={currentRouteName}>
          <RoleTabs role={mobileRole} />
        </NavigationErrorBoundary>
      );
  }

  return (
    <NavigationContainer
      ref={rootNavigationRef}
      theme={navigationTheme}
      onReady={() => {
        if (!isAuthenticated) {
          setCurrentRouteName("Login");
          return;
        }
        setCurrentRouteName(mobileRole === "student" ? "Dashboard" : "Home");
      }}
      onStateChange={(state) => setCurrentRouteName(getActiveRouteName(state))}
    >
      {navigator}
    </NavigationContainer>
  );
}
