import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { BottomTabBar } from "../components/ui/BottomTabBar";
import { AssessmentsScreen } from "../screens/AssessmentsScreen";
import { LessonsScreen } from "../screens/LessonsScreen";
import { LxpScreen } from "../screens/LxpScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { ProgressScreen } from "../screens/ProgressScreen";
import { SubjectLessonsScreen } from "../screens/SubjectLessonsScreen";
import { colors } from "../theme/tokens";
import type { MainTabParamList, RootStackParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

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

export function AppNavigator() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="SubjectLessons" component={SubjectLessonsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
