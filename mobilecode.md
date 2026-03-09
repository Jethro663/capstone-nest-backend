# PROJECT EXPORT
Generated: 2026-02-10 14:18:39
Source: C:\Users\Marc\Downloads\Capstone_Nest_Initial\capstone-nest-backend\mobile
Total Files: 36 | Total Lines: 7,690

## DETECTED STACK
- Jest
- React
- React Query
- Zustand

## PROJECT STRUCTURE
src/                     [30 files]

## ENTRY POINTS
- App.jsx
- index.js
- node_modules/expo/AppEntry.js
- src\services\index.js

---
# CODE BEGINS BELOW
---

// ================================================================================
// FILE: package.json
// ================================================================================

{
  "name": "nexora-lms-mobile",
  "version": "0.1.0",
  "description": "Design Nexora LMS Mobile Application - Expo",
  "main": "node_modules/expo/AppEntry.js",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "eject": "expo eject",
    "test": "jest"
  },
  "dependencies": {
    "@expo/metro-runtime": "~6.1.2",
    "@expo/vector-icons": "^15.0.3",
    "@react-native-async-storage/async-storage": "^2.2.0",
    "@react-native-vector-icons/material-design-icons": "^7.1.99",
    "@react-navigation/bottom-tabs": "^6.5.11",
    "@react-navigation/native": "^6.1.10",
    "@react-navigation/native-stack": "^6.9.19",
    "@tanstack/react-query": "^5.22.2",
    "axios": "^1.13.4",
    "date-fns": "^3.0.0",
    "expo": "~54.0.0",
    "expo-constants": "~18.0.13",
    "expo-font": "~14.0.11",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-hook-form": "^7.55.0",
    "react-native": "^0.81.5",
    "react-native-gesture-handler": "~2.28.0",
    "react-native-paper": "^5.12.0",
    "react-native-safe-area-context": "~5.6.0",
    "react-native-screens": "~4.16.0",
    "react-native-svg": "^15.12.1",
    "react-native-web": "^0.21.2",
    "zustand": "^4.4.0"
  },
  "devDependencies": {
    "@babel/core": "^7.23.0",
    "jest": "^29.7.0",
    "jest-expo": "~54.0.0"
  }
}



// ================================================================================
// FILE: App.jsx
// ================================================================================

import React from 'react';
import { StatusBar } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { AuthProvider } from './src/contexts/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <PaperProvider>
      <AuthProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <RootNavigator />
      </AuthProvider>
    </PaperProvider>
  );
}



// ================================================================================
// FILE: index.js
// ================================================================================

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);



// ================================================================================
// FILE: src\services\index.js
// ================================================================================

import api from './api';

export const authService = {
  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },

  signup: async (userData) => {
    const { data } = await api.post('/auth/signup', userData);
    return data;
  },

  verifyEmail: async (email, otp) => {
    const { data } = await api.post('/auth/verify-email', { email, otp });
    return data;
  },

  resendOTP: async (email) => {
    const { data } = await api.post('/auth/resend-otp', { email });
    return data;
  },

  forgotPassword: async (email) => {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data;
  },

  resetPassword: async (email, otp, newPassword) => {
    const { data } = await api.post('/auth/reset-password', {
      email,
      otp,
      newPassword,
    });
    return data;
  },

  refreshToken: async () => {
    const { data } = await api.post('/auth/refresh');
    return data;
  },

  logout: async () => {
    await api.post('/auth/logout');
  },
};

export const userService = {
  getCurrentUser: async () => {
    const { data } = await api.get('/users/me');
    return data;
  },

  updateProfile: async (userData) => {
    const { data } = await api.put('/users/me', userData);
    return data;
  },

  changePassword: async (oldPassword, newPassword) => {
    const { data } = await api.put('/users/change-password', {
      oldPassword,
      newPassword,
    });
    return data;
  },
};

export const courseService = {
  getStudentCourses: async () => {
    const { data } = await api.get('/students/courses');
    return data;
  },

  getCourseDetails: async (courseId) => {
    const { data } = await api.get(`/courses/${courseId}`);
    return data;
  },

  enrollCourse: async (courseId) => {
    const { data } = await api.post(`/courses/${courseId}/enroll`);
    return data;
  },
};

export const teacherService = {
  getTeacherClasses: async () => {
    const { data } = await api.get('/teachers/classes');
    return data;
  },

  getClassDetails: async (classId) => {
    const { data } = await api.get(`/classes/${classId}`);
    return data;
  },

  createClass: async (classData) => {
    const { data } = await api.post('/classes', classData);
    return data;
  },
};

export const lessonService = {
  getLessonsByClass: async (classId) => {
    const { data } = await api.get(`/lessons/class/${classId}`);
    return data;
  },

  getLessonById: async (lessonId) => {
    const { data } = await api.get(`/lessons/${lessonId}`);
    return data;
  },

  markLessonComplete: async (lessonId) => {
    const { data } = await api.post(`/lessons/${lessonId}/complete`);
    return data;
  },

  checkLessonCompletion: async (lessonId) => {
    const { data } = await api.get(`/lessons/${lessonId}/completion-status`);
    return data;
  },

  getCompletedLessonsForClass: async (classId) => {
    const { data } = await api.get(`/lessons/class/${classId}/completed`);
    return data;
  },
};

export const assessmentService = {
  getAssessmentsByClass: async (classId) => {
    const { data } = await api.get(`/assessments/class/${classId}`);
    return data;
  },

  getAssessmentById: async (assessmentId) => {
    const { data } = await api.get(`/assessments/${assessmentId}`);
    return data;
  },

  startAttempt: async (assessmentId) => {
    const { data } = await api.post(`/assessments/${assessmentId}/start`);
    return data;
  },

  submitAssessment: async (submissionData) => {
    const { data } = await api.post('/assessments/submit', submissionData);
    return data;
  },

  getStudentAttempts: async (assessmentId) => {
    const { data } = await api.get(`/assessments/${assessmentId}/student-attempts`);
    return data;
  },

  getAttemptResults: async (attemptId) => {
    const { data } = await api.get(`/assessments/attempts/${attemptId}/results`);
    return data;
  },
};

export const profilesService = {
  getProfileByUserId: async (userId) => {
    const { data } = await api.get(`/profiles/user/${userId}`);
    return data;
  },

  updateProfile: async (profileData) => {
    const { data } = await api.put('/profiles/me', profileData);
    return data;
  },
};

export const adminService = {
  getUsers: async (filters = {}) => {
    const { data } = await api.get('/admin/users', { params: filters });
    return data;
  },

  deleteUser: async (userId) => {
    const { data } = await api.delete(`/admin/users/${userId}`);
    return data;
  },

  getSubjects: async () => {
    const { data } = await api.get('/admin/subjects');
    return data;
  },

  createSubject: async (subjectData) => {
    const { data } = await api.post('/admin/subjects', subjectData);
    return data;
  },

  getSections: async () => {
    const { data } = await api.get('/admin/sections');
    return data;
  },

  createSection: async (sectionData) => {
    const { data } = await api.post('/admin/sections', sectionData);
    return data;
  },
};



// ================================================================================
// FILE: app.json
// ================================================================================

{
  "expo": {
    "name": "Nexora LMS",
    "slug": "nexora-lms",
    "version": "0.1.0",
    "orientation": "portrait",
    "scheme": "nexora-lms",
    "userInterfaceStyle": "automatic",
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTabletMode": true,
      "buildNumber": "1"
    },
    "android": {
      "versionCode": 1
    },
    "web": {
    },
    "plugins": [
      [
        "expo-font"
      ]
    ]
  }
}



// ================================================================================
// FILE: babel.config.js
// ================================================================================

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};



// ================================================================================
// FILE: metro.config.js
// ================================================================================

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Expo's default config already handles platform-specific file resolution
// correctly (e.g., .android.js, .ios.js, .web.js based on the target platform).
// Do NOT prepend web.* extensions here — it forces web code to load on native,
// causing crashes like "View config getter callback for component `style`".

module.exports = config;



// ================================================================================
// FILE: src\contexts\AuthContext.js
// ================================================================================

import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService, userService } from '../services';
import { storageService } from '../services/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth on app start
  useEffect(() => {
    bootstrapAsync();
  }, []);

  const bootstrapAsync = async () => {
    try {
      const savedToken = await AsyncStorage.getItem('authToken');
      const savedUser = await storageService.getItem('user');

      if (savedToken && savedUser) {
        // Extract role from roles array if needed
        if (savedUser.roles && Array.isArray(savedUser.roles) && savedUser.roles.length > 0 && !savedUser.role) {
          savedUser.role = savedUser.roles[0].name || savedUser.roles[0];
        }
        setUser(savedUser);
      }
    } catch (e) {
      console.error('Failed to restore token:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await authService.login(email, password);

      // Handle both direct response and wrapped response format
      const accessToken = response.accessToken || response.data?.accessToken;
      let user = response.user || response.data?.user;

      if (accessToken && user) {
        // Extract first role from roles array if roles exist
        if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
          user.role = user.roles[0].name || user.roles[0];
        }
        
        await AsyncStorage.setItem('authToken', accessToken);
        await storageService.setItem('user', user);
        setUser(user);
        return { success: true };
      } else {
        return { success: false, error: 'Invalid response format from server' };
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const signup = async (userData) => {
    try {
      setError(null);
      const response = await authService.signup(userData);
      return {
        success: true,
        data: response,
      };
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const verifyEmail = async (email, otp) => {
    try {
      setError(null);
      const response = await authService.verifyEmail(email, otp);

      // Handle both direct response and wrapped response format
      const accessToken = response.accessToken || response.data?.accessToken;
      let user = response.user || response.data?.user;

      if (accessToken && user) {
        // Extract first role from roles array if roles exist
        if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
          user.role = user.roles[0].name || user.roles[0];
        }
        
        await AsyncStorage.setItem('authToken', accessToken);
        await storageService.setItem('user', user);
        setUser(user);
        return { success: true };
      } else {
        return { success: false, error: 'Invalid response format from server' };
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const resendOTP = async (email) => {
    try {
      setError(null);
      await authService.resendOTP(email);
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const forgotPassword = async (email) => {
    try {
      setError(null);
      await authService.forgotPassword(email);
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const resetPassword = async (email, otp, newPassword) => {
    try {
      setError(null);
      await authService.resetPassword(email, otp, newPassword);
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const logout = async () => {
    // Clear local state immediately so UI responds instantly
    await AsyncStorage.removeItem('authToken');
    await storageService.removeItem('user');
    setUser(null);
    setError(null);

    // Try to notify server (don't block on this)
    try {
      await Promise.race([
        authService.logout(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Logout timeout')), 1000))
      ]);
    } catch (err) {
      // Logout already completed locally, server call is optional
      console.log('Server logout failed, but local logout completed');
    }
  };

  const refreshUser = async () => {
    try {
      const response = await userService.getCurrentUser();
      await storageService.setItem('user', response);
      setUser(response);
      return response;
    } catch (err) {
      console.error('Failed to refresh user:', err);
      return null;
    }
  };

  const value = {
    user,
    isLoading,
    error,
    login,
    signup,
    verifyEmail,
    resendOTP,
    forgotPassword,
    resetPassword,
    logout,
    refreshUser,
    isSignedIn: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};



// ================================================================================
// FILE: src\navigation\RootNavigator.js
// ================================================================================

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
        let iconName = 'circle';
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
        let iconName = 'circle';
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
        let iconName = 'circle';
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
        user?.role === 'student' ? (
          <StudentStack />
        ) : user?.role === 'teacher' ? (
          <TeacherStack />
        ) : user?.role === 'admin' ? (
          <AdminStack />
        ) : null
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
};

export default RootNavigator;



// ================================================================================
// FILE: src\screens\admin\AdminDashboardScreen.js
// ================================================================================

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  FlatList,
} from 'react-native';
import { Card, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

const AdminDashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [users] = useState([
    {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      email: 'student@gmail.com',
      roles: [{ name: 'student' }],
      status: 'ACTIVE',
    },
    {
      id: 2,
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'teacher@gmail.com',
      roles: [{ name: 'teacher' }],
      status: 'ACTIVE',
    },
    {
      id: 3,
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@gmail.com',
      roles: [{ name: 'admin' }],
      status: 'ACTIVE',
    },
  ]);

  const stats = {
    users: users.length,
    subjects: 12,
    sections: 8,
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return '#dc2626';
      case 'teacher':
        return '#8b5cf6';
      case 'student':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const getStatusColor = (status) => {
    return status === 'ACTIVE' ? '#10b981' : '#dc2626';
  };

  const renderUserRow = ({ item }) => (
    <View style={styles.userRow}>
      <View style={styles.userInfo}>
        <Text style={styles.userRowName}>
          {item.firstName} {item.lastName}
        </Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      <View style={styles.roleStatusContainer}>
        <View
          style={[
            styles.roleBadge,
            { backgroundColor: getRoleColor(item.roles[0].name) + '20' },
          ]}
        >
          <Text
            style={[
              styles.roleBadgeText,
              { color: getRoleColor(item.roles[0].name) },
            ]}
          >
            {item.roles[0].name}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + '20' },
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              { color: getStatusColor(item.status) },
            ]}
          >
            {item.status}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header Card */}
      <Card style={styles.headerCard}>
        <Card.Content style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Welcome,</Text>
              <Text style={styles.userName}>Administrator</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile')}
              style={styles.profileButton}
            >
              <MaterialCommunityIcons
                name="account-circle"
                size={40}
                color="#dc2626"
              />
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons
              name="account-multiple"
              size={24}
              color="#3b82f6"
            />
            <Text style={styles.statNumber}>{stats.users}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons
              name="book"
              size={24}
              color="#8b5cf6"
            />
            <Text style={styles.statNumber}>{stats.subjects}</Text>
            <Text style={styles.statLabel}>Subjects</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons
              name="folder"
              size={24}
              color="#ec4899"
            />
            <Text style={styles.statNumber}>{stats.sections}</Text>
            <Text style={styles.statLabel}>Sections</Text>
          </Card.Content>
        </Card>
      </View>

      {/* User Management Section */}
      <View style={styles.managementSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>User Management</Text>
          <Text style={styles.sectionSubtitle}>
            Manage and monitor all system users
          </Text>
        </View>

        <Card style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Name</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Role</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Status</Text>
          </View>

          <FlatList
            data={users}
            renderItem={renderUserRow}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
          />
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  headerCard: {
    margin: 16,
    backgroundColor: '#fef2f2',
    borderColor: '#dc2626',
    borderWidth: 1,
  },
  headerContent: {
    paddingVertical: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 14,
    color: '#6b7280',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 4,
  },
  profileButton: {
    padding: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    elevation: 2,
    borderRadius: 8,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  managementSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  tableCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  userRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  userName: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },
  roleCell: {
    flex: 1.5,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusCell: {
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default AdminDashboardScreen;



// ================================================================================
// FILE: src\screens\admin\SectionManagementScreen.js
// ================================================================================

import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { Card, Button, TextInput } from 'react-native-paper';
import { adminService } from '../../services';

const SectionManagementScreen = () => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newSectionName, setNewSectionName] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadSections();
  }, []);

  const loadSections = async () => {
    try {
      const response = await adminService.getSections();
      setSections(response);
    } catch (error) {
      console.error('Failed to load sections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSection = async () => {
    if (!newSectionName.trim()) return;

    try {
      const response = await adminService.createSection({
        name: newSectionName,
      });
      setSections([...sections, response]);
      setNewSectionName('');
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create section:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Section Management</Text>
        <Text style={styles.subtitle}>
          {sections.length} section{sections.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {showForm && (
        <Card style={styles.formCard}>
          <Card.Content>
            <TextInput
              label="Section Name"
              value={newSectionName}
              onChangeText={setNewSectionName}
              style={styles.input}
            />
            <View style={styles.formActions}>
              <Button
                mode="outlined"
                onPress={() => setShowForm(false)}
                style={styles.cancelButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleCreateSection}
                style={styles.submitButton}
              >
                Create
              </Button>
            </View>
          </Card.Content>
        </Card>
      )}

      {!showForm && (
        <View style={styles.addButton}>
          <Button
            mode="contained"
            onPress={() => setShowForm(true)}
          >
            Add Section
          </Button>
        </View>
      )}

      <View style={styles.sectionList}>
        {sections.map((section) => (
          <Card key={section.id} style={styles.sectionCard}>
            <Card.Content>
              <Text style={styles.sectionName}>{section.name}</Text>
              <Text style={styles.sectionId}>ID: {section.id}</Text>
            </Card.Content>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  formCard: {
    margin: 16,
    backgroundColor: '#f9fafb',
  },
  input: {
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  formActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
  sectionList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sectionCard: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  sectionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  sectionId: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
});

export default SectionManagementScreen;



// ================================================================================
// FILE: src\screens\admin\SubjectManagementScreen.js
// ================================================================================

import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { Card, Button, TextInput } from 'react-native-paper';
import { adminService } from '../../services';

const SubjectManagementScreen = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      const response = await adminService.getSubjects();
      setSubjects(response);
    } catch (error) {
      console.error('Failed to load subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim()) return;

    try {
      const response = await adminService.createSubject({
        name: newSubjectName,
      });
      setSubjects([...subjects, response]);
      setNewSubjectName('');
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create subject:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Subject Management</Text>
        <Text style={styles.subtitle}>
          {subjects.length} subject{subjects.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {showForm && (
        <Card style={styles.formCard}>
          <Card.Content>
            <TextInput
              label="Subject Name"
              value={newSubjectName}
              onChangeText={setNewSubjectName}
              style={styles.input}
            />
            <View style={styles.formActions}>
              <Button
                mode="outlined"
                onPress={() => setShowForm(false)}
                style={styles.cancelButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleCreateSubject}
                style={styles.submitButton}
              >
                Create
              </Button>
            </View>
          </Card.Content>
        </Card>
      )}

      {!showForm && (
        <View style={styles.addButton}>
          <Button
            mode="contained"
            onPress={() => setShowForm(true)}
          >
            Add Subject
          </Button>
        </View>
      )}

      <View style={styles.subjectList}>
        {subjects.map((subject) => (
          <Card key={subject.id} style={styles.subjectCard}>
            <Card.Content>
              <Text style={styles.subjectName}>{subject.name}</Text>
              <Text style={styles.subjectId}>ID: {subject.id}</Text>
            </Card.Content>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  formCard: {
    margin: 16,
    backgroundColor: '#f9fafb',
  },
  input: {
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  formActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
  subjectList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  subjectCard: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  subjectId: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
});

export default SubjectManagementScreen;



// ================================================================================
// FILE: src\screens\admin\UserManagementScreen.js
// ================================================================================

import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Text, FlatList } from 'react-native';
import { Card, IconButton } from 'react-native-paper';
import { adminService } from '../../services';

const UserManagementScreen = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await adminService.getUsers();
      setUsers(response);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await adminService.deleteUser(userId);
      setUsers(users.filter((u) => u.id !== userId));
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>User Management</Text>
        <Text style={styles.subtitle}>
          {users.length} user{users.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Card style={styles.userCard}>
            <Card.Content>
              <View style={styles.userHeader}>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>
                    {item.firstName} {item.lastName}
                  </Text>
                  <Text style={styles.userEmail}>{item.email}</Text>
                </View>
                <View style={styles.roleContainer}>
                  <Text
                    style={[
                      styles.roleBadge,
                      item.role === 'student' && styles.roleBadgeStudent,
                      item.role === 'teacher' && styles.roleBadgeTeacher,
                      item.role === 'admin' && styles.roleBadgeAdmin,
                    ]}
                  >
                    {item.role}
                  </Text>
                </View>
              </View>
              <View style={styles.userActions}>
                <IconButton
                  icon="delete"
                  size={20}
                  onPress={() => handleDeleteUser(item.id)}
                />
              </View>
            </Card.Content>
          </Card>
        )}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  list: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userCard: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  userEmail: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  roleContainer: {
    marginLeft: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden',
  },
  roleBadgeStudent: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  roleBadgeTeacher: {
    backgroundColor: '#f3e8ff',
    color: '#581c87',
  },
  roleBadgeAdmin: {
    backgroundColor: '#fee2e2',
    color: '#7f1d1d',
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});

export default UserManagementScreen;



// ================================================================================
// FILE: src\screens\auth\EmailVerificationScreen.js
// ================================================================================

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { TextInput, Button, Card } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';

const EmailVerificationScreen = ({ route, navigation }) => {
  const { email } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const { verifyEmail, resendOTP } = useAuth();

  const handleVerify = async () => {
    if (!otp) {
      setError('Please enter the OTP');
      return;
    }

    setLoading(true);
    setError('');

    const result = await verifyEmail(email, otp);

    setLoading(false);

    if (result.success) {
      // Navigation to dashboard happens automatically
    } else {
      setError(result.error || 'Verification failed');
    }
  };

  const handleResendOTP = async () => {
    setResending(true);
    setError('');

    const result = await resendOTP(email);

    if (result.success) {
      setResendCountdown(60);
      const timer = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setError(result.error || 'Failed to resend OTP');
    }

    setResending(false);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Verify Email</Text>
          <Text style={styles.subtitle}>
            We've sent a verification code to {email}
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <TextInput
              label="Verification Code"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              style={styles.input}
              editable={!loading}
            />

            <Button
              mode="contained"
              onPress={handleVerify}
              loading={loading}
              disabled={loading}
              style={styles.button}
              labelStyle={styles.buttonLabel}
            >
              Verify
            </Button>

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive the code? </Text>
              <TouchableOpacity
                onPress={handleResendOTP}
                disabled={resendCountdown > 0 || resending}
              >
                <Text style={styles.resendLink}>
                  {resendCountdown > 0
                    ? `Resend in ${resendCountdown}s`
                    : 'Resend'}
                </Text>
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
  },
  cardContent: {
    gap: 20,
  },
  input: {
    backgroundColor: '#f3f4f6',
    fontSize: 18,
    letterSpacing: 8,
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  button: {
    marginTop: 16,
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  resendText: {
    color: '#6b7280',
    fontSize: 14,
  },
  resendLink: {
    color: '#3b82f6',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default EmailVerificationScreen;



// ================================================================================
// FILE: src\screens\auth\ForgotPasswordScreen.js
// ================================================================================

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Text,
} from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { forgotPassword } = useAuth();

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email');
      return;
    }

    setLoading(true);
    setError('');

    const result = await forgotPassword(email);

    setLoading(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        navigation.navigate('ResetPassword', { email });
      }, 1500);
    } else {
      setError(result.error || 'Failed to send reset code');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>
            Enter your email to receive a reset code
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {success ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>
              Reset code sent! Redirecting...
            </Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            editable={!loading}
          />

          <Button
            mode="contained"
            onPress={handleForgotPassword}
            loading={loading}
            disabled={loading}
            style={styles.button}
            labelStyle={styles.buttonLabel}
          >
            Send Reset Code
          </Button>

          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.backLink}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: '#fff',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  successBox: {
    backgroundColor: '#dcfce7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  successText: {
    color: '#166534',
    fontSize: 14,
  },
  button: {
    marginTop: 20,
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
  },
  backLink: {
    color: '#3b82f6',
    textAlign: 'center',
    marginTop: 20,
    fontWeight: '500',
  },
});

export default ForgotPasswordScreen;



// ================================================================================
// FILE: src\screens\auth\LoginScreen.js
// ================================================================================

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Text,
} from 'react-native';
import { TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    const result = await login(email, password);

    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Login failed');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Nexora LMS</Text>
          <Text style={styles.subtitle}>Welcome Back</Text>
        </View>

        {error ? <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View> : null}

        <View style={styles.form}>
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            editable={!loading}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            style={styles.input}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
            editable={!loading}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotLink}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.button}
            labelStyle={styles.buttonLabel}
          >
            Login
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: '#fff',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  forgotLink: {
    alignSelf: 'flex-end',
  },
  forgotText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    marginTop: 20,
    paddingVertical: 8,
    backgroundColor: "#ff4d6d"
  },
  buttonLabel: {
    fontSize: 16,
    color: "#ffffff"
  },
});

export default LoginScreen;



// ================================================================================
// FILE: src\screens\auth\ResetPasswordScreen.js
// ================================================================================

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Text,
} from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';

const ResetPasswordScreen = ({ route, navigation }) => {
  const { email } = route.params;
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { resetPassword } = useAuth();

  const handleResetPassword = async () => {
    if (!otp || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError('');

    const result = await resetPassword(email, otp, password);

    setLoading(false);

    if (result.success) {
      navigation.navigate('Login');
    } else {
      setError(result.error || 'Password reset failed');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>Create a new password</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <TextInput
            label="Reset Code"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            style={styles.input}
            editable={!loading}
          />

          <TextInput
            label="New Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            style={styles.input}
            editable={!loading}
          />

          <TextInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            style={styles.input}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
            editable={!loading}
          />

          <Button
            mode="contained"
            onPress={handleResetPassword}
            loading={loading}
            disabled={loading}
            style={styles.button}
            labelStyle={styles.buttonLabel}
          >
            Reset Password
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: '#fff',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  button: {
    marginTop: 20,
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
  },
});

export default ResetPasswordScreen;



// ================================================================================
// FILE: src\screens\auth\SignUpScreen.js
// ================================================================================

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Text,
} from 'react-native';
import { TextInput, Button, RadioButton, Card } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';

const SignUpScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    role: 'student',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { signup } = useAuth();

  const handleSignUp = async () => {
    if (
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword ||
      !formData.firstName ||
      !formData.lastName
    ) {
      setError('Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError('');

    const result = await signup({
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName,
      role: formData.role,
    });

    setLoading(false);

    if (result.success) {
      navigation.navigate('EmailVerification', { email: formData.email });
    } else {
      setError(result.error || 'Sign up failed');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Nexora LMS</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <TextInput
            label="First Name"
            value={formData.firstName}
            onChangeText={(text) =>
              setFormData({ ...formData, firstName: text })
            }
            style={styles.input}
            editable={!loading}
          />

          <TextInput
            label="Last Name"
            value={formData.lastName}
            onChangeText={(text) =>
              setFormData({ ...formData, lastName: text })
            }
            style={styles.input}
            editable={!loading}
          />

          <TextInput
            label="Email"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            editable={!loading}
          />

          <TextInput
            label="Password"
            value={formData.password}
            onChangeText={(text) =>
              setFormData({ ...formData, password: text })
            }
            secureTextEntry={!showPassword}
            style={styles.input}
            editable={!loading}
          />

          <TextInput
            label="Confirm Password"
            value={formData.confirmPassword}
            onChangeText={(text) =>
              setFormData({ ...formData, confirmPassword: text })
            }
            secureTextEntry={!showPassword}
            style={styles.input}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
            editable={!loading}
          />

          <Card style={styles.roleCard}>
            <Card.Content>
              <Text style={styles.roleLabel}>Select Role:</Text>
              <View style={styles.roleOptions}>
                <View style={styles.radioOption}>
                  <RadioButton
                    value="student"
                    status={
                      formData.role === 'student' ? 'checked' : 'unchecked'
                    }
                    onPress={() =>
                      setFormData({ ...formData, role: 'student' })
                    }
                  />
                  <Text style={styles.roleText}>Student</Text>
                </View>
                <View style={styles.radioOption}>
                  <RadioButton
                    value="teacher"
                    status={
                      formData.role === 'teacher' ? 'checked' : 'unchecked'
                    }
                    onPress={() =>
                      setFormData({ ...formData, role: 'teacher' })
                    }
                  />
                  <Text style={styles.roleText}>Teacher</Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          <Button
            mode="contained"
            onPress={handleSignUp}
            loading={loading}
            disabled={loading}
            style={styles.button}
            labelStyle={styles.buttonLabel}
          >
            Sign Up
          </Button>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: '#fff',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  roleCard: {
    backgroundColor: '#f3f4f6',
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  roleOptions: {
    gap: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#1f2937',
  },
  button: {
    marginTop: 20,
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginText: {
    color: '#6b7280',
    fontSize: 14,
  },
  loginLink: {
    color: '#3b82f6',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default SignUpScreen;



// ================================================================================
// FILE: src\screens\common\MessagesScreen.js
// ================================================================================

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput as RNTextInput,
} from 'react-native';
import { Card, IconButton, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const MessagesScreen = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'John Doe',
      preview: 'Hi, did you complete the assignment?',
      timestamp: new Date(Date.now() - 300000),
      unread: true,
    },
    {
      id: 2,
      sender: 'Jane Smith',
      preview: 'Thanks for your help earlier',
      timestamp: new Date(Date.now() - 3600000),
      unread: true,
    },
    {
      id: 3,
      sender: 'Dr. Wilson',
      preview: 'Please check the updated syllabus',
      timestamp: new Date(Date.now() - 86400000),
      unread: false,
    },
  ]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState('');

  const handleSendReply = () => {
    if (replyText.trim() && selectedMessage) {
      // Handle sending reply
      setReplyText('');
    }
  };

  const renderMessageItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.messageItem,
        item.unread && styles.messageItemUnread,
        selectedMessage?.id === item.id && styles.messageItemSelected,
      ]}
      onPress={() => setSelectedMessage(item)}
    >
      <View style={styles.messageIcon}>
        <MaterialCommunityIcons
          name="account-circle"
          size={40}
          color="#3b82f6"
        />
      </View>

      <View style={styles.messageInfo}>
        <Text
          style={[
            styles.messageSender,
            item.unread && styles.messageSenderUnread,
          ]}
        >
          {item.sender}
        </Text>
        <Text
          style={styles.messagePreview}
          numberOfLines={1}
        >
          {item.preview}
        </Text>
        <Text style={styles.messageTime}>
          {item.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>

      {item.unread && <View style={styles.unreadBadge} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {!selectedMessage ? (
        <FlatList
          data={messages}
          renderItem={renderMessageItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.messageList}
        />
      ) : (
        <View style={styles.conversationContainer}>
          <View style={styles.conversationHeader}>
            <TouchableOpacity onPress={() => setSelectedMessage(null)}>
              <MaterialCommunityIcons
                name="arrow-left"
                size={24}
                color="#1f2937"
              />
            </TouchableOpacity>
            <Text style={styles.conversationTitle}>
              {selectedMessage.sender}
            </Text>
            <MaterialCommunityIcons
              name="information-outline"
              size={24}
              color="#6b7280"
            />
          </View>

          <ScrollView style={styles.messageThread}>
            <Card style={styles.receivedMessage}>
              <Card.Content>
                <Text style={styles.receivedText}>
                  {selectedMessage.preview}
                </Text>
              </Card.Content>
            </Card>

            <Card style={styles.sentMessage}>
              <Card.Content>
                <Text style={styles.sentText}>
                  Thanks for the message!
                </Text>
              </Card.Content>
            </Card>
          </ScrollView>

          <View style={styles.replyContainer}>
            <TextInput
              placeholder="Type your message..."
              value={replyText}
              onChangeText={setReplyText}
              style={styles.replyInput}
              right={
                <TextInput.Icon
                  icon="send"
                  onPress={handleSendReply}
                />
              }
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  messageList: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  messageItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  messageItemUnread: {
    backgroundColor: '#eff6ff',
  },
  messageItemSelected: {
    backgroundColor: '#dbeafe',
  },
  messageIcon: {
    marginRight: 12,
  },
  messageInfo: {
    flex: 1,
  },
  messageSender: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  messageSenderUnread: {
    color: '#1f2937',
    fontWeight: '600',
  },
  messagePreview: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },
  unreadBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3b82f6',
    marginLeft: 8,
  },
  conversationContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  messageThread: {
    flex: 1,
    padding: 16,
  },
  receivedMessage: {
    marginBottom: 12,
    backgroundColor: '#f3f4f6',
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  receivedText: {
    fontSize: 14,
    color: '#1f2937',
  },
  sentMessage: {
    marginBottom: 12,
    backgroundColor: '#dbeafe',
    alignSelf: 'flex-end',
    maxWidth: '80%',
  },
  sentText: {
    fontSize: 14,
    color: '#1f2937',
  },
  replyContainer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  replyInput: {
    backgroundColor: '#f9fafb',
  },
});

export default MessagesScreen;



// ================================================================================
// FILE: src\screens\common\NotificationsScreen.js
// ================================================================================

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Card, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'Assignment Due',
      message: 'Your Math assignment is due tomorrow',
      timestamp: new Date(Date.now() - 3600000),
      read: false,
      type: 'assignment',
    },
    {
      id: 2,
      title: 'New Message',
      message: 'You have a new message from your teacher',
      timestamp: new Date(Date.now() - 7200000),
      read: false,
      type: 'message',
    },
    {
      id: 3,
      title: 'Grade Posted',
      message: 'Your test has been graded',
      timestamp: new Date(Date.now() - 86400000),
      read: true,
      type: 'grade',
    },
  ]);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'assignment':
        return 'file-document';
      case 'message':
        return 'message';
      case 'grade':
        return 'check-circle';
      default:
        return 'bell';
    }
  };

  const handleDismiss = (id) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const renderNotification = ({ item }) => (
    <Card
      style={[
        styles.notificationCard,
        item.read && styles.notificationCardRead,
      ]}
    >
      <Card.Content>
        <View style={styles.notificationContent}>
          <View style={styles.notificationIcon}>
            <MaterialCommunityIcons
              name={getIcon(item.type)}
              size={24}
              color={item.read ? '#9ca3af' : '#3b82f6'}
            />
          </View>

          <View style={styles.notificationText}>
            <Text
              style={[
                styles.notificationTitle,
                item.read && styles.notificationTitleRead,
              ]}
            >
              {item.title}
            </Text>
            <Text style={styles.notificationMessage}>
              {item.message}
            </Text>
            <Text style={styles.notificationTime}>
              {item.timestamp.toLocaleString()}
            </Text>
          </View>

          <IconButton
            icon="close"
            size={20}
            onPress={() => handleDismiss(item.id)}
          />
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="bell-outline"
              size={48}
              color="#d1d5db"
            />
            <Text style={styles.emptyText}>No notifications</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  list: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  notificationCard: {
    marginBottom: 12,
    backgroundColor: '#eff6ff',
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  notificationCardRead: {
    backgroundColor: '#f9fafb',
    borderLeftColor: '#d1d5db',
  },
  notificationContent: {
    flexDirection: 'row',
    gap: 12,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationText: {
    flex: 1,
    justifyContent: 'center',
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  notificationTitleRead: {
    color: '#9ca3af',
  },
  notificationMessage: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  notificationTime: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9ca3af',
  },
});

export default NotificationsScreen;



// ================================================================================
// FILE: src\screens\common\ProfileScreen.js
// ================================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput as RNTextInput,
} from 'react-native';
import { Card, TextInput, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { userService, profilesService } from '../../services';

const ProfileScreen = () => {
  const { user, refreshUser, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('about');
  const [savingProfile, setSavingProfile] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    middleName: '',
    lastName: user?.lastName || '',
    dateOfBirth: '',
    gender: '',
    phone: '',
    address: '',
    gradeLevel: '',
  });

  const [familyData, setFamilyData] = useState({
    familyName: '',
    familyRelationship: '',
    familyContact: '',
  });

  useEffect(() => {
    if (user?.userId) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await profilesService.getProfileByUserId(user.userId);
      const profileData = res?.data || res || null;
      if (profileData) {
        setProfile(profileData);
        // Merge user and profile data
        const src = { ...user, ...profileData };
        setFormData({
          firstName: src.firstName || '',
          middleName: src.middleName || '',
          lastName: src.lastName || '',
          dateOfBirth: src.dateOfBirth || src.dob || '',
          gender: src.gender || '',
          phone: src.phone || '',
          address: src.address || '',
          gradeLevel: src.gradeLevel || src.grade || '',
        });
        setFamilyData({
          familyName: src.familyName || '',
          familyRelationship: src.familyRelationship || '',
          familyContact: src.familyContact || '',
        });
      }
    } catch (err) {
      console.error('Failed to load profile', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await profilesService.updateProfile({
        ...formData,
        ...familyData,
      });
      await loadProfile();
      setEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setSavingProfile(false);
    }
  };

  const fullName = `${formData.firstName} ${formData.middleName ? (formData.middleName + ' ') : ''}${formData.lastName}`.trim();

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView>
        {/* Profile Header */}
        <Card style={styles.headerCard}>
          <Card.Content style={styles.headerContent}>
            <View style={styles.avatarContainer}>
              <MaterialCommunityIcons
                name="account-circle"
                size={80}
                color="#3b82f6"
              />
            </View>
            <Text style={styles.profileName}>
              {fullName || user?.email}
            </Text>
            <Text style={styles.profileRole}>{user?.role}</Text>
            {formData.gradeLevel && (
              <Text style={styles.profileGrade}>{formData.gradeLevel}</Text>
            )}
          </Card.Content>
        </Card>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'about' && styles.activeTab]}
            onPress={() => setActiveTab('about')}
          >
            <Text style={[styles.tabText, activeTab === 'about' && styles.activeTabText]}>
              About Me
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'family' && styles.activeTab]}
            onPress={() => setActiveTab('family')}
          >
            <Text style={[styles.tabText, activeTab === 'family' && styles.activeTabText]}>
              Family
            </Text>
          </TouchableOpacity>
        </View>

        {/* About Tab */}
        {activeTab === 'about' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              <Button
                mode="text"
                onPress={() => setEditing(!editing)}
                compact
              >
                {editing ? 'Cancel' : 'Edit'}
              </Button>
            </View>

            <Card>
              <Card.Content style={styles.formContent}>
                <TextInput
                  label="First Name"
                  value={formData.firstName}
                  onChangeText={(text) =>
                    setFormData({ ...formData, firstName: text })
                  }
                  editable={editing}
                  style={styles.input}
                />

                <TextInput
                  label="Middle Name"
                  value={formData.middleName}
                  onChangeText={(text) =>
                    setFormData({ ...formData, middleName: text })
                  }
                  editable={editing}
                  style={styles.input}
                />

                <TextInput
                  label="Last Name"
                  value={formData.lastName}
                  onChangeText={(text) =>
                    setFormData({ ...formData, lastName: text })
                  }
                  editable={editing}
                  style={styles.input}
                />

                <TextInput
                  label="Email"
                  value={user?.email || ''}
                  editable={false}
                  style={styles.input}
                />

                <TextInput
                  label="Date of Birth"
                  value={formData.dateOfBirth}
                  onChangeText={(text) =>
                    setFormData({ ...formData, dateOfBirth: text })
                  }
                  editable={editing}
                  style={styles.input}
                />

                <TextInput
                  label="Gender"
                  value={formData.gender}
                  onChangeText={(text) =>
                    setFormData({ ...formData, gender: text })
                  }
                  editable={editing}
                  style={styles.input}
                />

                <TextInput
                  label="Phone"
                  value={formData.phone}
                  onChangeText={(text) =>
                    setFormData({ ...formData, phone: text })
                  }
                  editable={editing}
                  style={styles.input}
                />

                <TextInput
                  label="Address"
                  value={formData.address}
                  onChangeText={(text) =>
                    setFormData({ ...formData, address: text })
                  }
                  editable={editing}
                  multiline
                  style={styles.input}
                />

                <TextInput
                  label="Grade Level"
                  value={formData.gradeLevel}
                  onChangeText={(text) =>
                    setFormData({ ...formData, gradeLevel: text })
                  }
                  editable={editing}
                  style={styles.input}
                />

                {editing && (
                  <Button
                    mode="contained"
                    onPress={handleSaveProfile}
                    loading={savingProfile}
                    disabled={savingProfile}
                    style={styles.saveButton}
                  >
                    Save Changes
                  </Button>
                )}
              </Card.Content>
            </Card>
          </View>
        )}

        {/* Family Tab */}
        {activeTab === 'family' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Family Information</Text>
              <Button
                mode="text"
                onPress={() => setEditing(!editing)}
                compact
              >
                {editing ? 'Cancel' : 'Edit'}
              </Button>
            </View>

            <Card>
              <Card.Content style={styles.formContent}>
                <TextInput
                  label="Family Member Name"
                  value={familyData.familyName}
                  onChangeText={(text) =>
                    setFamilyData({ ...familyData, familyName: text })
                  }
                  editable={editing}
                  style={styles.input}
                />

                <TextInput
                  label="Relationship"
                  value={familyData.familyRelationship}
                  onChangeText={(text) =>
                    setFamilyData({ ...familyData, familyRelationship: text })
                  }
                  editable={editing}
                  style={styles.input}
                />

                <TextInput
                  label="Contact Number"
                  value={familyData.familyContact}
                  onChangeText={(text) =>
                    setFamilyData({ ...familyData, familyContact: text })
                  }
                  editable={editing}
                  style={styles.input}
                />

                {editing && (
                  <Button
                    mode="contained"
                    onPress={handleSaveProfile}
                    loading={savingProfile}
                    disabled={savingProfile}
                    style={styles.saveButton}
                  >
                    Save Changes
                  </Button>
                )}
              </Card.Content>
            </Card>
          </View>
        )}

        {/* Account Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Details</Text>

          <Card>
            <Card.Content style={styles.details}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Role:</Text>
                <Text style={styles.detailValue}>{user?.role}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Joined:</Text>
                <Text style={styles.detailValue}>
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString()
                    : 'N/A'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status:</Text>
                <Text style={[styles.detailValue, styles.statusActive]}>
                  Active
                </Text>
              </View>
            </Card.Content>
          </Card>
        </View>

        {/* Logout Button */}
        <View style={styles.section}>
          <Button
            mode="outlined"
            onPress={logout}
            style={styles.logoutButton}
            labelStyle={styles.logoutButtonLabel}
          >
            Logout
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  headerCard: {
    margin: 16,
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
    borderWidth: 1,
  },
  headerContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  profileRole: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  profileGrade: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginTop: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#dc2626',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#dc2626',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  formContent: {
    gap: 16,
  },
  input: {
    backgroundColor: '#f9fafb',
  },
  saveButton: {
    marginTop: 12,
  },
  details: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
  },
  statusActive: {
    color: '#16a34a',
  },
  logoutButton: {
    borderColor: '#dc2626',
    borderWidth: 2,
    marginBottom: 24,
  },
  logoutButtonLabel: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;



// ================================================================================
// FILE: src\screens\SplashScreen.jsx
// ================================================================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
} from 'react-native';

const SplashScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>📚 Nexora LMS</Text>
        <Text style={styles.tagline}>Learning Made Simple</Text>
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.welcomeTitle}>Welcome</Text>
        <Text style={styles.welcomeSubtitle}>
          Your learning management system for students, teachers, and administrators
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.loginButton,
            pressed && styles.loginButtonPressed,
          ]}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginButtonText}>Login</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  logoContainer: {
    paddingTop: 40,
    alignItems: 'center',
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#6b7280',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  loginButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 8,
    minWidth: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonPressed: {
    backgroundColor: '#b91c1c',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SplashScreen;



// ================================================================================
// FILE: src\screens\student\CourseDetailsScreen.jsx
// ================================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../services/api';
import { lessonService, assessmentService } from '../../services/index';

const CourseDetailsScreen = ({ route, navigation }) => {
  const { courseId } = route.params;
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('lessons');
  const [lessons, setLessons] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [completions, setCompletions] = useState({});
  const [studentAttempts, setStudentAttempts] = useState({});

  useEffect(() => {
    loadCourseDetails();
  }, [courseId]);

  const loadCourseDetails = async () => {
    setLoading(true);
    try {
      // Fetch course details
      const courseRes = await api.get(`/classes/${courseId}`);
      console.log('Course details response:', courseRes);
      if (courseRes?.data?.data) {
        const c = courseRes.data.data;
        setCourse({
          id: c.id,
          name: c.subjectName ? `${c.subjectName} (${(c.subjectCode || '').toUpperCase()})` : (c.name || 'Unknown'),
          teacher: c.teacher ? `${c.teacher.firstName} ${c.teacher.lastName}` : 'Unknown',
          grade: c.subjectGradeLevel ? `Grade ${c.subjectGradeLevel}` : (c.section?.gradeLevel ? `Grade ${c.section.gradeLevel}` : 'Grade —'),
          students: Array.isArray(c.enrollments) ? c.enrollments.length : 0,
          schedule: c.schedule || '—',
        });
      }

      // Fetch lessons
      const lessonsRes = await lessonService.getLessonsByClass(courseId);
      if (lessonsRes?.data && Array.isArray(lessonsRes.data)) {
        setLessons(lessonsRes.data);

        // Fetch completions
        const completionsRes = await lessonService.getCompletedLessonsForClass(courseId);
        if (completionsRes?.data && Array.isArray(completionsRes.data)) {
          const completionMap = {};
          completionsRes.data.forEach(completion => {
            completionMap[completion.lessonId] = true;
          });
          setCompletions(completionMap);
        }
      }

      // Fetch assessments
      const assessmentsRes = await assessmentService.getAssessmentsByClass(courseId);
      if (assessmentsRes?.data && Array.isArray(assessmentsRes.data)) {
        const published = assessmentsRes.data.filter(a => a.isPublished !== false);
        setAssessments(published);

        // Fetch attempts for each assessment
        published.forEach(async (assessment) => {
          try {
            const attemptsRes = await assessmentService.getStudentAttempts(assessment.id);
            if (attemptsRes?.data && Array.isArray(attemptsRes.data)) {
              setStudentAttempts(prev => ({
                ...prev,
                [assessment.id]: attemptsRes.data,
              }));
            }
          } catch (err) {
            console.error('Failed to load assessment attempts', err);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load course details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLessonPress = (lesson) => {
    navigation.navigate('StudentLessonViewer', { 
      lesson,
      courseId,
      allLessons: lessons,
    });
  };

  const handleAssessmentPress = (assessment) => {
    navigation.navigate('StudentAssessment', {
      assessment,
      courseId,
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Loading...</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </View>
    );
  }

  if (!course) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Course not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.title}>{course.name}</Text>
          <Text style={styles.subtitle}>{course.teacher}</Text>
        </View>
      </View>

      <View style={styles.courseInfo}>
        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="account-multiple" size={20} color="#3b82f6" />
          <View>
            <Text style={styles.infoLabel}>Students</Text>
            <Text style={styles.infoValue}>{course.students}</Text>
          </View>
        </View>
        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="book-outline" size={20} color="#8b5cf6" />
          <View>
            <Text style={styles.infoLabel}>Lessons</Text>
            <Text style={styles.infoValue}>{lessons.length}</Text>
          </View>
        </View>
        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="file-outline" size={20} color="#10b981" />
          <View>
            <Text style={styles.infoLabel}>Assessments</Text>
            <Text style={styles.infoValue}>{assessments.length}</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'lessons' && styles.activeTab]}
          onPress={() => setActiveTab('lessons')}
        >
          <Text style={[styles.tabText, activeTab === 'lessons' && styles.activeTabText]}>
            Lessons ({lessons.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'assessments' && styles.activeTab]}
          onPress={() => setActiveTab('assessments')}
        >
          <Text style={[styles.tabText, activeTab === 'assessments' && styles.activeTabText]}>
            Assessments ({assessments.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'lessons' && (
          <View>
            {lessons.length > 0 ? (
              lessons.map((lesson, index) => (
                <TouchableOpacity
                  key={lesson.id}
                  style={styles.lessonCard}
                  onPress={() => handleLessonPress(lesson)}
                >
                  <View style={styles.lessonHeader}>
                    <View style={styles.lessonNumber}>
                      <Text style={styles.lessonNumberText}>{index + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lessonTitle}>{lesson.title || lesson.name}</Text>
                      {completions[lesson.id] && (
                        <View style={styles.completedBadge}>
                          <MaterialCommunityIcons name="check-circle" size={14} color="#10b981" />
                          <Text style={styles.completedText}>Completed</Text>
                        </View>
                      )}
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="book-open-blank-variant" size={48} color="#d1d5db" />
                <Text style={styles.emptyText}>No lessons available</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'assessments' && (
          <View>
            {assessments.length > 0 ? (
              assessments.map((assessment, index) => {
                const attempts = studentAttempts[assessment.id] || [];
                const hasAttempts = attempts.length > 0;

                return (
                  <TouchableOpacity
                    key={assessment.id}
                    style={styles.assessmentCard}
                    onPress={() => handleAssessmentPress(assessment)}
                  >
                    <View style={styles.assessmentHeader}>
                      <View style={styles.assessmentType}>
                        <MaterialCommunityIcons name="file-document" size={20} color="#dc2626" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.assessmentTitle}>{assessment.title}</Text>
                        <View style={styles.assessmentMeta}>
                          <View style={styles.metaItem}>
                            <MaterialCommunityIcons name="help-box" size={14} color="#6b7280" />
                            <Text style={styles.metaText}>{assessment.questions?.length || 0} questions</Text>
                          </View>
                          {hasAttempts && (
                            <View style={styles.metaItem}>
                              <MaterialCommunityIcons name="check-all" size={14} color="#10b981" />
                              <Text style={styles.metaText}>{attempts.length} attempt{attempts.length !== 1 ? 's' : ''}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="file-document-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyText}>No assessments available</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  courseInfo: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#dc2626',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#dc2626',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  lessonCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  lessonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lessonNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  lessonNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  lessonTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  completedText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '500',
  },
  assessmentCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  assessmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  assessmentType: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  assessmentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  assessmentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#6b7280',
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 12,
  },
});

export default CourseDetailsScreen;
 


// ================================================================================
// FILE: src\screens\student\StudentAssessmentResultsScreen.jsx
// ================================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { assessmentService } from '../../services/index';

const StudentAssessmentResultsScreen = ({ route, navigation }) => {
  const { attempt, assessment } = route.params;
  const [resultData, setResultData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, [attempt.id]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const res = await assessmentService.getAttemptResults(attempt.id);
      if (res?.data) {
        setResultData(res.data);
      }
    } catch (err) {
      console.error('Failed to load results', err);
    } finally {
      setLoading(false);
    }
  };

  const getFeedbackStatus = () => {
    if (!resultData) return 'locked';
    if (resultData.isUnlocked || resultData.feedbackUnlocked) return 'unlocked';
    if (resultData.feedbackLocked) return 'locked';
    return 'processing';
  };

  const getFeedbackMessage = (status) => {
    switch (status) {
      case 'unlocked':
        return 'Feedback has been reviewed';
      case 'locked':
        return 'Feedback will be available soon';
      case 'processing':
        return 'Your submission is being reviewed';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Loading...</Text>
          </View>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </View>
    );
  }

  const feedbackStatus = getFeedbackStatus();

  if (!resultData) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>{assessment.title}</Text>
          </View>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#9ca3af' }}>Failed to load results</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>{assessment.title}</Text>
          <Text style={styles.headerSubtitle}>Results</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Score Card */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Score</Text>
            <Text style={styles.scoreValue}>
              {resultData.obtainedScore !== undefined
                ? Math.round(resultData.obtainedScore)
                : '—'}
              %
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Out of</Text>
            <Text style={styles.scoreValue}>
              {resultData.totalScore || '100'}%
            </Text>
          </View>
        </View>

        {/* Status Badge */}
        <View
          style={[
            styles.statusBanner,
            {
              backgroundColor:
                resultData.isPassed || (resultData.obtainedScore >= 50)
                  ? '#f0fdf4'
                  : '#fef2f2',
              borderColor:
                resultData.isPassed || (resultData.obtainedScore >= 50)
                  ? '#bbf7d0'
                  : '#fecaca',
            },
          ]}
        >
          <MaterialCommunityIcons
            name={resultData.isPassed || (resultData.obtainedScore >= 50) ? 'check-circle' : 'close-circle'}
            size={24}
            color={
              resultData.isPassed || (resultData.obtainedScore >= 50)
                ? '#10b981'
                : '#dc2626'
            }
          />
          <Text
            style={[
              styles.statusText,
              {
                color:
                  resultData.isPassed || (resultData.obtainedScore >= 50)
                    ? '#10b981'
                    : '#dc2626',
              },
            ]}
          >
            {resultData.isPassed || (resultData.obtainedScore >= 50)
              ? 'Passed'
              : 'Needs Improvement'}
          </Text>
        </View>

        {/* Feedback Banner */}
        <View
          style={[
            styles.feedbackBanner,
            {
              backgroundColor:
                feedbackStatus === 'unlocked'
                  ? '#f0fdf4'
                  : feedbackStatus === 'locked'
                  ? '#fef3c7'
                  : '#eff6ff',
              borderColor:
                feedbackStatus === 'unlocked'
                  ? '#bbf7d0'
                  : feedbackStatus === 'locked'
                  ? '#fde68a'
                  : '#bfdbfe',
            },
          ]}
        >
          <MaterialCommunityIcons
            name={
              feedbackStatus === 'unlocked'
                ? 'check-circle'
                : feedbackStatus === 'locked'
                ? 'clock-outline'
                : 'information-outline'
            }
            size={20}
            color={
              feedbackStatus === 'unlocked'
                ? '#10b981'
                : feedbackStatus === 'locked'
                ? '#92400e'
                : '#1e40af'
            }
          />
          <Text
            style={[
              styles.feedbackMessage,
              {
                color:
                  feedbackStatus === 'unlocked'
                    ? '#10b981'
                    : feedbackStatus === 'locked'
                    ? '#92400e'
                    : '#1e40af',
              },
            ]}
          >
            {getFeedbackMessage(feedbackStatus)}
          </Text>
        </View>

        {/* Summary Stats */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <MaterialCommunityIcons name="check-circle" size={24} color="#10b981" />
              <Text style={styles.summaryLabel}>Correct</Text>
              <Text style={styles.summaryValue}>{resultData.correctCount || 0}</Text>
            </View>
            <View style={styles.summaryCard}>
              <MaterialCommunityIcons name="close-circle" size={24} color="#dc2626" />
              <Text style={styles.summaryLabel}>Incorrect</Text>
              <Text style={styles.summaryValue}>{resultData.incorrectCount || 0}</Text>
            </View>
            <View style={styles.summaryCard}>
              <MaterialCommunityIcons name="help-circle" size={24} color="#f97316" />
              <Text style={styles.summaryLabel}>Unanswered</Text>
              <Text style={styles.summaryValue}>{resultData.unansweredCount || 0}</Text>
            </View>
          </View>
        </View>

        {/* Question Review */}
        {resultData.questionResults && resultData.questionResults.length > 0 && (
          <View style={styles.questionReviewSection}>
            <Text style={styles.sectionTitle}>Question Review</Text>

            {resultData.questionResults.map((qResult, index) => {
              const isCorrect = qResult.isCorrect;
              return (
                <View
                  key={qResult.questionId}
                  style={[
                    styles.questionCard,
                    {
                      borderColor: isCorrect ? '#d1fae5' : '#fee2e2',
                      backgroundColor: isCorrect ? '#f0fdf4' : '#fef2f2',
                    },
                  ]}
                >
                  <View style={styles.questionHeader}>
                    <Text style={styles.questionNumber}>Question {index + 1}</Text>
                    <MaterialCommunityIcons
                      name={isCorrect ? 'check-circle' : 'close-circle'}
                      size={20}
                      color={isCorrect ? '#10b981' : '#dc2626'}
                    />
                  </View>

                  <Text style={styles.questionText}>{qResult.question}</Text>

                  {qResult.studentAnswer && (
                    <View style={styles.answerBox}>
                      <Text style={styles.answerLabel}>Your Answer:</Text>
                      <Text style={styles.answerText}>{qResult.studentAnswer}</Text>
                    </View>
                  )}

                  {qResult.correctAnswer && !isCorrect && (
                    <View style={styles.correctBox}>
                      <Text style={styles.answerLabel}>Correct Answer:</Text>
                      <Text style={styles.answerText}>{qResult.correctAnswer}</Text>
                    </View>
                  )}

                  {qResult.feedback && (
                    <View style={styles.feedbackBox}>
                      <MaterialCommunityIcons name="comment-text" size={16} color="#6b7280" />
                      <Text style={styles.feedbackText}>{qResult.feedback}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Back to Assessment</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  scoreCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 12,
  },
  scoreLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#3b82f6',
  },
  divider: {
    width: 1,
    backgroundColor: '#e5e7eb',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  feedbackMessage: {
    fontSize: 13,
    fontWeight: '500',
  },
  summarySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 4,
  },
  questionReviewSection: {
    marginBottom: 24,
  },
  questionCard: {
    borderWidth: 2,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  questionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
    lineHeight: 20,
  },
  answerBox: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 6,
    marginBottom: 10,
  },
  correctBox: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 6,
    marginBottom: 10,
  },
  answerLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 4,
    fontWeight: '600',
  },
  answerText: {
    fontSize: 13,
    color: '#1f2937',
    lineHeight: 18,
  },
  feedbackBox: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    gap: 10,
    alignItems: 'flex-start',
  },
  feedbackText: {
    flex: 1,
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
  actionSection: {
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

export default StudentAssessmentResultsScreen;



// ================================================================================
// FILE: src\screens\student\StudentAssessmentScreen.jsx
// ================================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { assessmentService } from '../../services/index';

const StudentAssessmentScreen = ({ route, navigation }) => {
  const { assessment, courseId } = route.params;
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAttempts();
  }, [assessment.id]);

  const fetchAttempts = async () => {
    setLoading(true);
    try {
      const res = await assessmentService.getStudentAttempts(assessment.id);
      if (res?.data && Array.isArray(res.data)) {
        setAttempts(res.data);
      }
    } catch (err) {
      console.error('Failed to load attempts', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartAttempt = async () => {
    try {
      const res = await assessmentService.startAttempt(assessment.id);
      if (res?.data) {
        navigation.navigate('StudentAssessmentTaking', {
          assessment,
          attempt: res.data,
          courseId,
        });
      }
    } catch (err) {
      console.error('Failed to start attempt', err);
    }
  };

  const handleViewResults = (attempt) => {
    navigation.navigate('StudentAssessmentResults', {
      attempt,
      assessment,
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Loading...</Text>
          </View>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>{assessment.title}</Text>
          <Text style={styles.headerSubtitle}>Assessment</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Assessment Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="help-box" size={24} color="#3b82f6" />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Questions</Text>
              <Text style={styles.infoValue}>
                {assessment.questions?.length || 0}
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="file-document" size={24} color="#8b5cf6" />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Type</Text>
              <Text style={styles.infoValue}>{assessment.type || 'Standard'}</Text>
            </View>
          </View>
        </View>

        {/* Start Assessment Button */}
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStartAttempt}
        >
          <MaterialCommunityIcons name="play-circle" size={20} color="#fff" />
          <Text style={styles.startButtonText}>Start Assessment</Text>
        </TouchableOpacity>

        {/* Attempts Section */}
        {attempts.length > 0 && (
          <View style={styles.attemptsSection}>
            <Text style={styles.sectionTitle}>Your Attempts</Text>

            {attempts.map((attempt, index) => (
              <TouchableOpacity
                key={attempt.id}
                style={styles.attemptCard}
                onPress={() => handleViewResults(attempt)}
              >
                <View style={styles.attemptHeader}>
                  <View>
                    <Text style={styles.attemptNumber}>Attempt {index + 1}</Text>
                    <Text style={styles.attemptDate}>
                      {new Date(attempt.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View style={styles.attemptScore}>
                    <Text style={styles.scoreValue}>
                      {attempt.score !== undefined ? Math.round(attempt.score) : '—'}%
                    </Text>
                  </View>
                </View>

                {attempt.feedback && (
                  <View style={styles.attemptFeedback}>
                    <MaterialCommunityIcons name="information" size={16} color="#6b7280" />
                    <Text style={styles.feedbackText}>{attempt.feedback}</Text>
                  </View>
                )}

                <View style={styles.attemptFooter}>
                  <View style={styles.statusBadge}>
                    {attempt.isCompleted ? (
                      <>
                        <MaterialCommunityIcons name="check-circle" size={14} color="#10b981" />
                        <Text style={styles.statusText}>Completed</Text>
                      </>
                    ) : (
                      <>
                        <MaterialCommunityIcons name="progress-check" size={14} color="#f97316" />
                        <Text style={styles.statusText}>In Progress</Text>
                      </>
                    )}
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#9ca3af" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* No Attempts Message */}
        {attempts.length === 0 && (
          <View style={styles.noAttemptsSection}>
            <MaterialCommunityIcons name="clipboard-outline" size={48} color="#d1d5db" />
            <Text style={styles.noAttemptsText}>No attempts yet</Text>
            <Text style={styles.noAttemptsSubtext}>Start the assessment to begin</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  infoSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  infoCard: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 2,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  attemptsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  attemptCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  attemptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  attemptNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  attemptDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  attemptScore: {
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3b82f6',
  },
  attemptFeedback: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    marginBottom: 10,
  },
  feedbackText: {
    flex: 1,
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
  attemptFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f0fdf4',
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '500',
  },
  noAttemptsSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  noAttemptsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 12,
  },
  noAttemptsSubtext: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
});

export default StudentAssessmentScreen;



// ================================================================================
// FILE: src\screens\student\StudentAssessmentTakingScreen.jsx
// ================================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { assessmentService } from '../../services/index';

const StudentAssessmentTakingScreen = ({ route, navigation }) => {
  const { assessment, attempt, courseId } = route.params;
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [responses, setResponses] = useState(attempt.responses || {});
  const [submitting, setSubmitting] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  const questions = assessment.questions || [];
  const currentQuestion = questions[currentQuestionIdx];
  const isLastQuestion = currentQuestionIdx === questions.length - 1;
  const isFirstQuestion = currentQuestionIdx === 0;

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAnswerChange = (questionId, answer) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleSubmitAssessment = async () => {
    const allAnswered = questions.every(q => responses[q.id] !== undefined && responses[q.id] !== '');
    if (!allAnswered) {
      Alert.alert('Incomplete', 'Please answer all questions before submitting');
      return;
    }

    setSubmitting(true);
    try {
      const responseArray = questions.map(q => {
        const answer = responses[q.id];
        return {
          questionId: q.id,
          studentAnswer: q.type === 'short_answer' || q.type === 'fill_blank' ? answer : undefined,
          selectedOptionId: ['multiple_choice', 'true_false', 'dropdown'].includes(q.type) ? answer : undefined,
          selectedOptionIds: q.type === 'multiple_select' ? (Array.isArray(answer) ? answer : []) : undefined,
        };
      });

      await assessmentService.submitAssessment({
        assessmentId: assessment.id,
        responses: responseArray,
        timeSpentSeconds: timeElapsed,
      });

      Alert.alert('Success', 'Assessment submitted successfully!', [
        {
          text: 'OK',
          onPress: () => {
            navigation.navigate('StudentAssessment', { assessment, courseId });
          },
        },
      ]);
    } catch (err) {
      console.error('Failed to submit assessment', err);
      Alert.alert('Error', 'Failed to submit assessment');
    } finally {
      setSubmitting(false);
      setShowConfirmSubmit(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderQuestionInput = () => {
    if (!currentQuestion) return null;

    const value = responses[currentQuestion.id] || '';

    switch (currentQuestion.type) {
      case 'multiple_choice':
        return (
          <View style={styles.optionsContainer}>
            {currentQuestion.options?.map(option => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionButton,
                  value === option.id && styles.selectedOption,
                ]}
                onPress={() => handleAnswerChange(currentQuestion.id, option.id)}
              >
                <View
                  style={[
                    styles.radioButton,
                    value === option.id && styles.radioButtonSelected,
                  ]}
                >
                  {value === option.id && <View style={styles.radioDot} />}
                </View>
                <Text style={[styles.optionText, value === option.id && styles.selectedOptionText]}>
                  {option.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'multiple_select':
        const selectedIds = Array.isArray(value) ? value : [];
        return (
          <View style={styles.optionsContainer}>
            {currentQuestion.options?.map(option => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionButton,
                  selectedIds.includes(option.id) && styles.selectedOption,
                ]}
                onPress={() => {
                  if (selectedIds.includes(option.id)) {
                    handleAnswerChange(currentQuestion.id, selectedIds.filter(id => id !== option.id));
                  } else {
                    handleAnswerChange(currentQuestion.id, [...selectedIds, option.id]);
                  }
                }}
              >
                <View
                  style={[
                    styles.checkButton,
                    selectedIds.includes(option.id) && styles.checkButtonSelected,
                  ]}
                >
                  {selectedIds.includes(option.id) && (
                    <MaterialCommunityIcons name="check" size={16} color="#dc2626" />
                  )}
                </View>
                <Text
                  style={[styles.optionText, selectedIds.includes(option.id) && styles.selectedOptionText]}
                >
                  {option.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'true_false':
        return (
          <View style={styles.optionsContainer}>
            {[
              { id: 'true', text: 'True' },
              { id: 'false', text: 'False' },
            ].map(option => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionButton,
                  value === option.id && styles.selectedOption,
                ]}
                onPress={() => handleAnswerChange(currentQuestion.id, option.id)}
              >
                <View
                  style={[
                    styles.radioButton,
                    value === option.id && styles.radioButtonSelected,
                  ]}
                >
                  {value === option.id && <View style={styles.radioDot} />}
                </View>
                <Text style={[styles.optionText, value === option.id && styles.selectedOptionText]}>
                  {option.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'short_answer':
      case 'fill_blank':
        return (
          <TextInput
            style={styles.textInput}
            placeholder="Enter your answer"
            value={value}
            onChangeText={(text) => handleAnswerChange(currentQuestion.id, text)}
            multiline
          />
        );

      default:
        return null;
    }
  };

  if (!currentQuestion) {
    return (
      <View style={styles.container}>
        <Text>No questions available</Text>
      </View>
    );
  }

  const progress = ((currentQuestionIdx + 1) / questions.length) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{assessment.title}</Text>
          <Text style={styles.headerSubtitle}>
            Question {currentQuestionIdx + 1} of {questions.length}
          </Text>
        </View>
        <View style={styles.timer}>
          <MaterialCommunityIcons name="clock-outline" size={16} color="#6b7280" />
          <Text style={styles.timerText}>{formatTime(timeElapsed)}</Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.questionSection}>
          <Text style={styles.questionNumber}>
            Question {currentQuestionIdx + 1}
          </Text>
          <Text style={styles.questionText}>{currentQuestion.text || currentQuestion.question}</Text>

          {currentQuestion.type === 'multiple_choice' ||
            currentQuestion.type === 'multiple_select' ||
            currentQuestion.type === 'true_false' ? (
            renderQuestionInput()
          ) : (
            renderQuestionInput()
          )}
        </View>
      </ScrollView>

      <View style={styles.navigationBar}>
        <TouchableOpacity
          style={[styles.navButton, isFirstQuestion && styles.navButtonDisabled]}
          onPress={() => setCurrentQuestionIdx(Math.max(0, currentQuestionIdx - 1))}
          disabled={isFirstQuestion}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={20}
            color={isFirstQuestion ? '#d1d5db' : '#3b82f6'}
          />
          <Text style={[styles.navButtonText, isFirstQuestion && styles.navButtonDisabledText]}>
            Previous
          </Text>
        </TouchableOpacity>

        {isLastQuestion ? (
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={() => setShowConfirmSubmit(true)}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="check" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Submit</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => setCurrentQuestionIdx(Math.min(questions.length - 1, currentQuestionIdx + 1))}
          >
            <Text style={styles.navButtonText}>Next</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#3b82f6" />
          </TouchableOpacity>
        )}
      </View>

      {/* Confirmation Modal */}
      {showConfirmSubmit && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MaterialCommunityIcons name="alert-circle" size={48} color="#dc2626" />
            <Text style={styles.modalTitle}>Submit Assessment?</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to submit? You won't be able to change your answers after submitting.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowConfirmSubmit(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleSubmitAssessment}
              >
                <Text style={styles.confirmButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  questionSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
  },
  questionNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 20,
    lineHeight: 24,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#fff',
    gap: 12,
  },
  selectedOption: {
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#dc2626',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#dc2626',
  },
  checkButton: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkButtonSelected: {
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  optionText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  selectedOptionText: {
    color: '#1f2937',
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1f2937',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  navigationBar: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#3b82f6',
    backgroundColor: '#fff',
    gap: 8,
  },
  navButtonDisabled: {
    opacity: 0.5,
    borderColor: '#e5e7eb',
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  navButtonDisabledText: {
    color: '#d1d5db',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#dc2626',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 12,
  },
  modalMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  confirmButton: {
    backgroundColor: '#dc2626',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

export default StudentAssessmentTakingScreen;



// ================================================================================
// FILE: src\screens\student\StudentCoursesScreen.jsx
// ================================================================================

import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { lessonService } from '../../services/index';
import api from '../../services/api';

const StudentCoursesScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completions, setCompletions] = useState({});
  const [lessonErrors, setLessonErrors] = useState({});

  useEffect(() => {
    console.log('[StudentCoursesScreen] useEffect triggered, user:', user);
    if (user?.id) {
      console.log('[StudentCoursesScreen] Loading courses for userId:', user.id);
      loadCourses();
    } else {
      console.log('[StudentCoursesScreen] User or userId not available:', { user, userId: user?.id });
      setLoading(false);
    }
  }, [user]);

  const loadCourses = async () => {
    console.log('[StudentCoursesScreen] loadCourses called for user:', user);
    setLoading(true);
    setError(null);
    try {
      console.log('[StudentCoursesScreen] Making API request to /classes/student/' + user.id);
      const response = await api.get(`/classes/student/${user.id}`);
      console.log('[StudentCoursesScreen] API response received:', response);
      
      if (response?.data?.data && Array.isArray(response.data.data)) {
        console.log('[StudentCoursesScreen] Processing ' + response.data.data.length + ' courses');
        const courseList = response.data.data.map(c => ({
          id: c.id,
          name: c.subjectName ? `${c.subjectName} (${(c.subjectCode || '').toUpperCase()})` : (c.name || 'Unknown'),
          grade: c.subjectGradeLevel ? `Grade ${c.subjectGradeLevel}` : (c.section?.gradeLevel ? `Grade ${c.section.gradeLevel}` : 'Grade —'),
          teacher: c.teacher ? `${c.teacher.firstName} ${c.teacher.lastName}` : 'Unknown',
          schedule: c.schedule || '—',
          students: Array.isArray(c.enrollments) ? c.enrollments.length : 0,
          progress: 0,
          color: pickColor(c.subjectCode || c.id),
          lessons: [],
        }));
        setCourses(courseList);
        setLoading(false); // Show UI immediately
        console.log('[StudentCoursesScreen] Courses set, showing UI. Loading lessons in background...');

        // Load lesson details in background (don't block)
        loadLessonsInBackground(courseList);
      } else {
        console.log('[StudentCoursesScreen] Invalid response structure:', response?.data);
        setLoading(false);
        setError('Invalid response from server');
      }
    } catch (error) {
      console.error('[StudentCoursesScreen] Error loading courses:', error);
      console.error('[StudentCoursesScreen] Error message:', error.message);
      console.error('[StudentCoursesScreen] Error response:', error.response?.data);
      setError('Could not load courses. Check your connection and try again.');
      setLoading(false);
    }
  };

  const loadLessonsInBackground = async (courseList) => {
    try {
      // Load all lessons in parallel
      await Promise.all(courseList.map(course => loadLessonsForCourse(course)));
    } catch (err) {
      console.error('Background lesson loading error:', err);
    }
  };

  const loadLessonsForCourse = async (course) => {
    try {
      console.log('[StudentCoursesScreen] Loading lessons for course:', course.id);
      const res = await lessonService.getLessonsByClass(course.id);
      console.log('[StudentCoursesScreen] Lessons response for course ' + course.id + ':', res);
      
      if (res?.data && Array.isArray(res.data)) {
        console.log('[StudentCoursesScreen] Got ' + res.data.length + ' lessons for course ' + course.id);
        setCourses(prev => 
          prev.map(c => c.id === course.id ? { ...c, lessons: res.data } : c)
        );

        // Fetch completion status
        console.log('[StudentCoursesScreen] Loading completion status for course:', course.id);
        const completionRes = await lessonService.getCompletedLessonsForClass(course.id);
        console.log('[StudentCoursesScreen] Completion response for course ' + course.id + ':', completionRes);
        
        if (completionRes?.data && Array.isArray(completionRes.data)) {
          const completed = completionRes.data.length;
          const total = res.data.length || 0;
          const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

          console.log('[StudentCoursesScreen] Course ' + course.id + ' progress: ' + completed + '/' + total + ' = ' + progress + '%');

          setCompletions(prev => ({
            ...prev,
            [course.id]: { completed, total, progress },
          }));

          setCourses(prev =>
            prev.map(c => c.id === course.id ? { ...c, progress } : c)
          );
        }
      } else {
        console.log('[StudentCoursesScreen] Invalid lesson response structure for course ' + course.id + ':', res);
      }
    } catch (err) {
      console.error('[StudentCoursesScreen] Failed to load lessons for class ' + course.id + ':', err);
      setLessonErrors(prev => ({ ...prev, [course.id]: true }));
    }
  };

  const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F97316', '#EC4899', '#14B8A6', '#64748B'];
  const pickColor = (seed) => {
    if (!seed) return COLORS[0];
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = (h << 5) - h + seed.charCodeAt(i);
      h |= 0;
    }
    return COLORS[Math.abs(h) % COLORS.length];
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>My Courses</Text>
          <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Loading...</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
          <ActivityIndicator size="large" color="#3b82f6" />
          {error && (
            <View style={{ marginTop: 20, width: '100%' }}>
              <View style={{ padding: 12, backgroundColor: '#fef2f2', borderRadius: 8, borderWidth: 1, borderColor: '#fecaca', marginBottom: 12 }}>
                <Text style={{ color: '#dc2626', fontSize: 14 }}>{error}</Text>
              </View>
              <TouchableOpacity
                onPress={loadCourses}
                style={{ backgroundColor: '#3b82f6', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 }}
              >
                <Text style={{ color: '#fff', fontWeight: '600', textAlign: 'center' }}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Courses</Text>
        <Text style={styles.subtitle}>
          {courses.length} course{courses.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {error && (
        <View style={{ margin: 16, padding: 12, backgroundColor: '#fef2f2', borderRadius: 8, borderWidth: 1, borderColor: '#fecaca' }}>
          <Text style={{ color: '#dc2626', fontSize: 14 }}>{error}</Text>
          <TouchableOpacity onPress={loadCourses} style={{ marginTop: 8 }}>
            <Text style={{ color: '#3b82f6', fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.courseList}>
        {courses.map((course) => (
          <TouchableOpacity
            key={course.id}
            style={[styles.courseItem, { borderLeftColor: course.color }]}
            onPress={() =>
              navigation.navigate('CourseDetails', { courseId: course.id })
            }
          >
            <View style={styles.courseContent}>
              <Text style={styles.courseName}>{course.name}</Text>
              <Text style={styles.courseInstructor}>{course.teacher}</Text>
              <Text style={styles.courseGrade}>{course.grade}</Text>
              <View style={styles.courseFooter}>
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { width: `${course.progress}%`, backgroundColor: course.color }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressText}>{course.progress}% complete</Text>
                </View>
                <View style={styles.courseStats}>
                  <MaterialCommunityIcons name="book-outline" size={14} color="#6b7280" />
                  <Text style={styles.statText}>{course.lessons.length} lessons</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  courseList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  courseItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  courseContent: {
    gap: 8,
  },
  courseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  courseInstructor: {
    fontSize: 13,
    color: '#6b7280',
  },
  courseGrade: {
    fontSize: 12,
    color: '#9ca3af',
  },
  courseFooter: {
    marginTop: 8,
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
  },
  courseStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#6b7280',
  },
});

export default StudentCoursesScreen;



// ================================================================================
// FILE: src\screens\student\StudentDashboardScreen.jsx
// ================================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { lessonService, assessmentService } from '../../services/index';

const StudentDashboardScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalCourses: 0,
    lessonsCompleted: 0,
    assessmentsTaken: 0,
    averageScore: 0,
  });

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Logout',
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: () => logout(),
          style: 'destructive',
        },
      ]
    );
  }, [logout]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleLogout} style={{ marginRight: 12 }}>
          <MaterialCommunityIcons name="logout" size={24} color="#dc2626" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleLogout]);

  useEffect(() => {
    if (user?.userId) {
      loadDashboardData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const coursesRes = await api.get(`/classes/student/${user.userId}`);

      if (coursesRes?.data?.data && Array.isArray(coursesRes.data.data)) {
        const courseList = coursesRes.data.data.map(c => ({
          id: c.id,
          name: c.subjectName ? `${c.subjectName} (${(c.subjectCode || '').toUpperCase()})` : (c.name || 'Unknown'),
          teacher: c.teacher ? `${c.teacher.firstName} ${c.teacher.lastName}` : 'Unknown',
          progress: 0,
          color: pickColor(c.subjectCode || c.id),
        }));
        setCourses(courseList);
        setStats(prev => ({ ...prev, totalCourses: courseList.length }));

        // Load detailed stats in background (don't block UI)
        loadStatsInBackground(courseList);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Could not load courses. Check your connection and try again.');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStatsInBackground = async (courseList) => {
    try {
      let totalLessonsCompleted = 0;
      let totalAssessmentsTaken = 0;
      let totalScores = 0;
      let scoreCount = 0;

      for (const course of courseList) {
        try {
          // Get lessons progress
          const lessonsRes = await Promise.race([
            lessonService.getLessonsByClass(course.id),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
          ]);

          const completedRes = await Promise.race([
            lessonService.getCompletedLessonsForClass(course.id),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
          ]);
          
          if (lessonsRes?.data && Array.isArray(lessonsRes.data)) {
            const total = lessonsRes.data.length || 0;
            const completed = completedRes?.data ? completedRes.data.length : 0;
            totalLessonsCompleted += completed;
            
            setCourses(prev => prev.map(c => 
              c.id === course.id ? { ...c, progress: total > 0 ? Math.round((completed / total) * 100) : 0 } : c
            ));
          }
        } catch (err) {
          console.log(`Skipping lessons for course ${course.id}:`, err.message);
        }

        try {
          // Get assessments progress
          const assessmentsRes = await Promise.race([
            assessmentService.getAssessmentsByClass(course.id),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
          ]);

          if (assessmentsRes?.data && Array.isArray(assessmentsRes.data)) {
            const published = assessmentsRes.data.filter(a => a.isPublished !== false);
            
            for (const assessment of published) {
              try {
                const attemptsRes = await Promise.race([
                  assessmentService.getStudentAttempts(assessment.id),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
                ]);

                if (attemptsRes?.data && Array.isArray(attemptsRes.data)) {
                  totalAssessmentsTaken += attemptsRes.data.length;
                  
                  attemptsRes.data.forEach(attempt => {
                    if (attempt.score !== undefined) {
                      totalScores += attempt.score;
                      scoreCount++;
                    }
                  });
                }
              } catch (err) {
                console.log('Skipping assessment attempt:', err.message);
              }
            }
          }
        } catch (err) {
          console.log(`Skipping assessments for course ${course.id}:`, err.message);
        }
      }

      setStats({
        totalCourses: courseList.length,
        lessonsCompleted: totalLessonsCompleted,
        assessmentsTaken: totalAssessmentsTaken,
        averageScore: scoreCount > 0 ? Math.round(totalScores / scoreCount) : 0,
      });
    } catch (err) {
      console.error('Stats loading error:', err);
    }
  };

  const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F97316', '#EC4899', '#14B8A6', '#64748B'];
  const pickColor = (seed) => {
    if (!seed) return COLORS[0];
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = (h << 5) - h + seed.charCodeAt(i);
      h |= 0;
    }
    return COLORS[Math.abs(h) % COLORS.length];
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={{ color: '#6b7280', marginTop: 12 }}>Loading dashboard...</Text>
          <TouchableOpacity
            onPress={handleLogout}
            style={{ marginTop: 24, paddingVertical: 10, paddingHorizontal: 24, backgroundColor: '#dc2626', borderRadius: 8 }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {error && (
        <View style={{ margin: 16, padding: 12, backgroundColor: '#fef2f2', borderRadius: 8, borderWidth: 1, borderColor: '#fecaca' }}>
          <Text style={{ color: '#dc2626', fontSize: 14 }}>{error}</Text>
          <TouchableOpacity onPress={loadDashboardData} style={{ marginTop: 8 }}>
            <Text style={{ color: '#3b82f6', fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Greeting Card */}
      <Card style={styles.greetingCard}>
        <Card.Content style={styles.greetingContent}>
          <View style={styles.greetingTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.userName}>
                {user?.firstName} {user?.lastName}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile')}
              style={styles.profileButton}
            >
              <MaterialCommunityIcons
                name="account-circle"
                size={40}
                color="#3b82f6"
              />
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons
              name="book"
              size={24}
              color="#3b82f6"
            />
            <Text style={styles.statNumber}>{stats.totalCourses}</Text>
            <Text style={styles.statLabel}>Courses</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons
              name="check-circle"
              size={24}
              color="#10b981"
            />
            <Text style={styles.statNumber}>{stats.lessonsCompleted}</Text>
            <Text style={styles.statLabel}>Lessons</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons
              name="file-document"
              size={24}
              color="#f97316"
            />
            <Text style={styles.statNumber}>{stats.assessmentsTaken}</Text>
            <Text style={styles.statLabel}>Assessments</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons
              name="star"
              size={24}
              color="#8b5cf6"
            />
            <Text style={styles.statNumber}>{stats.averageScore}%</Text>
            <Text style={styles.statLabel}>Avg Score</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Continue Learning Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Courses</Text>
          <TouchableOpacity onPress={() => navigation.navigate('StudentCourses')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {courses.length > 0 ? (
          <View style={styles.coursesList}>
            {courses.slice(0, 3).map((course) => (
              <TouchableOpacity
                key={course.id}
                style={[styles.courseCard, { borderLeftColor: course.color }]}
                onPress={() =>
                  navigation.navigate('CourseDetails', { courseId: course.id })
                }
              >
                <Text style={styles.courseName} numberOfLines={1}>
                  {course.name}
                </Text>
                <Text style={styles.courseTeacher} numberOfLines={1}>
                  {course.teacher}
                </Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${course.progress}%`,
                        backgroundColor: course.color,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>{course.progress}%</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="book-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No courses yet</Text>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('StudentCourses')}
          >
            <MaterialCommunityIcons
              name="book-multiple"
              size={32}
              color="#3b82f6"
            />
            <Text style={styles.actionLabel}>Courses</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('StudentCourses')}
          >
            <MaterialCommunityIcons
              name="file-document-multiple"
              size={32}
              color="#dc2626"
            />
            <Text style={styles.actionLabel}>Assessments</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Profile')}
          >
            <MaterialCommunityIcons
              name="account"
              size={32}
              color="#8b5cf6"
            />
            <Text style={styles.actionLabel}>Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Notifications')}
          >
            <MaterialCommunityIcons
              name="bell"
              size={32}
              color="#f97316"
            />
            <Text style={styles.actionLabel}>Notifications</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  greetingCard: {
    margin: 16,
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
    borderWidth: 1,
  },
  greetingContent: {
    paddingVertical: 20,
  },
  greetingTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  greeting: {
    fontSize: 14,
    color: '#6b7280',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 4,
  },
  profileButton: {
    padding: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    marginBottom: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: '#fff',
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  seeAllText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
  },
  coursesList: {
    gap: 12,
  },
  courseCard: {
    backgroundColor: '#fff',
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 12,
  },
  courseName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  courseTeacher: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginVertical: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  progressText: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 12,
    color: '#1f2937',
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default StudentDashboardScreen;



// ================================================================================
// FILE: src\screens\student\StudentLessonViewerScreen.jsx
// ================================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { lessonService } from '../../services/index';

const StudentLessonViewerScreen = ({ route, navigation }) => {
  const { lesson, courseId, allLessons = [] } = route.params;
  const [contentBlocks, setContentBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    if (lesson?.id) {
      fetchLessonContent();
      fetchCompletionStatus();
    }
  }, [lesson?.id]);

  const fetchLessonContent = async () => {
    setLoading(true);
    try {
      const res = await lessonService.getLessonById(lesson.id);
      if (res?.data) {
        const blocks = Array.isArray(res.data) ? res.data : (res.data.contentBlocks || []);
        setContentBlocks(blocks);
      }
    } catch (err) {
      console.error('Failed to load lesson content', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletionStatus = async () => {
    try {
      const res = await lessonService.checkLessonCompletion(lesson.id);
      if (res?.data) {
        setIsCompleted(res.data.isCompleted);
      }
    } catch (err) {
      console.error('Failed to load completion status', err);
    }
  };

  const handleMarkComplete = async () => {
    try {
      await lessonService.markLessonComplete(lesson.id);
      setIsCompleted(true);
    } catch (err) {
      console.error('Failed to mark lesson complete', err);
    }
  };

  const currentLessonIndex = allLessons.findIndex(l => l.id === lesson.id);
  const previousLesson = currentLessonIndex > 0 ? allLessons[currentLessonIndex - 1] : null;
  const nextLesson = currentLessonIndex < allLessons.length - 1 ? allLessons[currentLessonIndex + 1] : null;

  const handleNavigateLesson = (targetLesson) => {
    navigation.push('StudentLessonViewer', {
      lesson: targetLesson,
      courseId,
      allLessons,
    });
  };

  const renderContentBlock = (block) => {
    const content = typeof block.content === 'string' ? block.content : JSON.stringify(block.content);

    switch (block.type) {
      case 'text':
        return (
          <View key={block.id} style={styles.contentBlock}>
            <Text style={styles.blockText}>{content}</Text>
          </View>
        );

      case 'heading':
        return (
          <View key={block.id} style={styles.contentBlock}>
            <Text style={styles.blockHeading}>{content}</Text>
          </View>
        );

      case 'image':
        return (
          <View key={block.id} style={styles.contentBlock}>
            <MaterialCommunityIcons name="image" size={60} color="#d1d5db" />
            <Text style={styles.blockCaption}>{content || 'Image content'}</Text>
          </View>
        );

      case 'video':
        return (
          <View key={block.id} style={styles.contentBlock}>
            <View style={styles.videoContainer}>
              <MaterialCommunityIcons name="play-circle" size={60} color="#dc2626" />
            </View>
            <Text style={styles.blockCaption}>{content || 'Video content'}</Text>
          </View>
        );

      case 'code':
        return (
          <View key={block.id} style={styles.contentBlock}>
            <View style={styles.codeBlock}>
              <Text style={styles.codeText}>{content}</Text>
            </View>
          </View>
        );

      case 'quote':
        return (
          <View key={block.id} style={styles.contentBlock}>
            <View style={styles.quoteBlock}>
              <MaterialCommunityIcons name="quote-left" size={20} color="#9ca3af" />
              <Text style={styles.quoteText}>{content}</Text>
            </View>
          </View>
        );

      default:
        return (
          <View key={block.id} style={styles.contentBlock}>
            <Text style={styles.blockText}>{content}</Text>
          </View>
        );
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Loading...</Text>
          </View>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{lesson.title || lesson.name}</Text>
        </View>
        {isCompleted && (
          <MaterialCommunityIcons name="check-circle" size={24} color="#10b981" />
        )}
      </View>

      <View style={[styles.progressBar, { width: `${scrollProgress}%` }]} />

      <ScrollView 
        style={styles.content}
        onScroll={(e) => {
          const scrollHeight = e.nativeEvent.contentSize.height - e.nativeEvent.layoutMeasurement.height;
          const progress = scrollHeight > 0 ? (e.nativeEvent.contentOffset.y / scrollHeight) * 100 : 0;
          setScrollProgress(Math.min(progress, 100));
        }}
        scrollEventThrottle={16}
      >
        <View style={styles.lessonContent}>
          {contentBlocks.length > 0 ? (
            contentBlocks.map(block => renderContentBlock(block))
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="file-document-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>No content available</Text>
            </View>
          )}

          <View style={styles.navigationSection}>
            {previousLesson && (
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => handleNavigateLesson(previousLesson)}
              >
                <MaterialCommunityIcons name="chevron-left" size={20} color="#3b82f6" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.navLabel}>Previous</Text>
                  <Text style={styles.navLessonName} numberOfLines={1}>
                    {previousLesson.title || previousLesson.name}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {nextLesson && (
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => handleNavigateLesson(nextLesson)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.navLabel}>Next</Text>
                  <Text style={styles.navLessonName} numberOfLines={1}>
                    {nextLesson.title || nextLesson.name}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#3b82f6" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.completeButton, isCompleted && styles.completedButton]}
          onPress={handleMarkComplete}
          disabled={isCompleted}
        >
          <MaterialCommunityIcons
            name={isCompleted ? 'check-circle' : 'check'}
            size={20}
            color={isCompleted ? '#10b981' : '#fff'}
          />
          <Text style={[styles.buttonText, isCompleted && styles.completedButtonText]}>
            {isCompleted ? 'Completed' : 'Mark as Complete'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  progressBar: {
    height: 2,
    backgroundColor: '#3b82f6',
  },
  content: {
    flex: 1,
  },
  lessonContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  contentBlock: {
    marginBottom: 20,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  blockText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
  },
  blockHeading: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  blockCaption: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  videoContainer: {
    height: 200,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  codeBlock: {
    backgroundColor: '#1f2937',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#e5e7eb',
    lineHeight: 18,
  },
  quoteBlock: {
    paddingLeft: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
    paddingVertical: 8,
  },
  quoteText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#6b7280',
    marginTop: 4,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 12,
  },
  navigationSection: {
    gap: 12,
    marginTop: 24,
    marginBottom: 12,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  navLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  navLessonName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  completedButton: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  completedButtonText: {
    color: '#10b981',
  },
});

export default StudentLessonViewerScreen;



// ================================================================================
// FILE: src\screens\teacher\ClassDetailsScreen.js
// ================================================================================

import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { Card } from 'react-native-paper';
import { teacherService } from '../../services';

const ClassDetailsScreen = ({ route }) => {
  const { classId } = route.params;
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClass();
  }, [classId]);

  const loadClass = async () => {
    try {
      const response = await teacherService.getClassDetails(classId);
      setClassData(response);
    } catch (error) {
      console.error('Failed to load class:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!classData) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.headerCard}>
        <Card.Content>
          <Text style={styles.title}>{classData.name}</Text>
          <Text style={styles.subject}>{classData.subject}</Text>
        </Card.Content>
      </Card>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Class Information</Text>
        <Card>
          <Card.Content style={styles.details}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Section:</Text>
              <Text style={styles.detailValue}>{classData.section}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Students:</Text>
              <Text style={styles.detailValue}>
                {classData.studentCount || 0}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Semester:</Text>
              <Text style={styles.detailValue}>{classData.semester}</Text>
            </View>
          </Card.Content>
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Card>
          <Card.Content>
            <Text style={styles.description}>
              {classData.description || 'No description available'}
            </Text>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  headerCard: {
    margin: 16,
    backgroundColor: '#faf5ff',
    borderColor: '#8b5cf6',
    borderWidth: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subject: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  details: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
});

export default ClassDetailsScreen;



// ================================================================================
// FILE: src\screens\teacher\TeacherClassesScreen.js
// ================================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Card } from 'react-native-paper';
import { teacherService } from '../../services';

const TeacherClassesScreen = ({ navigation }) => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const response = await teacherService.getTeacherClasses();
      setClasses(response);
    } catch (error) {
      console.error('Failed to load classes:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Classes</Text>
        <Text style={styles.subtitle}>
          {classes.length} class{classes.length !== 1 ? 'es' : ''}
        </Text>
      </View>

      <View style={styles.classList}>
        {classes.map((classItem) => (
          <TouchableOpacity
            key={classItem.id}
            style={styles.classItem}
            onPress={() =>
              navigation.navigate('ClassDetails', { classId: classItem.id })
            }
          >
            <View style={styles.classContent}>
              <Text style={styles.className}>{classItem.name}</Text>
              <Text style={styles.classSubject}>{classItem.subject}</Text>
              <View style={styles.classFooter}>
                <Text style={styles.studentCount}>
                  {classItem.studentCount || 0} students
                </Text>
                <Text style={styles.classSection}>
                  Section: {classItem.section}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  classList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  classItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#8b5cf6',
  },
  classContent: {
    gap: 8,
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  classSubject: {
    fontSize: 14,
    color: '#6b7280',
  },
  classFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  studentCount: {
    fontSize: 12,
    color: '#9ca3af',
  },
  classSection: {
    fontSize: 12,
    color: '#8b5cf6',
    fontWeight: '600',
  },
});

export default TeacherClassesScreen;



// ================================================================================
// FILE: src\screens\teacher\TeacherDashboardScreen.js
// ================================================================================

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

const TeacherDashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [classes] = useState([
    {
      id: 1,
      name: 'Introduction to Web Development',
      subject: 'Web Development',
      section: 'Section A',
      studentCount: 32,
      schedule: 'Mon, Wed, Fri - 10:00 AM',
    },
    {
      id: 2,
      name: 'Advanced React Patterns',
      subject: 'Frontend Development',
      section: 'Section B',
      studentCount: 28,
      schedule: 'Tue, Thu - 2:00 PM',
    },
    {
      id: 3,
      name: 'Database Design',
      subject: 'Backend Development',
      section: 'Section C',
      studentCount: 25,
      schedule: 'Mon, Wed - 1:00 PM',
    },
    {
      id: 4,
      name: 'Mobile Development',
      subject: 'Mobile Apps',
      section: 'Section A',
      studentCount: 20,
      schedule: 'Tue, Thu - 10:00 AM',
    },
  ]);

  return (
    <ScrollView style={styles.container}>
      {/* Header Card */}
      <Card style={styles.headerCard}>
        <Card.Content style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.userName}>
                {user?.firstName} {user?.lastName}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile')}
              style={styles.profileButton}
            >
              <MaterialCommunityIcons
                name="account-circle"
                size={40}
                color="#8b5cf6"
              />
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons
              name="school"
              size={24}
              color="#8b5cf6"
            />
            <Text style={styles.statNumber}>{classes.length}</Text>
            <Text style={styles.statLabel}>Classes</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons
              name="account-multiple"
              size={24}
              color="#06b6d4"
            />
            <Text style={styles.statNumber}>
              {classes.reduce((sum, c) => sum + (c.studentCount || 0), 0)}
            </Text>
            <Text style={styles.statLabel}>Students</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons
              name="file-document"
              size={24}
              color="#ec4899"
            />
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Assignments</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Classes Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Classes</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Classes')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {classes.slice(0, 3).map((classItem) => (
          <Card
            key={classItem.id}
            style={styles.classCard}
            onPress={() =>
              navigation.navigate('ClassDetails', { classId: classItem.id })
            }
          >
            <Card.Content>
              <Text style={styles.className}>{classItem.name}</Text>
              <Text style={styles.classSubject}>{classItem.subject}</Text>
              <View style={styles.classFooter}>
                <Text style={styles.studentCount}>
                  {classItem.studentCount || 0} students
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color="#9ca3af"
                />
              </View>
            </Card.Content>
          </Card>
        ))}
      </View>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  headerCard: {
    margin: 16,
    backgroundColor: '#faf5ff',
    borderColor: '#8b5cf6',
    borderWidth: 1,
  },
  headerContent: {
    paddingVertical: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 14,
    color: '#6b7280',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 4,
  },
  profileButton: {
    padding: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    elevation: 2,
    borderRadius: 8,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  seeAll: {
    color: '#8b5cf6',
    fontWeight: '500',
  },
  classCard: {
    marginBottom: 12,
    backgroundColor: '#fff',
    elevation: 2,
    borderRadius: 8,
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  classSubject: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  classFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  studentCount: {
    fontSize: 12,
    color: '#9ca3af',
  },

});

export default TeacherDashboardScreen;



// ================================================================================
// FILE: src\services\api.js
// ================================================================================

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ============================================================
// IMPORTANT: Configure your PC's IP address here
// ============================================================
// Get your IPv4 address by running: ipconfig (in PowerShell)
// Then replace '192.168.1.100' with your actual IP address
// For example: '192.168.0.50' or '10.0.0.5'
const PC_IP_ADDRESS = '10.206.183.114'; // <-- Your WiFi hotspot IP
const API_PORT = 3000;

const getApiBaseUrl = () => {
  // Allow override from env
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // For physical devices, always use the PC's IP address
  if (Platform.OS === 'android') {
    return `http://${PC_IP_ADDRESS}:${API_PORT}/api`;
  }

  if (Platform.OS === 'ios') {
    return `http://${PC_IP_ADDRESS}:${API_PORT}/api`;
  }

  // Web fallback
  return 'http://localhost:3000/api';
};

const API_BASE_URL = getApiBaseUrl();
console.log('🌐 API Base URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
});

// Add token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('authToken');
      // Navigation to login would be handled by the app
    }
    return Promise.reject(error);
  }
);

export default api;



// ================================================================================
// FILE: src\services\storage.js
// ================================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

export const storageService = {
  setItem: async (key, value) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Storage error:', error);
    }
  },

  getItem: async (key) => {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Storage error:', error);
      return null;
    }
  },

  removeItem: async (key) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Storage error:', error);
    }
  },

  clear: async () => {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Storage error:', error);
    }
  },
};



// ================================================================================
// FILE: src\utils\helpers.js
// ================================================================================

export const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString();
};

export const formatTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDateTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString();
};

export const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const getInitials = (firstName, lastName) => {
  const f = firstName?.charAt(0).toUpperCase() || '';
  const l = lastName?.charAt(0).toUpperCase() || '';
  return `${f}${l}`;
};

export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    return error.response.data?.message || 'An error occurred';
  } else if (error.request) {
    // Request made but no response
    return 'No response from server. Please check your connection.';
  } else {
    // Error in request setup
    return error.message || 'An error occurred';
  }
};



// ================================================================================
// FILE: src\utils\platformIcons.js
// ================================================================================

import { Platform } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

// On web, provide simple text-based icons as fallback
// On native, use Material Community Icons
export const getIcon = (iconName, size = 24, color = '#000') => {
  if (Platform.OS === 'web') {
    // Simple emoji/text fallback icons for web
    const iconMap = {
      'home': '🏠',
      'book-open': '📖',
      'school': '🎓',
      'account': '👤',
      'bell': '🔔',
      'message': '💬',
      'settings': '⚙️',
      'logout': '🚪',
      'plus': '➕',
      'delete': '🗑️',
      'edit': '✏️',
      'check': '✓',
      'close': '✕',
      'menu': '☰',
      'search': '🔍',
      'chevron-right': '›',
      'calendar': '📅',
      'clock': '🕐',
    };
    return iconMap[iconName] || '•';
  }

  return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
};

export const Icon = ({
  name,
  size = 24,
  color = '#000',
  style,
  ...props
}) => {
  if (Platform.OS === 'web') {
    const iconMap = {
      'home': '🏠',
      'book-open': '📖',
      'school': '🎓',
      'account': '👤',
      'bell': '🔔',
      'message': '💬',
      'settings': '⚙️',
      'logout': '🚪',
      'plus': '➕',
      'delete': '🗑️',
      'edit': '✏️',
      'check': '✓',
      'close': '✕',
      'menu': '☰',
      'search': '🔍',
      'chevron-right': '›',
      'calendar': '📅',
      'clock': '🕐',
    };
    return (
      <Text style={[style, { fontSize: size, color }]} {...props}>
        {iconMap[name] || '•'}
      </Text>
    );
  }

  return (
    <MaterialCommunityIcons
      name={name}
      size={size}
      color={color}
      style={style}
      {...props}
    />
  );
};




// ================================================================================
// END OF EXPORT
// ================================================================================
