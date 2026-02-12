import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../../components/ui/GlassCard';
import {
  colors,
  fonts,
  fontSize,
  spacing,
} from '../../lib/constants/theme';

export default function GalleryScreen() {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gallery</Text>
        <Text style={styles.headerSubtitle}>CLOAKED PHOTOS</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatCard
          value="0"
          label="Cloaked"
          icon={<FontAwesome5 name="shield-alt" size={14} color={colors.accent} />}
        />
        <StatCard
          value="0"
          label="Saved"
          icon={<Ionicons name="download-outline" size={16} color={colors.accent} />}
        />
        <StatCard
          value="—"
          label="Avg. Time"
          icon={<Ionicons name="timer-outline" size={16} color={colors.accent} />}
        />
      </View>

      {/* Empty State */}
      <View style={styles.emptyState}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="images-outline" size={48} color={colors.subtle} />
        </View>
        <Text style={styles.emptyTitle}>No cloaked photos yet</Text>
        <Text style={styles.emptySubtitle}>
          Photos you cloak will appear here.{'\n'}
          Head to the Cloak tab to get started.
        </Text>
      </View>
    </SafeAreaView>
  );
}

function StatCard({
  value,
  label,
  icon,
}: {
  value: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <GlassCard style={styles.statCard}>
      <View style={styles.statIconRow}>
        {icon}
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.xxl,
    color: colors.white,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.muted,
    letterSpacing: 2,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statIconRow: {
    marginBottom: spacing.xs,
  },
  statValue: {
    fontFamily: fonts.monoBold,
    fontSize: fontSize.xxl,
    color: colors.white,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.darkGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.lg,
    color: colors.silver,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: fontSize.sm * 1.6,
  },
});
