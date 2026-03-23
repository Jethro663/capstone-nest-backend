import { Component, type ReactNode, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../providers/AuthProvider";
import { BottomTabBar } from "../components/ui/BottomTabBar";
import { LessonsScreen } from "../screens/LessonsScreen";
import { AssessmentsScreen } from "../screens/AssessmentsScreen";
import { LxpScreen } from "../screens/LxpScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { ProgressScreen } from "../screens/ProgressScreen";
import { SubjectLessonsScreen } from "../screens/SubjectLessonsScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { AssessmentDetailScreen } from "../screens/AssessmentDetailScreen";
import { AssessmentTakeScreen } from "../screens/AssessmentTakeScreen";
import { AssessmentResultsScreen } from "../screens/AssessmentResultsScreen";
import { AiTutorScreen } from "../screens/AiTutorScreen";
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
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }}>
      <ActivityIndicator size="large" color={colors.amber} />
      <Text style={{ marginTop: 12, fontSize: 12, fontWeight: "800", color: colors.textSecondary }}>
        Loading student workspace...
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
      <Tab.Screen name="Lessons" component={LessonsScreen} />
      <Tab.Screen name="Assessments" component={AssessmentsScreen} />
      <Tab.Screen name="LXP" component={LxpScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function StudentNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="MainTabs" component={MainTabs} />
      <RootStack.Screen name="SubjectLessons" component={SubjectLessonsScreen} />
      <RootStack.Screen name="AssessmentDetail" component={AssessmentDetailScreen} />
      <RootStack.Screen name="AssessmentTake" component={AssessmentTakeScreen} />
      <RootStack.Screen name="AssessmentResults" component={AssessmentResultsScreen} />
      <RootStack.Screen name="AiTutor" component={AiTutorScreen} />
    </RootStack.Navigator>
  );
}

function getActiveRouteName(state: any): string {
  const route = state?.routes?.[state?.index ?? 0];
  if (!route) {
    return "Lessons";
  }

  if (route.state?.routes?.length) {
    return getActiveRouteName(route.state);
  }

  return route.name || "Lessons";
}

export function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();
  const [currentRouteName, setCurrentRouteName] = useState("Lessons");
  const navigator = useMemo(
    () =>
      isAuthenticated ? (
        <NavigationErrorBoundary currentRouteName={currentRouteName}>
          <StudentNavigator />
        </NavigationErrorBoundary>
      ) : (
        <AuthNavigator />
      ),
    [currentRouteName, isAuthenticated],
  );

  if (loading) {
    return <RootFallback />;
  }

  return (
    <NavigationContainer
      theme={navigationTheme}
      onReady={() => setCurrentRouteName(isAuthenticated ? "Lessons" : "Login")}
      onStateChange={(state) => setCurrentRouteName(getActiveRouteName(state))}
    >
      {navigator}
    </NavigationContainer>
  );
}
