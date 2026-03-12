import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '../../lib/constants/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.black },
        animation: 'fade',
      }}
    />
  );
}
