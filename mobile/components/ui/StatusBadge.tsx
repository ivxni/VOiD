import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { colors, fonts, fontSize, borderRadius, spacing } from '../../lib/constants/theme';

interface StatusBadgeProps {
  status: 'cloaked' | 'processing' | 'error' | 'free';
  label?: string;
}

const statusConfig = {
  cloaked: {
    color: colors.success,
    bg: colors.successGlow,
    defaultLabel: 'CLOAKED',
    icon: 'check-circle',
  },
  processing: {
    color: colors.purple,
    bg: colors.purpleGlow,
    defaultLabel: 'PROCESSING',
    icon: 'spinner',
  },
  error: {
    color: colors.error,
    bg: colors.errorGlow,
    defaultLabel: 'ERROR',
    icon: 'exclamation-circle',
  },
  free: {
    color: colors.muted,
    bg: 'rgba(107, 107, 107, 0.15)',
    defaultLabel: 'FREE TIER',
    icon: 'user',
  },
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <FontAwesome5 name={config.icon} size={8} color={config.color} />
      <Text style={[styles.label, { color: config.color }]}>
        {label ?? config.defaultLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingVertical: spacing.xs + 1,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
