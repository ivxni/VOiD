import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { colors, fonts, fontSize } from '../../lib/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.white,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: styles.tabLabel,
        animation: 'fade',
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <FontAwesome5
              name="home"
              size={20}
              color={focused ? colors.white : colors.muted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          title: 'Gallery',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name="grid-outline"
              size={20}
              color={focused ? colors.white : colors.muted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name="settings-sharp"
              size={20}
              color={focused ? colors.white : colors.muted}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.charcoal,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    height: 88,
    paddingTop: 8,
    paddingBottom: 28,
  },
  tabLabel: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
