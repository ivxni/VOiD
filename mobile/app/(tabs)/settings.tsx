import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../../components/ui/GlassCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAuthStore } from '../../lib/store/useAuthStore';
import { useSettingsStore } from '../../lib/store/useSettingsStore';
import { getModelInfo } from '../../lib/ml/cloaking';
import { getTierForStatus } from '../../lib/constants/subscriptions';
import type { CloakStrength } from '../../lib/types';
import {
  colors,
  fonts,
  fontSize,
  spacing,
  borderRadius,
} from '../../lib/constants/theme';

const STRENGTH_OPTIONS: { key: CloakStrength; label: string; desc: string }[] = [
  { key: 'subtle', label: 'Subtle', desc: 'Light protection, fastest processing' },
  { key: 'standard', label: 'Standard', desc: 'Balanced protection and quality' },
  { key: 'maximum', label: 'Maximum', desc: 'Strongest protection, slower processing' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const {
    strength,
    keepOriginal,
    autoSave,
    setStrength,
    setKeepOriginal,
    setAutoSave,
  } = useSettingsStore();
  const modelInfo = getModelInfo();
  const currentTier = getTierForStatus(user?.subscriptionStatus ?? 'none');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>CONFIGURATION</Text>
        </View>

        {/* Account + Upgrade */}
        <SectionHeader icon="user-circle" label="ACCOUNT" />
        <GlassCard style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Plan</Text>
            <StatusBadge
              status={currentTier.id === 'free' ? 'free' : 'cloaked'}
              label={currentTier.name.toUpperCase()}
            />
          </View>
          {user?.email && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Email</Text>
              <Text style={styles.rowValue}>{user.email}</Text>
            </View>
          )}

          {/* Upgrade Banner */}
          {currentTier.id === 'free' && (
            <TouchableOpacity
              style={styles.upgradeBanner}
              onPress={() => router.push('/upgrade')}
              activeOpacity={0.7}
            >
              <View style={styles.upgradeBannerLeft}>
                <View style={styles.upgradeBannerIcon}>
                  <FontAwesome5 name="shield-alt" size={16} color={colors.white} />
                </View>
                <View>
                  <Text style={styles.upgradeBannerTitle}>Upgrade to Pro</Text>
                  <Text style={styles.upgradeBannerDesc}>Unlimited cloaks & more</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </TouchableOpacity>
          )}

          {currentTier.id === 'pro' && (
            <TouchableOpacity
              style={styles.upgradeBanner}
              onPress={() => router.push('/upgrade')}
              activeOpacity={0.7}
            >
              <View style={styles.upgradeBannerLeft}>
                <View style={styles.upgradeBannerIcon}>
                  <FontAwesome5 name="crown" size={14} color={colors.white} />
                </View>
                <View>
                  <Text style={styles.upgradeBannerTitle}>Upgrade to Pro+</Text>
                  <Text style={styles.upgradeBannerDesc}>Batch processing & RAW export</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </TouchableOpacity>
          )}
        </GlassCard>

        {/* Cloak Settings */}
        <SectionHeader icon="sliders-h" label="CLOAK ENGINE" />
        <GlassCard style={styles.card}>
          <Text style={styles.settingLabel}>Perturbation Strength</Text>
          <View style={styles.strengthOptions}>
            {STRENGTH_OPTIONS.map((opt) => {
              const isLocked = !currentTier.limits.strengthLevels.includes(opt.key);
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.strengthOption,
                    strength === opt.key && !isLocked && styles.strengthOptionActive,
                    isLocked && styles.strengthOptionLocked,
                  ]}
                  onPress={() => {
                    if (isLocked) {
                      router.push('/upgrade');
                    } else {
                      setStrength(opt.key);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.strengthOptionHeader}>
                    <Text
                      style={[
                        styles.strengthOptionLabel,
                        strength === opt.key && !isLocked && styles.strengthOptionLabelActive,
                        isLocked && styles.strengthOptionLabelLocked,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {isLocked && (
                      <View style={styles.lockBadge}>
                        <FontAwesome5 name="lock" size={8} color={colors.error} />
                        <Text style={styles.lockText}>PRO</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.strengthOptionDesc}>{opt.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </GlassCard>

        {/* Preferences */}
        <SectionHeader icon="cog" label="PREFERENCES" />
        <GlassCard style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <View style={styles.switchLabelRow}>
                <Ionicons name="save-outline" size={16} color={colors.silver} />
                <Text style={styles.rowLabel}>Auto-save to gallery</Text>
              </View>
              <Text style={styles.rowHint}>
                Automatically save cloaked photos
              </Text>
            </View>
            <Switch
              value={autoSave}
              onValueChange={setAutoSave}
              trackColor={{ false: colors.subtle, true: colors.success }}
              thumbColor={colors.white}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <View style={styles.switchLabelRow}>
                <Ionicons name="copy-outline" size={16} color={colors.silver} />
                <Text style={styles.rowLabel}>Keep original</Text>
              </View>
              <Text style={styles.rowHint}>
                Save both original and cloaked version
              </Text>
            </View>
            <Switch
              value={keepOriginal}
              onValueChange={setKeepOriginal}
              trackColor={{ false: colors.subtle, true: colors.success }}
              thumbColor={colors.white}
            />
          </View>
        </GlassCard>

        {/* System Info */}
        <SectionHeader icon="microchip" label="SYSTEM" />
        <GlassCard style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Model</Text>
            <Text style={styles.rowValueMono}>{modelInfo.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.rowValueMono}>{modelInfo.version}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Engine</Text>
            <Text style={styles.rowValueMono}>{modelInfo.engineType}</Text>
          </View>
        </GlassCard>

        {/* Sign Out */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={logout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          VOiD v0.1.0 — Your face. Your rules.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.sectionHeader}>
      <FontAwesome5 name={icon} size={10} color={colors.muted} />
      <Text style={styles.sectionTitle}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.muted,
    letterSpacing: 2,
  },
  card: {
    marginHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  rowLabel: {
    fontFamily: fonts.sans,
    fontSize: fontSize.md,
    color: colors.silver,
  },
  rowValue: {
    fontFamily: fonts.sans,
    fontSize: fontSize.md,
    color: colors.muted,
  },
  rowValueMono: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    color: colors.muted,
  },
  rowHint: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    color: colors.muted,
    marginTop: 2,
    marginLeft: spacing.lg + 2,
  },

  // Upgrade Banner
  upgradeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.accentGlow,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  upgradeBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  upgradeBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeBannerTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.md,
    color: colors.white,
  },
  upgradeBannerDesc: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    color: colors.muted,
    marginTop: 1,
  },

  // Strength
  settingLabel: {
    fontFamily: fonts.sans,
    fontSize: fontSize.md,
    color: colors.silver,
    marginBottom: spacing.md,
  },
  strengthOptions: {
    gap: spacing.sm,
  },
  strengthOption: {
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.darkGray,
  },
  strengthOptionActive: {
    borderColor: colors.success,
    backgroundColor: colors.successGlow,
  },
  strengthOptionLocked: {
    opacity: 0.5,
  },
  strengthOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  strengthOptionLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.md,
    color: colors.silver,
    marginBottom: 2,
  },
  strengthOptionLabelActive: {
    color: colors.white,
  },
  strengthOptionLabelLocked: {
    color: colors.muted,
  },
  strengthOptionDesc: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    color: colors.muted,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.errorGlow,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  lockText: {
    fontFamily: fonts.monoBold,
    fontSize: 9,
    color: colors.error,
    letterSpacing: 1,
  },

  // Switches
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  switchInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  switchLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },

  // Sign Out
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  signOutText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.md,
    color: colors.error,
  },
  footer: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.subtle,
    textAlign: 'center',
    marginTop: spacing.xl,
    letterSpacing: 1,
  },
});
