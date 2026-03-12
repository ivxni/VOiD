import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { useAuthStore } from '../lib/store/useAuthStore';
import { colors } from '../lib/constants/theme';

const ONBOARDING_KEY = 'void_onboarding_complete';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  const { isAuthenticated, isLoading, restoreSession } = useAuthStore();
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const segments = useSegments();
  const router = useRouter();

  // On first launch, restore saved session + check onboarding flag
  useEffect(() => {
    const init = async () => {
      await restoreSession();
      const flag = await AsyncStorage.getItem(ONBOARDING_KEY);
      setOnboardingComplete(flag === 'true');
    };
    init();
  }, []);

  // Navigation guard
  useEffect(() => {
    if (isLoading || !fontsLoaded || onboardingComplete === null) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabs = segments[0] === '(tabs)';
    const inOnboarding = inAuthGroup && segments[1] === 'onboarding';
    // Root-level screens (modals, upgrade) that authenticated users can access
    const isAppScreen = inTabs
      || segments[0] === 'processing-modal'
      || segments[0] === 'camera-modal'
      || segments[0] === 'upgrade';

    if (!isAuthenticated) {
      // Not logged in → go to welcome (unless already there)
      if (!inAuthGroup) {
        router.replace('/(auth)/welcome');
      }
    } else if (!onboardingComplete) {
      // Logged in but hasn't completed onboarding → show onboarding
      if (!inOnboarding) {
        router.replace('/(auth)/onboarding');
      }
    } else {
      // Logged in + onboarding done → go to home only if on auth pages or bare index
      if (!isAppScreen) {
        router.replace('/(tabs)/home');
      }
    }
  }, [isAuthenticated, isLoading, fontsLoaded, onboardingComplete, segments]);

  if (!fontsLoaded || isLoading || onboardingComplete === null) {
    return <View style={styles.loading} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.black },
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="camera-modal"
          options={{
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="processing-modal"
          options={{
            presentation: 'fullScreenModal',
            animation: 'fade',
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="upgrade"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.black,
  },
});
