import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../contexts/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Auth Screens
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import EmailVerificationScreen from '../screens/auth/EmailVerificationScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';

// Student Screens
import StudentDashboardScreen from '../screens/student/StudentDashboardScreen';
import StudentCoursesScreen from '../screens/student/StudentCoursesScreen';
import CourseDetailsScreen from '../screens/student/CourseDetailsScreen';
import StudentLessonViewerScreen from '../screens/student/StudentLessonViewerScreen';
import StudentAssessmentScreen from '../screens/student/StudentAssessmentScreen';
import StudentAssessmentTakingScreen from '../screens/student/StudentAssessmentTakingScreen';
import StudentAssessmentResultsScreen from '../screens/student/StudentAssessmentResultsScreen';

// Teacher Screens
import TeacherDashboardScreen from '../screens/teacher/TeacherDashboardScreen';
import TeacherClassesScreen from '../screens/teacher/TeacherClassesScreen';
import ClassDetailsScreen from '../screens/teacher/ClassDetailsScreen';

// Admin Screens
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import UserManagementScreen from '../screens/admin/UserManagementScreen';
import SubjectManagementScreen from '../screens/admin/SubjectManagementScreen';
import SectionManagementScreen from '../screens/admin/SectionManagementScreen';

// Common Screens
import ProfileScreen from '../screens/common/ProfileScreen';
import NotificationsScreen from '../screens/common/NotificationsScreen';
import MessagesScreen from '../screens/common/MessagesScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Auth Stack with Splash as first screen
const AuthStack = () => (
  <Stack.Navigator
    initialRouteName="Splash"
    screenOptions={{
      headerShown: false,
      animationEnabled: true,
    }}
  >
    <Stack.Screen name="Splash" component={SplashScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
  </Stack.Navigator>
);

const StudentTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: true,
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        if (route.name === 'StudentHome') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'Courses') {
          iconName = focused ? 'book' : 'book-outline';
        } else if (route.name === 'Messages') {
          iconName = focused ? 'message' : 'message-outline';
        } else if (route.name === 'Notifications') {
          iconName = focused ? 'bell' : 'bell-outline';
        }
        return (
          <MaterialCommunityIcons name={iconName} size={size} color={color} />
        );
      },
      tabBarActiveTintColor: '#3b82f6',
      tabBarInactiveTintColor: '#9ca3af',
    })}
  >
    <Tab.Screen
      name="StudentHome"
      component={StudentDashboardScreen}
      options={{ title: 'Dashboard' }}
    />
    <Tab.Screen
      name="Courses"
      component={StudentCoursesScreen}
      options={{ title: 'Courses' }}
    />
    <Tab.Screen
      name="Messages"
      component={MessagesScreen}
      options={{ title: 'Messages' }}
    />
    <Tab.Screen
      name="Notifications"
      component={NotificationsScreen}
      options={{ title: 'Notifications' }}
    />
  </Tab.Navigator>
);

const StudentStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="StudentTabs"
      component={StudentTabs}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="StudentCourses"
      component={StudentCoursesScreen}
      options={{ title: 'Courses' }}
    />
    <Stack.Screen
      name="CourseDetails"
      component={CourseDetailsScreen}
      options={{ title: 'Course Details', headerBackTitle: 'Back' }}
    />
    <Stack.Screen
      name="StudentLessonViewer"
      component={StudentLessonViewerScreen}
      options={{ title: 'Lesson', headerBackTitle: 'Back' }}
    />
    <Stack.Screen
      name="StudentAssessment"
      component={StudentAssessmentScreen}
      options={{ title: 'Assessment', headerBackTitle: 'Back' }}
    />
    <Stack.Screen
      name="StudentAssessmentTaking"
      component={StudentAssessmentTakingScreen}
      options={{ title: 'Test', headerBackTitle: 'Back' }}
    />
    <Stack.Screen
      name="StudentAssessmentResults"
      component={StudentAssessmentResultsScreen}
      options={{ title: 'Results', headerBackTitle: 'Back' }}
    />
    <Stack.Screen
      name="Profile"
      component={ProfileScreen}
      options={{ title: 'Profile' }}
    />
  </Stack.Navigator>
);

const TeacherTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: true,
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        if (route.name === 'TeacherHome') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'Classes') {
          iconName = focused ? 'school' : 'school-outline';
        } else if (route.name === 'Messages') {
          iconName = focused ? 'message' : 'message-outline';
        } else if (route.name === 'Notifications') {
          iconName = focused ? 'bell' : 'bell-outline';
        }
        return (
          <MaterialCommunityIcons name={iconName} size={size} color={color} />
        );
      },
      tabBarActiveTintColor: '#3b82f6',
      tabBarInactiveTintColor: '#9ca3af',
    })}
  >
    <Tab.Screen
      name="TeacherHome"
      component={TeacherDashboardScreen}
      options={{ title: 'Dashboard' }}
    />
    <Tab.Screen
      name="Classes"
      component={TeacherClassesScreen}
      options={{ title: 'Classes' }}
    />
    <Tab.Screen
      name="Messages"
      component={MessagesScreen}
      options={{ title: 'Messages' }}
    />
    <Tab.Screen
      name="Notifications"
      component={NotificationsScreen}
      options={{ title: 'Notifications' }}
    />
  </Tab.Navigator>
);

const TeacherStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="TeacherTabs"
      component={TeacherTabs}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="ClassDetails"
      component={ClassDetailsScreen}
      options={{ title: 'Class Details' }}
    />
    <Stack.Screen
      name="Profile"
      component={ProfileScreen}
      options={{ title: 'Profile' }}
    />
  </Stack.Navigator>
);

const AdminTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: true,
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        if (route.name === 'AdminHome') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'Users') {
          iconName = focused ? 'account-multiple' : 'account-multiple-outline';
        } else if (route.name === 'Subjects') {
          iconName = focused ? 'book' : 'book-outline';
        } else if (route.name === 'Sections') {
          iconName = focused ? 'folder' : 'folder-outline';
        }
        return (
          <MaterialCommunityIcons name={iconName} size={size} color={color} />
        );
      },
      tabBarActiveTintColor: '#3b82f6',
      tabBarInactiveTintColor: '#9ca3af',
    })}
  >
    <Tab.Screen
      name="AdminHome"
      component={AdminDashboardScreen}
      options={{ title: 'Dashboard' }}
    />
    <Tab.Screen
      name="Users"
      component={UserManagementScreen}
      options={{ title: 'Users' }}
    />
    <Tab.Screen
      name="Subjects"
      component={SubjectManagementScreen}
      options={{ title: 'Subjects' }}
    />
    <Tab.Screen
      name="Sections"
      component={SectionManagementScreen}
      options={{ title: 'Sections' }}
    />
  </Tab.Navigator>
);

const AdminStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="AdminTabs"
      component={AdminTabs}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="Profile"
      component={ProfileScreen}
      options={{ title: 'Profile' }}
    />
  </Stack.Navigator>
);

export const RootNavigator = () => {
  const { isLoading, isSignedIn, user } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isSignedIn ? (
        <>
          {user?.role === 'student' && <StudentStack />}
          {user?.role === 'teacher' && <TeacherStack />}
          {user?.role === 'admin' && <AdminStack />}
        </>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
};

export default RootNavigator;
