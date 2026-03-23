import { ActivityIndicator, Text, View } from "react-native";
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

export function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <RootFallback />;
  }

  return <NavigationContainer theme={navigationTheme}>{isAuthenticated ? <StudentNavigator /> : <AuthNavigator />}</NavigationContainer>;
}
