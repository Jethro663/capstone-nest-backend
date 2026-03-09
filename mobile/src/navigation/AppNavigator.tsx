import type { ComponentProps } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, Text, View } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import type { AuthStackParamList, StudentRouteParamList, StudentTabParamList } from '@/navigation/types';
import { LoginScreen } from '@/features/auth/screens/LoginScreen';
import { VerifyEmailScreen } from '@/features/auth/screens/VerifyEmailScreen';
import { ForgotPasswordScreen } from '@/features/auth/screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '@/features/auth/screens/ResetPasswordScreen';
import { SetActivationPasswordScreen } from '@/features/auth/screens/SetActivationPasswordScreen';
import { DashboardScreen } from '@/features/student/screens/DashboardScreen';
import { CoursesScreen } from '@/features/student/screens/CoursesScreen';
import { ClassDetailScreen } from '@/features/student/screens/ClassDetailScreen';
import { LessonDetailScreen } from '@/features/student/screens/LessonDetailScreen';
import { AssessmentDetailScreen } from '@/features/student/screens/AssessmentDetailScreen';
import { AssessmentTakeScreen } from '@/features/student/screens/AssessmentTakeScreen';
import { AssessmentResultsScreen } from '@/features/student/screens/AssessmentResultsScreen';
import { AnnouncementsScreen } from '@/features/student/screens/AnnouncementsScreen';
import { LxpScreen } from '@/features/student/screens/LxpScreen';
import { PerformanceScreen } from '@/features/student/screens/PerformanceScreen';
import { ProfileScreen } from '@/features/student/screens/ProfileScreen';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const StudentTabs = createBottomTabNavigator<StudentTabParamList>();
const StudentStack = createNativeStackNavigator<StudentRouteParamList>();
type MaterialIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#f8fafc',
    card: '#ffffff',
    text: '#020617',
    border: '#e2e8f0',
    primary: '#dc2626',
  },
};

function RootFallback() {
  return (
    <View className="flex-1 items-center justify-center bg-slate-50">
      <ActivityIndicator size="large" color="#dc2626" />
      <Text className="mt-4 text-sm font-bold uppercase tracking-[2px] text-slate-500">
        Loading Nexora
      </Text>
    </View>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <AuthStack.Screen name="SetActivationPassword" component={SetActivationPasswordScreen} />
    </AuthStack.Navigator>
  );
}

function StudentTabNavigator() {
  return (
    <StudentTabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          height: 74,
          paddingTop: 10,
          paddingBottom: 10,
          borderTopColor: '#fecaca',
          backgroundColor: '#fffafb',
        },
        tabBarActiveTintColor: '#dc2626',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarLabelStyle: {
          fontWeight: '800',
          letterSpacing: 0.3,
          fontSize: 11,
        },
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<keyof StudentTabParamList, MaterialIconName> = {
            Dashboard: focused ? 'view-dashboard' : 'view-dashboard-outline',
            Courses: focused ? 'book-open-variant' : 'book-open-outline',
            Lxp: focused ? 'rocket-launch' : 'rocket-launch-outline',
            Announcements: focused ? 'bullhorn' : 'bullhorn-outline',
            Profile: focused ? 'account-circle' : 'account-circle-outline',
          };
          return <MaterialCommunityIcons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <StudentTabs.Screen name="Dashboard" component={DashboardScreen} />
      <StudentTabs.Screen name="Courses" component={CoursesScreen} />
      <StudentTabs.Screen name="Lxp" component={LxpScreen} options={{ title: 'LXP' }} />
      <StudentTabs.Screen name="Announcements" component={AnnouncementsScreen} />
      <StudentTabs.Screen name="Profile" component={ProfileScreen} />
    </StudentTabs.Navigator>
  );
}

function StudentNavigator() {
  return (
    <StudentStack.Navigator
      screenOptions={{
        headerTintColor: '#020617',
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: '#fffafb',
        },
        headerTitleStyle: {
          fontWeight: '900',
        },
      }}
    >
      <StudentStack.Screen
        name="StudentTabs"
        component={StudentTabNavigator}
        options={{ headerShown: false }}
      />
      <StudentStack.Screen name="ClassDetail" component={ClassDetailScreen} options={{ title: 'Class' }} />
      <StudentStack.Screen name="LessonDetail" component={LessonDetailScreen} options={{ title: 'Lesson' }} />
      <StudentStack.Screen name="AssessmentDetail" component={AssessmentDetailScreen} options={{ title: 'Assessment' }} />
      <StudentStack.Screen name="AssessmentTake" component={AssessmentTakeScreen} options={{ title: 'Take Assessment' }} />
      <StudentStack.Screen name="AssessmentResults" component={AssessmentResultsScreen} options={{ title: 'Results' }} />
      <StudentStack.Screen name="Performance" component={PerformanceScreen} options={{ title: 'Performance' }} />
    </StudentStack.Navigator>
  );
}

export function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <RootFallback />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {isAuthenticated ? <StudentNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
