import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../../components/ui/GlassCard';
import {
  colors,
  fonts,
  fontSize,
  spacing,
  borderRadius,
} from '../../lib/constants/theme';

export default function GalleryScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gallery</Text>
        <Text style={styles.headerSubtitle}>CLOAKED PHOTOS</Text>
      </View>

      {/* Stats Panel */}
      <View style={styles.statsPanelOuter}>
        <LinearGradient
          colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.02)', 'rgba(0,0,0,0)']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.3, y: 1 }}
          style={styles.statsPanelGradient}
        >
          <View style={styles.statsPanel}>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>CLOAKED</Text>
              <View style={styles.statValueRow}>
                <View style={[styles.statDot, { backgroundColor: colors.success }]} />
                <Text style={styles.statValue}>0</Text>
              </View>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statCell}>
              <Text style={styles.statLabel}>SAVED</Text>
              <View style={styles.statValueRow}>
                <View style={[styles.statDot, { backgroundColor: colors.accent }]} />
                <Text style={styles.statValue}>0</Text>
              </View>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statCell}>
              <Text style={styles.statLabel}>AVG TIME</Text>
              <View style={styles.statValueRow}>
                <View style={[styles.statDot, { backgroundColor: colors.silver }]} />
                <Text style={styles.statValue}>{'\u2014'}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Empty State */}
      <View style={styles.emptyState}>
        <View style={styles.emptyIconOuter}>
          <LinearGradient
            colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)', 'rgba(0,0,0,0)']}
            locations={[0, 0.5, 1]}
            start={{ x: 0.3, y: 0 }}
            end={{ x: 0.7, y: 1 }}
            style={styles.emptyIconGradient}
          >
            <View style={styles.emptyIconInner}>
              <Ionicons name="images-outline" size={40} color={colors.subtle} />
            </View>
          </LinearGradient>
        </View>
        <Text style={styles.emptyTitle}>No cloaked photos yet</Text>
        <Text style={styles.emptySubtitle}>
          Photos you cloak will appear here.{'\n'}
          Head to the Home tab to get started.
        </Text>
      </View>
    </SafeAreaView>
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

  // Stats Panel (matches home page)
  statsPanelOuter: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statsPanelGradient: {
    width: '100%',
  },
  statsPanel: {
    flexDirection: 'row',
    backgroundColor: 'rgba(14,14,14,0.85)',
    paddingVertical: spacing.md,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statLabel: {
    fontFamily: fonts.mono,
    fontSize: 8,
    color: colors.muted,
    letterSpacing: 1.5,
  },
  statValue: {
    fontFamily: fonts.monoBold,
    fontSize: fontSize.lg,
    color: colors.white,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: -spacing.md,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIconOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  emptyIconGradient: {
    width: '100%',
    height: '100%',
  },
  emptyIconInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(14,14,14,0.85)',
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
