import { Component, type ReactNode, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../providers/AuthProvider";
import { BottomTabBar } from "../components/ui/BottomTabBar";
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

function DashboardRouteScreen() {
  return <StudentRoutePlaceholder title="Dashboard" subtitle="Student overview routes will land here." />;
}

function LxpRouteScreen() {
  return <StudentRoutePlaceholder title="LXP" subtitle="Parity route placeholder for learner experience overview." />;
}

function PerformanceRouteScreen() {
  return <StudentRoutePlaceholder title="Performance" subtitle="Parity route placeholder for performance analytics." />;
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
      <Tab.Screen name="Dashboard">{() => <DashboardRouteScreen />}</Tab.Screen>
      <Tab.Screen name="Classes" component={ClassesScreen} />
      <Tab.Screen name="Assessments" component={AssessmentsScreen} />
      <Tab.Screen name="JA" component={JaScreen} />
      <Tab.Screen name="Announcements" component={AnnouncementsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function StudentNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="MainTabs" component={StudentTabs} />
      <RootStack.Screen name="ClassWorkspace" component={ClassWorkspaceScreen} />
      <RootStack.Screen name="ClassDetail">
        {() => <StudentRoutePlaceholder title="Class Detail" subtitle="Parity route placeholder for class details." />}
      </RootStack.Screen>
      <RootStack.Screen name="ModuleDetail">
        {() => <StudentRoutePlaceholder title="Module Detail" subtitle="Parity route placeholder for module details." />}
      </RootStack.Screen>
      <RootStack.Screen name="Courses">
        {() => <StudentRoutePlaceholder title="Courses" subtitle="Parity route placeholder for the student courses view." />}
      </RootStack.Screen>
      <RootStack.Screen name="Lessons">
        {() => <StudentRoutePlaceholder title="Lessons" subtitle="Parity route placeholder for the student lessons view." />}
      </RootStack.Screen>
      <RootStack.Screen name="LessonDetail">
        {() => <StudentRoutePlaceholder title="Lesson Detail" subtitle="Parity route placeholder for a single lesson." />}
      </RootStack.Screen>
      <RootStack.Screen name="AssessmentDetail" component={AssessmentDetailScreen} />
      <RootStack.Screen name="AssessmentTake" component={AssessmentTakeScreen} />
      <RootStack.Screen name="AssessmentResults" component={AssessmentResultsScreen} />
      <RootStack.Screen name="AssessmentHistory">
        {() => <StudentRoutePlaceholder title="Assessment History" subtitle="Parity route placeholder for assessment history." />}
      </RootStack.Screen>
      <RootStack.Screen name="Chatbot">
        {() => <StudentRoutePlaceholder title="Chatbot" subtitle="Parity route placeholder for the student chatbot route." />}
      </RootStack.Screen>
      <RootStack.Screen name="Performance">
        {() => <PerformanceRouteScreen />}
      </RootStack.Screen>
      <RootStack.Screen name="Transcript">
        {() => <StudentRoutePlaceholder title="Transcript" subtitle="Parity route placeholder for the student transcript." />}
      </RootStack.Screen>
      <RootStack.Screen name="LXP">
        {() => <LxpRouteScreen />}
      </RootStack.Screen>
      <RootStack.Screen name="AiTutor" component={AiTutorScreen} />
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

function getActiveRouteName(state: any): string {
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
  const navigator = useMemo(
    () => {
      if (!isAuthenticated) return <AuthNavigator />;

      if (mobileRole === "student") {
        return (
        <NavigationErrorBoundary currentRouteName={currentRouteName}>
          <StudentNavigator />
        </NavigationErrorBoundary>
        );
      }

      return <RoleTabs role={mobileRole} />;
    },
    [currentRouteName, isAuthenticated, mobileRole],
  );

  if (loading) {
    return <RootFallback />;
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
