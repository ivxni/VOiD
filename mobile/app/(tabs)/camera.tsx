import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { GlassCard } from '../../components/ui/GlassCard';
import { useSettingsStore } from '../../lib/store/useSettingsStore';
import { useAuthStore } from '../../lib/store/useAuthStore';
import { cloakImage } from '../../lib/ml/cloaking';
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
const VIEWFINDER_SIZE = width - spacing.lg * 2;

type CameraState = 'idle' | 'imported' | 'processing' | 'done' | 'error';

export default function CameraScreen() {
  const router = useRouter();
  const [state, setCameraState] = useState<CameraState>('idle');
  const [processingTime, setProcessingTime] = useState<number | null>(null);
  const [importedUri, setImportedUri] = useState<string | null>(null);
  const [importedType, setImportedType] = useState<CloakMode>('photo');
  const strength = useSettingsStore((s) => s.strength);
  const user = useAuthStore((s) => s.user);
  const tier = getTierForStatus(user?.subscriptionStatus ?? 'none');

  const handleImport = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 1,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const isVideo = asset.type === 'video';

      // Check if video cloaking is allowed for this tier
      if (isVideo && !tier.limits.videoCloaking) {
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

      setImportedUri(asset.uri);
      setImportedType(isVideo ? 'video' : 'photo');
      setCameraState('imported');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleCapture = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setCameraState('processing');
    setProcessingTime(null);

    try {
      const uri = importedUri ?? 'camera-capture-uri';
      const result = await cloakImage(uri, strength);
      setProcessingTime(result.processingTimeMs);
      setCameraState('done');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setCameraState('error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleReset = () => {
    setCameraState('idle');
    setProcessingTime(null);
    setImportedUri(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>VOiD</Text>
          <Text style={styles.headerSubtitle}>Cloak Engine</Text>
        </View>
        <StatusBadge
          status={tier.id === 'free' ? 'free' : 'cloaked'}
          label={tier.name.toUpperCase()}
        />
      </View>

      {/* Viewfinder */}
      <View style={styles.viewfinderContainer}>
        <View style={styles.viewfinder}>
          {/* Corner markers */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />

          {/* Idle state */}
          {state === 'idle' && (
            <View style={styles.viewfinderCenter}>
              <FontAwesome5 name="crosshairs" size={48} color={colors.subtle} />
              <Text style={styles.viewfinderText}>
                Capture or import a photo
              </Text>
              <Text style={styles.viewfinderHint}>
                Tap the gallery icon to import
              </Text>
            </View>
          )}

          {/* Imported preview */}
          {state === 'imported' && importedUri && (
            <View style={styles.importedPreview}>
              <Image
                source={{ uri: importedUri }}
                style={styles.previewImage}
                contentFit="cover"
              />
              {/* Overlay badge */}
              <View style={styles.importBadge}>
                <Ionicons
                  name={importedType === 'video' ? 'videocam' : 'image'}
                  size={12}
                  color={colors.white}
                />
                <Text style={styles.importBadgeText}>
                  {importedType === 'video' ? 'VIDEO' : 'PHOTO'} IMPORTED
                </Text>
              </View>
            </View>
          )}

          {/* Processing */}
          {state === 'processing' && (
            <View style={styles.viewfinderCenter}>
              {importedUri && (
                <Image
                  source={{ uri: importedUri }}
                  style={[styles.previewImage, styles.previewDimmed]}
                  contentFit="cover"
                />
              )}
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="large" color={colors.white} />
                <Text style={styles.processingText}>CLOAKING...</Text>
                <Text style={styles.processingHint}>
                  Applying adversarial perturbation
                </Text>
              </View>
            </View>
          )}

          {/* Done */}
          {state === 'done' && (
            <View style={styles.viewfinderCenter}>
              {importedUri && (
                <Image
                  source={{ uri: importedUri }}
                  style={styles.previewImage}
                  contentFit="cover"
                />
              )}
              <View style={styles.doneOverlay}>
                <Ionicons name="checkmark-circle" size={56} color={colors.success} />
                <Text style={styles.successText}>CLOAKED</Text>
                {processingTime && (
                  <Text style={styles.timeText}>
                    {processingTime}ms · {strength}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Error */}
          {state === 'error' && (
            <View style={styles.viewfinderCenter}>
              <Ionicons name="close-circle" size={56} color={colors.error} />
              <Text style={styles.errorText}>FAILED</Text>
              <Text style={styles.errorHint}>No face detected</Text>
            </View>
          )}
        </View>
      </View>

      {/* Strength Indicator */}
      <GlassCard style={styles.strengthCard}>
        <View style={styles.strengthRow}>
          <View style={styles.strengthLabelRow}>
            <FontAwesome5 name="sliders-h" size={12} color={colors.muted} />
            <Text style={styles.strengthLabel}>STRENGTH</Text>
          </View>
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

      {/* Action Buttons */}
      <View style={styles.captureSection}>
        {state === 'done' || state === 'error' ? (
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleReset}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={16} color={colors.silver} />
            <Text style={styles.resetText}>NEW CAPTURE</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.actionRow}>
            {/* Import from Gallery */}
            <TouchableOpacity
              style={styles.sideButton}
              onPress={handleImport}
              activeOpacity={0.7}
              disabled={state === 'processing'}
            >
              <Ionicons name="images-outline" size={24} color={colors.silver} />
              <Text style={styles.sideButtonLabel}>Import</Text>
            </TouchableOpacity>

            {/* Capture / Cloak Button */}
            <TouchableOpacity
              style={[
                styles.captureButton,
                state === 'processing' && styles.captureButtonDisabled,
              ]}
              onPress={handleCapture}
              activeOpacity={0.8}
              disabled={state === 'processing'}
            >
              <View style={styles.captureInner}>
                {state === 'processing' ? (
                  <ActivityIndicator size="small" color={colors.black} />
                ) : state === 'imported' ? (
                  <FontAwesome5 name="shield-alt" size={22} color={colors.black} />
                ) : (
                  <FontAwesome5 name="shield-alt" size={22} color={colors.black} style={{ opacity: 0.2 }} />
                )}
              </View>
            </TouchableOpacity>

            {/* Placeholder for symmetry */}
            <View style={styles.sideButton}>
              <Ionicons name="flash-outline" size={24} color={colors.muted} />
              <Text style={[styles.sideButtonLabel, { color: colors.muted }]}>Flash</Text>
            </View>
          </View>
        )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontFamily: fonts.monoBold,
    fontSize: fontSize.xl,
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
  viewfinderContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  viewfinder: {
    width: VIEWFINDER_SIZE,
    height: VIEWFINDER_SIZE,
    backgroundColor: colors.darkGray,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: colors.white,
    zIndex: 10,
  },
  cornerTL: { top: 12, left: 12, borderTopWidth: 2, borderLeftWidth: 2 },
  cornerTR: { top: 12, right: 12, borderTopWidth: 2, borderRightWidth: 2 },
  cornerBL: { bottom: 12, left: 12, borderBottomWidth: 2, borderLeftWidth: 2 },
  cornerBR: { bottom: 12, right: 12, borderBottomWidth: 2, borderRightWidth: 2 },
  viewfinderCenter: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  viewfinderText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.md,
    color: colors.muted,
    marginTop: spacing.sm,
  },
  viewfinderHint: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.subtle,
    letterSpacing: 1,
  },

  // Imported preview
  importedPreview: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  previewImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  previewDimmed: {
    opacity: 0.3,
  },
  importBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    marginBottom: spacing.lg,
    zIndex: 10,
  },
  importBadgeText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.white,
    letterSpacing: 1.5,
  },

  // Processing overlay
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    gap: spacing.sm,
  },
  processingText: {
    fontFamily: fonts.monoBold,
    fontSize: fontSize.lg,
    color: colors.white,
    letterSpacing: 3,
    marginTop: spacing.md,
  },
  processingHint: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.silver,
    letterSpacing: 1,
  },

  // Done overlay
  doneOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    gap: spacing.xs,
  },
  successText: {
    fontFamily: fonts.monoBold,
    fontSize: fontSize.xl,
    color: colors.success,
    letterSpacing: 4,
    marginTop: spacing.xs,
  },
  timeText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    color: colors.silver,
    letterSpacing: 1,
    marginTop: spacing.xs,
  },
  errorText: {
    fontFamily: fonts.monoBold,
    fontSize: fontSize.xl,
    color: colors.error,
    letterSpacing: 4,
    marginTop: spacing.xs,
  },
  errorHint: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.muted,
    letterSpacing: 1,
  },

  // Strength
  strengthCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  strengthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  strengthLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
    color: colors.white,
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

  // Action Buttons
  captureSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl + spacing.md,
  },
  sideButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    gap: spacing.xs,
  },
  sideButtonLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.silver,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.silver,
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  captureInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
  },
  resetText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    color: colors.silver,
    letterSpacing: 2,
  },
});
