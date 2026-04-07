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
import { TeacherUnsupportedScreen } from "../screens/TeacherUnsupportedScreen";
import { colors } from "../theme/tokens";
import type { AuthStackParamList, MainTabParamList, RootStackParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

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

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <BottomTabBar {...props} />}>
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
      <RootStack.Screen name="MainTabs" component={MainTabs} />
      <RootStack.Screen name="ClassWorkspace" component={ClassWorkspaceScreen} />
      <RootStack.Screen name="AssessmentDetail" component={AssessmentDetailScreen} />
      <RootStack.Screen name="AssessmentTake" component={AssessmentTakeScreen} />
      <RootStack.Screen name="AssessmentResults" component={AssessmentResultsScreen} />
      <RootStack.Screen name="AiTutor" component={AiTutorScreen} />
    </RootStack.Navigator>
  );
}

function hasTeacherRole(roles: unknown): boolean {
  if (!Array.isArray(roles)) return false;
  return roles.some((role) => {
    if (typeof role === "string") return role.toLowerCase() === "teacher";
    if (role && typeof role === "object" && "name" in role) {
      return typeof role.name === "string" && role.name.toLowerCase() === "teacher";
    }
    return false;
  });
}

function getActiveRouteName(state: any): string {
  const route = state?.routes?.[state?.index ?? 0];
  if (!route) {
    return "Classes";
  }

  if (route.state?.routes?.length) {
    return getActiveRouteName(route.state);
  }

  return route.name || "Classes";
}

export function AppNavigator() {
  const { isAuthenticated, loading, user } = useAuth();
  const [currentRouteName, setCurrentRouteName] = useState("Classes");
  const isTeacher = hasTeacherRole(user?.roles);
  const navigator = useMemo(
    () =>
      isAuthenticated && !isTeacher ? (
        <NavigationErrorBoundary currentRouteName={currentRouteName}>
          <StudentNavigator />
        </NavigationErrorBoundary>
      ) : isAuthenticated && isTeacher ? (
        <TeacherUnsupportedScreen />
      ) : (
        <AuthNavigator />
      ),
    [currentRouteName, isAuthenticated, isTeacher],
  );

  if (loading) {
    return <RootFallback />;
  }

  return (
    <NavigationContainer
      theme={navigationTheme}
      onReady={() => setCurrentRouteName(isAuthenticated ? (isTeacher ? "TeacherUnsupported" : "Classes") : "Login")}
      onStateChange={(state) => setCurrentRouteName(getActiveRouteName(state))}
    >
      {navigator}
    </NavigationContainer>
  );
}
