import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import JAcademyFloatingButton from '../components/JAcademyFloatingButton';
import JAcademyScreen from '../screens/JAcademy/JAcademyScreen';
import { useSfx } from '../context/SfxContext';
import useSound from '../utils/useSound';

// click sound asset
const clickSoundAsset = require('../../assets/sounds/click.wav');
import ChatbotScreen from '../screens/Chatbot/ChatbotScreen';

// Screens
import AssessmentsScreen from '../screens/Assessments/AssessmentsScreen';
import AssessmentDetailScreen from '../screens/Assessments/AssessmentDetailScreen';
import LessonsScreen from '../screens/Lessons/LessonsScreen';
import LessonDetailScreen from '../screens/Lessons/LessonDetailScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';

// Styles
import { colors } from '../styles/colors';

const Tab = createBottomTabNavigator();
const AssessmentsStack = createNativeStackNavigator();
const LessonsStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

// Assessments Stack Navigator
const AssessmentsStackNavigator = () => (
  <AssessmentsStack.Navigator
    screenOptions={{
      headerShown: true,
      headerStyle: {
        backgroundColor: colors.white,
        elevation: 2,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      headerTintColor: colors.textPrimary,
      headerTitleStyle: {
        fontWeight: '700',
        fontSize: 18,
      },
    }}
  >
    <AssessmentsStack.Screen
      name="AssessmentsMain"
      component={AssessmentsScreen}
      options={{
        title: 'Assessments',
        headerShown: false,
      }}
    />
    <AssessmentsStack.Screen
      name="AssessmentDetail"
      component={AssessmentDetailScreen}
      options={({ route }) => ({
        title: route.params?.title || 'Assessment',
      })}
    />
  </AssessmentsStack.Navigator>
);

// Lessons Stack Navigator
const LessonsStackNavigator = () => (
  <LessonsStack.Navigator
    screenOptions={{
      headerShown: true,
      headerStyle: {
        backgroundColor: colors.white,
        elevation: 2,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      headerTintColor: colors.textPrimary,
      headerTitleStyle: {
        fontWeight: '700',
        fontSize: 18,
      },
    }}
  >
    <LessonsStack.Screen
      name="LessonsMain"
      component={LessonsScreen}
      options={{
        title: 'Lessons',
        headerShown: false,
      }}
    />
    <LessonsStack.Screen
      name="LessonDetail"
      component={LessonDetailScreen}
      options={({ route }) => ({
        title: route.params?.title || 'Lesson',
      })}
    />
  </LessonsStack.Navigator>
);

// Profile Stack Navigator
const ProfileStackNavigator = () => (
  <ProfileStack.Navigator
    screenOptions={{
      headerShown: true,
      headerStyle: {
        backgroundColor: colors.white,
        elevation: 2,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      headerTintColor: colors.textPrimary,
      headerTitleStyle: {
        fontWeight: '700',
        fontSize: 18,
      },
    }}
  >
    <ProfileStack.Screen
      name="ProfileMain"
      component={ProfileScreen}
      options={{
        title: 'Profile',
        headerShown: false,
      }}
    />
  </ProfileStack.Navigator>
);

// Main Bottom Tab Navigator
const RootNavigator = () => {
  const { enabled } = useSfx();
  const { play } = useSound(clickSoundAsset);
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'circle-outline';

          if (route.name === 'Assessments') {
            iconName = focused ? 'clipboard-check' : 'clipboard-check-outline';
          } else if (route.name === 'Lessons') {
            iconName = focused ? 'book-open' : 'book-open-outline';
          } else if (route.name === 'Chatbot') {
            iconName = focused ? 'robot' : 'robot';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'account-circle' : 'account-circle-outline';
          }

          return (
            <MaterialCommunityIcons name={iconName} size={size} color={color} />
          );
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.secondary,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.secondaryLight,
          borderTopWidth: 1,
          elevation: 8,
          shadowColor: colors.black,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
      })}
    >
      <Tab.Screen
        name="Assessments"
        component={AssessmentsStackNavigator}
        options={{
          title: 'Assessments',
        }}
        listeners={() => ({
          tabPress: () => {
            if (enabled) play();
          },
        })}
      />
      <Tab.Screen
        name="Lessons"
        component={LessonsStackNavigator}
        options={{
          title: 'Lessons',
        }}
        listeners={() => ({
          tabPress: () => {
            if (enabled) play();
          },
        })}
      />
      <Tab.Screen
        name="Chatbot"
        component={
          (() => {
            const ChatStack = createNativeStackNavigator();
            return function ChatStackNav() {
              return (
                <ChatStack.Navigator screenOptions={{ headerShown: true }}>
                  <ChatStack.Screen name="ChatbotMain" component={ChatbotScreen} options={{ title: 'Chatbot' }} />
                </ChatStack.Navigator>
              );
            };
          })()
        }
        options={{
          title: 'Chatbot',
        }}
        listeners={() => ({
          tabPress: () => {
            if (enabled) play();
          },
        })}
      />
      {/* Hidden route for JAcademy - navigated by floating button */}
      <Tab.Screen
        name="JAcademyHidden"
        component={
          (() => {
            const JAcademyStack = createNativeStackNavigator();
            return function JAcademyStackNav() {
              return (
                <JAcademyStack.Navigator screenOptions={{ headerShown: true }}>
                  <JAcademyStack.Screen name="JAcademyMain" component={JAcademyScreen} options={{ title: 'JAcademy' }} />
                </JAcademyStack.Navigator>
              );
            };
          })()
        }
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{
          title: 'Profile',
        }}
        listeners={() => ({
          tabPress: () => {
            if (enabled) play();
          },
        })}
      />
    </Tab.Navigator>
      <JAcademyFloatingButton />
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.white,
    borderTopColor: colors.secondaryLight,
    borderTopWidth: 1,
  },
});

export default RootNavigator;
