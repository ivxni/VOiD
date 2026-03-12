import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useSettingsStore } from '../lib/store/useSettingsStore';
import { cloakImageRemote } from '../lib/api/cloakService';
import {
  colors,
  fonts,
  fontSize,
  spacing,
  borderRadius,
} from '../lib/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type AspectRatio = '4:3' | '16:9' | '1:1';
type CameraModalState = 'camera' | 'preview' | 'processing' | 'done' | 'error';

const ASPECT_RATIOS: { key: AspectRatio; label: string }[] = [
  { key: '4:3', label: '4:3' },
  { key: '16:9', label: '16:9' },
  { key: '1:1', label: '1:1' },
];

function getViewfinderDimensions(ratio: AspectRatio) {
  const maxWidth = SCREEN_WIDTH;
  switch (ratio) {
    case '4:3':
      return { width: maxWidth, height: maxWidth * (4 / 3) };
    case '16:9':
      return { width: maxWidth, height: maxWidth * (16 / 9) };
    case '1:1':
      return { width: maxWidth, height: maxWidth };
  }
}

export default function CameraModal() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [flash, setFlash] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('4:3');
  const [state, setState] = useState<CameraModalState>('camera');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [processingTime, setProcessingTime] = useState<number | null>(null);

  const strength = useSettingsStore((s) => s.strength);
  const viewfinderSize = getViewfinderDimensions(aspectRatio);

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        skipProcessing: false,
      });
      if (photo?.uri) {
        setCapturedUri(photo.uri);
        setState('preview');
      }
    } catch {
      // Camera error — silently ignore
    }
  };

  const handleCloak = async () => {
    if (!capturedUri) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setState('processing');
    setProcessingTime(null);

    try {
      const result = await cloakImageRemote(capturedUri, strength);
      setProcessingTime(result.processingTimeMs);
      setState('done');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setState('error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleRetake = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCapturedUri(null);
    setProcessingTime(null);
    setState('camera');
  };

  const handleDone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  // Permission not granted yet
  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color={colors.white} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <View style={styles.permissionContent}>
          <Ionicons name="camera-outline" size={56} color={colors.muted} />
          <Text style={styles.permissionTitle}>Camera Access</Text>
          <Text style={styles.permissionText}>
            VOiD needs access to your camera to capture photos for cloaking.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              requestPermission();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.permissionButtonText}>Allow Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.permissionBackButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.permissionBackText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.topBarButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={26} color={colors.white} />
          </TouchableOpacity>

          {state === 'camera' && (
            <View style={styles.topBarCenter}>
              <TouchableOpacity
                style={styles.topBarButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setFlash((f) => !f);
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={flash ? 'flash' : 'flash-off'}
                  size={22}
                  color={flash ? colors.warning : colors.white}
                />
              </TouchableOpacity>
            </View>
          )}

          {state === 'camera' && (
            <TouchableOpacity
              style={styles.topBarButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setFacing((f) => (f === 'back' ? 'front' : 'back'));
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="camera-reverse-outline"
                size={24}
                color={colors.white}
              />
            </TouchableOpacity>
          )}

          {state !== 'camera' && <View style={styles.topBarButton} />}
        </View>
      </SafeAreaView>

      {/* Aspect Ratio Selector */}
      {state === 'camera' && (
        <View style={styles.aspectRatioRow}>
          {ASPECT_RATIOS.map((r) => (
            <TouchableOpacity
              key={r.key}
              style={[
                styles.aspectRatioPill,
                aspectRatio === r.key && styles.aspectRatioPillActive,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setAspectRatio(r.key);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.aspectRatioText,
                  aspectRatio === r.key && styles.aspectRatioTextActive,
                ]}
              >
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Camera / Preview Area */}
      <View style={styles.viewfinderWrapper}>
        {state === 'camera' && (
          <CameraView
            ref={cameraRef}
            style={[
              styles.camera,
              {
                width: viewfinderSize.width,
                height: Math.min(
                  viewfinderSize.height,
                  SCREEN_HEIGHT * 0.65
                ),
              },
            ]}
            facing={facing}
            flash={flash ? 'on' : 'off'}
          />
        )}

        {(state === 'preview' ||
          state === 'processing' ||
          state === 'done' ||
          state === 'error') &&
          capturedUri && (
            <View
              style={[
                styles.previewWrap,
                {
                  width: viewfinderSize.width,
                  height: Math.min(
                    viewfinderSize.height,
                    SCREEN_HEIGHT * 0.65
                  ),
                },
              ]}
            >
              <Image
                source={{ uri: capturedUri }}
                style={styles.previewImage}
                contentFit="cover"
              />

              {/* Processing overlay */}
              {state === 'processing' && (
                <View style={styles.overlay}>
                  <ActivityIndicator size="large" color={colors.white} />
                  <Text style={styles.overlayTitle}>CLOAKING...</Text>
                  <Text style={styles.overlayHint}>
                    Applying adversarial perturbation
                  </Text>
                </View>
              )}

              {/* Done overlay */}
              {state === 'done' && (
                <View style={styles.overlay}>
                  <Ionicons
                    name="checkmark-circle"
                    size={56}
                    color={colors.success}
                  />
                  <Text style={[styles.overlayTitle, { color: colors.success }]}>
                    CLOAKED
                  </Text>
                  {processingTime && (
                    <Text style={styles.overlayHint}>
                      {processingTime}ms · {strength}
                    </Text>
                  )}
                </View>
              )}

              {/* Error overlay */}
              {state === 'error' && (
                <View style={styles.overlay}>
                  <Ionicons
                    name="close-circle"
                    size={56}
                    color={colors.error}
                  />
                  <Text style={[styles.overlayTitle, { color: colors.error }]}>
                    FAILED
                  </Text>
                  <Text style={styles.overlayHint}>No face detected</Text>
                </View>
              )}
            </View>
          )}
      </View>

      {/* Bottom Controls */}
      <SafeAreaView style={styles.bottomBar} edges={['bottom']}>
        {state === 'camera' && (
          <View style={styles.captureRow}>
            <View style={styles.captureRowSide} />
            <TouchableOpacity
              style={styles.captureButton}
              onPress={handleCapture}
              activeOpacity={0.8}
            >
              <View style={styles.captureInner} />
            </TouchableOpacity>
            <View style={styles.captureRowSide} />
          </View>
        )}

        {state === 'preview' && (
          <View style={styles.previewActions}>
            <TouchableOpacity
              style={styles.previewSecondaryButton}
              onPress={handleRetake}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={18} color={colors.silver} />
              <Text style={styles.previewSecondaryText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cloakButton}
              onPress={handleCloak}
              activeOpacity={0.7}
            >
              <FontAwesome5 name="shield-alt" size={16} color={colors.black} />
              <Text style={styles.cloakButtonText}>Cloak Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {state === 'processing' && (
          <View style={styles.processingBottomRow}>
            <ActivityIndicator size="small" color={colors.white} />
            <Text style={styles.processingBottomText}>Processing...</Text>
          </View>
        )}

        {state === 'done' && (
          <View style={styles.previewActions}>
            <TouchableOpacity
              style={styles.previewSecondaryButton}
              onPress={handleRetake}
              activeOpacity={0.7}
            >
              <Ionicons name="camera" size={18} color={colors.silver} />
              <Text style={styles.previewSecondaryText}>New Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cloakButton}
              onPress={handleDone}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark" size={18} color={colors.black} />
              <Text style={styles.cloakButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}

        {state === 'error' && (
          <View style={styles.previewActions}>
            <TouchableOpacity
              style={styles.previewSecondaryButton}
              onPress={handleRetake}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={18} color={colors.silver} />
              <Text style={styles.previewSecondaryText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cloakButton, { backgroundColor: colors.silver }]}
              onPress={handleDone}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color={colors.black} />
              <Text style={styles.cloakButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  safeArea: {
    zIndex: 10,
  },

  // Top Bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  topBarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  // Aspect Ratio
  aspectRatioRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    zIndex: 10,
  },
  aspectRatioPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  aspectRatioPillActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  aspectRatioText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.muted,
    letterSpacing: 1,
  },
  aspectRatioTextActive: {
    color: colors.white,
  },

  // Viewfinder
  viewfinderWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  camera: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  previewWrap: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  previewImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },

  // Overlays
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    gap: spacing.sm,
  },
  overlayTitle: {
    fontFamily: fonts.monoBold,
    fontSize: fontSize.xl,
    color: colors.white,
    letterSpacing: 4,
    marginTop: spacing.sm,
  },
  overlayHint: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.silver,
    letterSpacing: 1,
  },

  // Bottom Bar
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },

  // Camera Capture
  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
  },
  captureRowSide: {
    width: 56,
  },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.white,
  },

  // Preview Actions
  previewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  previewSecondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  previewSecondaryText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.md,
    color: colors.silver,
  },
  cloakButton: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
  },
  cloakButtonText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.md,
    color: colors.black,
  },

  // Processing bottom row
  processingBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  processingBottomText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    color: colors.silver,
    letterSpacing: 1,
  },

  // Permission screens
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  permissionTitle: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.xl,
    color: colors.white,
    marginTop: spacing.md,
  },
  permissionText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.md,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: fontSize.md * 1.5,
  },
  permissionButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    marginTop: spacing.md,
  },
  permissionButtonText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.md,
    color: colors.black,
  },
  permissionBackButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
  },
  permissionBackText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.md,
    color: colors.muted,
  },
});
