import { Component, type ComponentProps, type ComponentType, type ReactNode, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator, type BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator, type NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../providers/AuthProvider";
import { BottomTabBar } from "../components/ui/BottomTabBar";
import { DashboardScreen } from "../screens/DashboardScreen";
import { LessonsScreen as ClassesScreen } from "../screens/LessonsScreen";
import { AssessmentsScreen } from "../screens/AssessmentsScreen";
import { JaScreen } from "../screens/JaScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { AnnouncementsScreen } from "../screens/AnnouncementsScreen";
import { SubjectLessonsScreen as ClassWorkspaceScreen } from "../screens/SubjectLessonsScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { AssessmentDetailScreen } from "../screens/AssessmentDetailScreen";
import { AssessmentTakeScreen } from "../screens/AssessmentTakeScreen";
import { AssessmentResultsScreen } from "../screens/AssessmentResultsScreen";
import { AiTutorScreen } from "../screens/AiTutorScreen";
import { RoleWorkspaceScreen } from "../screens/RoleWorkspaceScreen";
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
          backgroundColor: colors.white,
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

const studentTabScreens = {
  Dashboard: DashboardRouteScreen,
  Classes: ClassesRouteScreen,
  Assessments: AssessmentsScreen,
  JA: JaScreen,
  Announcements: AnnouncementsScreen,
  Profile: ProfileScreen,
} satisfies { [K in StudentTabRouteName]: TabScreenComponent<K> };

const studentStackScreens = {
  ClassDetail: createStackPlaceholderScreen<"ClassDetail">(
    "Class Detail",
    "Parity route placeholder for class details.",
  ),
  ModuleDetail: createStackPlaceholderScreen<"ModuleDetail">(
    "Module Detail",
    "Parity route placeholder for module details.",
  ),
  Courses: createStackPlaceholderScreen<"Courses">(
    "Courses",
    "Parity route placeholder for the student courses view.",
  ),
  Lessons: createStackPlaceholderScreen<"Lessons">(
    "Lessons",
    "Parity route placeholder for the student lessons view.",
  ),
  LessonDetail: createStackPlaceholderScreen<"LessonDetail">(
    "Lesson Detail",
    "Parity route placeholder for a single lesson.",
  ),
  AssessmentDetail: AssessmentDetailScreen,
  AssessmentTake: AssessmentTakeScreen,
  AssessmentResults: AssessmentResultsScreen,
  AssessmentHistory: createStackPlaceholderScreen<"AssessmentHistory">(
    "Assessment History",
    "Parity route placeholder for assessment history.",
  ),
  Chatbot: createStackPlaceholderScreen<"Chatbot">(
    "Chatbot",
    "Parity route placeholder for the student chatbot route.",
  ),
  Performance: createStackPlaceholderScreen<"Performance">(
    "Performance",
    "Parity route placeholder for performance analytics.",
  ),
  Transcript: createStackPlaceholderScreen<"Transcript">(
    "Transcript",
    "Parity route placeholder for the student transcript.",
  ),
  LXP: createStackPlaceholderScreen<"LXP">(
    "LXP",
    "Parity route placeholder for learner experience overview.",
  ),
} satisfies { [K in StudentStackRouteName]: StackScreenComponent<K> };

const studentSupportScreens = {
  ClassWorkspace: ClassWorkspaceScreen,
  AiTutor: AiTutorScreen,
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
    card: colors.white,
    text: colors.text,
    border: colors.border,
    primary: colors.amber,
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
          backgroundColor: colors.white,
        }}
      >
        <ActivityIndicator size="large" color={colors.indigo} />
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
            backgroundColor: colors.white,
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
              backgroundColor: colors.text,
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
    </AuthStack.Navigator>
  );
}

function StudentTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <BottomTabBar {...props} />}>
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
      {renderStudentSupportScreen(aiTutorRouteName)}
    </RootStack.Navigator>
  );
}

function RoleTabs({ role }: { role: "teacher" | "admin" }) {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <BottomTabBar {...props} />}>
      <Tab.Screen name="Home">{() => <RoleWorkspaceScreen role={role} section="overview" />}</Tab.Screen>
      <Tab.Screen name="Classes">{() => <RoleWorkspaceScreen role={role} section="classes" />}</Tab.Screen>
      <Tab.Screen name="Assessments">{() => <RoleWorkspaceScreen role={role} section="assessments" />}</Tab.Screen>
      <Tab.Screen name="Announcements">{() => <RoleWorkspaceScreen role={role} section="announcements" />}</Tab.Screen>
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
        <RoleTabs role={mobileRole} />
      );
  }

  return (
    <NavigationContainer
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
