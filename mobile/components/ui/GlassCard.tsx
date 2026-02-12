import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, spacing } from '../../lib/constants/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  noPadding?: boolean;
}

export function GlassCard({
  children,
  style,
  noPadding = false,
}: GlassCardProps) {
  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.02)', 'rgba(0,0,0,0)']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
        style={styles.gradient}
      >
        <View style={[styles.content, noPadding && styles.noPadding]}>
          {children}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  gradient: {
    width: '100%',
  },
  content: {
    padding: spacing.lg,
    backgroundColor: 'rgba(14,14,14,0.85)',
  },
  noPadding: {
    padding: 0,
  },
});
