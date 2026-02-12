import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { GlassCard } from '../../components/ui/GlassCard';
import { useSettingsStore } from '../../lib/store/useSettingsStore';
import { useAuthStore } from '../../lib/store/useAuthStore';
import { cloakImage, cloakVideo } from '../../lib/ml/cloaking';
import { getTierForStatus } from '../../lib/constants/subscriptions';
import type { CloakMode } from '../../lib/types';
import {
  colors,
  fonts,
  fontSize,
  spacing,
  borderRadius,
} from '../../lib/constants/theme';

const { width } = Dimensions.get('window');

type ImportState = 'idle' | 'imported' | 'processing' | 'done' | 'error';

export default function HomeScreen() {
  const router = useRouter();
  const [importState, setImportState] = useState<ImportState>('idle');
  const [importedUri, setImportedUri] = useState<string | null>(null);
  const [importedType, setImportedType] = useState<CloakMode>('photo');
  const [processingTime, setProcessingTime] = useState<number | null>(null);
  const [videoProgress, setVideoProgress] = useState(0);

  const strength = useSettingsStore((s) => s.strength);
  const user = useAuthStore((s) => s.user);
  const tier = getTierForStatus(user?.subscriptionStatus ?? 'none');

  const handleImportPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      setImportedUri(result.assets[0].uri);
      setImportedType('photo');
      setImportState('imported');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleImportVideo = async () => {
    if (!tier.limits.videoCloaking) {
      Alert.alert(
        'Pro+ Feature',
        'Video cloaking is available on the Pro+ plan. Upgrade to cloak videos.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/upgrade') },
        ]
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 1,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      setImportedUri(result.assets[0].uri);
      setImportedType('video');
      setImportState('imported');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleCloak = async () => {
    if (!importedUri) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setImportState('processing');
    setProcessingTime(null);
    setVideoProgress(0);

    try {
      if (importedType === 'video') {
        const result = await cloakVideo(importedUri, strength, (p) =>
          setVideoProgress(p)
        );
        setProcessingTime(result.processingTimeMs);
      } else {
        const result = await cloakImage(importedUri, strength);
        setProcessingTime(result.processingTimeMs);
      }
      setImportState('done');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setImportState('error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleReset = () => {
    setImportState('idle');
    setImportedUri(null);
    setProcessingTime(null);
    setVideoProgress(0);
  };

  const cloaksRemaining =
    tier.limits.monthlyCloak === -1
      ? 'Unlimited'
      : `${tier.limits.monthlyCloak}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>VOiD</Text>
            <Text style={styles.headerSubtitle}>PRIVACY ENGINE</Text>
          </View>
          <StatusBadge
            status={tier.id === 'free' ? 'free' : 'cloaked'}
            label={tier.name.toUpperCase()}
          />
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
              {/* Cloaked */}
              <View style={styles.statCell}>
                <Text style={styles.statLabel}>CLOAKED</Text>
                <View style={styles.statValueRow}>
                  <View style={[styles.statDot, { backgroundColor: colors.success }]} />
                  <Text style={styles.statValue}>0</Text>
                </View>
              </View>

              <View style={styles.statDivider} />

              {/* Remaining */}
              <View style={styles.statCell}>
                <Text style={styles.statLabel}>REMAINING</Text>
                <View style={styles.statValueRow}>
                  <View style={[styles.statDot, { backgroundColor: tier.limits.monthlyCloak === -1 ? colors.success : colors.warning }]} />
                  <Text style={[
                    styles.statValue,
                    tier.limits.monthlyCloak === -1 && styles.statValueAccent,
                  ]}>
                    {cloaksRemaining === 'Unlimited' ? '\u221E' : cloaksRemaining}
                  </Text>
                </View>
              </View>

              <View style={styles.statDivider} />

              {/* Avg Time */}
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

        {/* Import Preview / Processing Inline */}
        {importState !== 'idle' && (
          <GlassCard style={styles.importCard}>
            {/* Imported preview */}
            {importState === 'imported' && importedUri && (
              <View style={styles.importPreviewContainer}>
                <View style={styles.importPreviewImageWrap}>
                  <Image
                    source={{ uri: importedUri }}
                    style={styles.importPreviewImage}
                    contentFit="cover"
                  />
                  <View style={styles.importTypeBadge}>
                    <Ionicons
                      name={
                        importedType === 'video' ? 'videocam' : 'image'
                      }
                      size={11}
                      color={colors.white}
                    />
                    <Text style={styles.importTypeBadgeText}>
                      {importedType === 'video' ? 'VIDEO' : 'PHOTO'}
                    </Text>
                  </View>
                </View>
                <View style={styles.importActions}>
                  <TouchableOpacity
                    style={styles.cloakNowButton}
                    onPress={handleCloak}
                    activeOpacity={0.7}
                  >
                    <FontAwesome5
                      name="shield-alt"
                      size={14}
                      color={colors.black}
                    />
                    <Text style={styles.cloakNowText}>Cloak Now</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelImportButton}
                    onPress={handleReset}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="close"
                      size={16}
                      color={colors.muted}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Processing */}
            {importState === 'processing' && (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="small" color={colors.white} />
                <View style={styles.processingInfo}>
                  <Text style={styles.processingText}>CLOAKING...</Text>
                  <Text style={styles.processingHint}>
                    {importedType === 'video'
                      ? `Processing frames — ${Math.round(videoProgress * 100)}%`
                      : 'Applying adversarial perturbation'}
                  </Text>
                </View>
                {importedType === 'video' && (
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${videoProgress * 100}%` },
                      ]}
                    />
                  </View>
                )}
              </View>
            )}

            {/* Done */}
            {importState === 'done' && (
              <View style={styles.doneContainer}>
                <Ionicons
                  name="checkmark-circle"
                  size={28}
                  color={colors.success}
                />
                <View style={styles.doneInfo}>
                  <Text style={styles.doneText}>CLOAKED</Text>
                  {processingTime && (
                    <Text style={styles.doneHint}>
                      {processingTime}ms · {strength}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.newCloakButton}
                  onPress={handleReset}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="refresh"
                    size={14}
                    color={colors.silver}
                  />
                  <Text style={styles.newCloakText}>NEW</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Error */}
            {importState === 'error' && (
              <View style={styles.doneContainer}>
                <Ionicons
                  name="close-circle"
                  size={28}
                  color={colors.error}
                />
                <View style={styles.doneInfo}>
                  <Text style={[styles.doneText, { color: colors.error }]}>
                    FAILED
                  </Text>
                  <Text style={styles.doneHint}>No face detected</Text>
                </View>
                <TouchableOpacity
                  style={styles.newCloakButton}
                  onPress={handleReset}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="refresh"
                    size={14}
                    color={colors.silver}
                  />
                  <Text style={styles.newCloakText}>RETRY</Text>
                </TouchableOpacity>
              </View>
            )}
          </GlassCard>
        )}

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <FontAwesome5 name="bolt" size={10} color={colors.muted} />
          <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push('/camera-modal')}
        >
          <GlassCard style={styles.actionCard}>
            <View style={styles.actionRow}>
              <View style={styles.actionIconWrap}>
                <Ionicons name="camera" size={22} color={colors.white} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionTitle}>Open Camera</Text>
                <Text style={styles.actionSubtitle}>
                  Live capture with real-time controls
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.muted}
              />
            </View>
          </GlassCard>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.7} onPress={handleImportPhoto}>
          <GlassCard style={styles.actionCard}>
            <View style={styles.actionRow}>
              <View
                style={[
                  styles.actionIconWrap,
                  { backgroundColor: 'rgba(255, 255, 255, 0.06)' },
                ]}
              >
                <Ionicons name="image" size={22} color={colors.silver} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionTitle}>Import Photo</Text>
                <Text style={styles.actionSubtitle}>
                  Select from your photo library
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.muted}
              />
            </View>
          </GlassCard>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.7} onPress={handleImportVideo}>
          <GlassCard style={styles.actionCard}>
            <View style={styles.actionRow}>
              <View
                style={[
                  styles.actionIconWrap,
                  { backgroundColor: 'rgba(255, 255, 255, 0.06)' },
                ]}
              >
                <Ionicons name="videocam" size={22} color={colors.silver} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionTitle}>Import Video</Text>
                <Text style={styles.actionSubtitle}>
                  {tier.limits.videoCloaking
                    ? 'Select a video to cloak'
                    : 'Pro+ feature — Upgrade to unlock'}
                </Text>
              </View>
              {!tier.limits.videoCloaking ? (
                <View style={styles.proPlusBadge}>
                  <FontAwesome5
                    name="lock"
                    size={8}
                    color={colors.error}
                  />
                  <Text style={styles.proPlusText}>PRO+</Text>
                </View>
              ) : (
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.muted}
                />
              )}
            </View>
          </GlassCard>
        </TouchableOpacity>

        {/* Strength Indicator */}
        <View style={styles.sectionHeader}>
          <FontAwesome5 name="sliders-h" size={10} color={colors.muted} />
          <Text style={styles.sectionTitle}>CLOAK STRENGTH</Text>
        </View>

        <GlassCard style={styles.strengthCard}>
          <View style={styles.strengthRow}>
            <Text style={styles.strengthLabel}>ACTIVE</Text>
            <Text
              style={[
                styles.strengthValue,
                {
                  color:
                    strength === 'subtle'
                      ? colors.strengthLow
                      : strength === 'standard'
                      ? colors.strengthMid
                      : colors.strengthHigh,
                },
              ]}
            >
              {strength.toUpperCase()}
            </Text>
          </View>
          <View style={styles.strengthBar}>
            <View
              style={[
                styles.strengthFill,
                {
                  width:
                    strength === 'subtle'
                      ? '33%'
                      : strength === 'standard'
                      ? '66%'
                      : '100%',
                  backgroundColor:
                    strength === 'subtle'
                      ? colors.strengthLow
                      : strength === 'standard'
                      ? colors.strengthMid
                      : colors.strengthHigh,
                },
              ]}
            />
          </View>
        </GlassCard>

        {/* Recent Activity */}
        <View style={styles.sectionHeader}>
          <Ionicons name="time-outline" size={12} color={colors.muted} />
          <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
        </View>

        <GlassCard style={styles.emptyActivity}>
          <Ionicons name="pulse-outline" size={32} color={colors.subtle} />
          <Text style={styles.emptyActivityText}>No recent activity</Text>
          <Text style={styles.emptyActivityHint}>
            Your cloaking history will appear here
          </Text>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
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

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    fontFamily: fonts.monoBold,
    fontSize: fontSize.xxl,
    color: colors.white,
    letterSpacing: 4,
  },
  headerSubtitle: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.muted,
    letterSpacing: 2,
    marginTop: 2,
  },

  // Stats Panel
  statsPanelOuter: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
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
  statValueAccent: {
    color: colors.success,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: -spacing.md,
  },

  // Section Headers
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

  // Import Preview Card
  importCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  importPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  importPreviewImageWrap: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.darkGray,
  },
  importPreviewImage: {
    width: '100%',
    height: '100%',
  },
  importTypeBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  importTypeBadgeText: {
    fontFamily: fonts.mono,
    fontSize: 8,
    color: colors.white,
    letterSpacing: 1,
  },
  importActions: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cloakNowButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md - 2,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
  },
  cloakNowText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.sm,
    color: colors.black,
    letterSpacing: 1,
  },
  cancelImportButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Processing
  processingContainer: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  processingInfo: {
    alignItems: 'center',
    gap: 2,
  },
  processingText: {
    fontFamily: fonts.monoBold,
    fontSize: fontSize.sm,
    color: colors.white,
    letterSpacing: 3,
  },
  processingHint: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.silver,
    letterSpacing: 1,
  },
  progressBar: {
    width: '100%',
    height: 3,
    backgroundColor: colors.subtle,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.white,
    borderRadius: 2,
  },

  // Done / Error
  doneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  doneInfo: {
    flex: 1,
    gap: 2,
  },
  doneText: {
    fontFamily: fonts.monoBold,
    fontSize: fontSize.md,
    color: colors.success,
    letterSpacing: 3,
  },
  doneHint: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.silver,
    letterSpacing: 1,
  },
  newCloakButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
  },
  newCloakText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.silver,
    letterSpacing: 2,
  },

  // Action Cards
  actionCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  actionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextWrap: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.md,
    color: colors.white,
  },
  actionSubtitle: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    color: colors.muted,
  },
  proPlusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.errorGlow,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  proPlusText: {
    fontFamily: fonts.monoBold,
    fontSize: 9,
    color: colors.error,
    letterSpacing: 1,
  },

  // Strength
  strengthCard: {
    marginHorizontal: spacing.lg,
  },
  strengthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  strengthLabel: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.muted,
    letterSpacing: 2,
  },
  strengthValue: {
    fontFamily: fonts.monoBold,
    fontSize: fontSize.xs,
    letterSpacing: 2,
  },
  strengthBar: {
    height: 3,
    backgroundColor: colors.subtle,
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Recent Activity
  emptyActivity: {
    marginHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  emptyActivityText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.md,
    color: colors.silver,
  },
  emptyActivityHint: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    color: colors.muted,
    textAlign: 'center',
  },
});
