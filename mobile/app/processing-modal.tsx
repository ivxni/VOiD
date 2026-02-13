/**
 * VOiD — Full-Screen Processing Modal
 *
 * Premium cloaking experience:
 *   - Image in a contained card with correct aspect ratio
 *   - Apple Watch–inspired layered particle orb
 *   - Seamless done transition with results immediately visible
 *   - CLOAKED / ORIGINAL / AI VIEW comparison
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Easing,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { cloakImageRemote } from '../lib/api/cloakService';
import type { CloakPhase, CloakProgress } from '../lib/api/cloakService';
import { useCloakStore } from '../lib/store/useCloakStore';
import {
  colors,
  fonts,
  fontSize,
  spacing,
  borderRadius,
} from '../lib/constants/theme';

const { width: SW, height: SH } = Dimensions.get('window');
const IMAGE_W = SW - spacing.lg * 2;
const IMAGE_H = SH * 0.44;

// ─── Orb Config ──────────────────────────────────────────────────────────────
const ORB = 160;
const ORB_C = ORB / 2;

type ModalPhase = 'processing' | 'done' | 'error';

export default function ProcessingModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ imageUri: string; strength: string }>();
  const imageUri = params.imageUri || '';
  const strength = (params.strength || 'standard') as 'subtle' | 'standard' | 'maximum';

  const addImage = useCloakStore((s) => s.addImage);
  const markSaved = useCloakStore((s) => s.markSaved);

  const [modalPhase, setModalPhase] = useState<ModalPhase>('processing');
  const [cloakPhase, setCloakPhase] = useState<CloakPhase>('preparing');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Initializing...');
  const [cloakedUri, setCloakedUri] = useState<string | null>(null);
  const [analysisUri, setAnalysisUri] = useState<string | null>(null);
  const [resultMeta, setResultMeta] = useState<{
    facesDetected: number;
    facesCloaked: number;
    processingTimeMs: number;
    width: number;
    height: number;
  } | null>(null);
  const [cloakedId, setCloakedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cloaked' | 'original' | 'ai'>('cloaked');
  const [savedToDevice, setSavedToDevice] = useState(false);

  // ── Animated values ──
  const orbEnter = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // ── Start on mount ──
  useEffect(() => {
    if (!imageUri) return;

    // Orb entrance
    Animated.spring(orbEnter, {
      toValue: 1,
      friction: 5,
      tension: 50,
      useNativeDriver: true,
    }).start();

    // Ring rotations — different speeds & directions
    const r1 = Animated.loop(
      Animated.timing(ring1, {
        toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true,
      }),
    );
    const r2 = Animated.loop(
      Animated.timing(ring2, {
        toValue: 1, duration: 10000, easing: Easing.linear, useNativeDriver: true,
      }),
    );
    const r3 = Animated.loop(
      Animated.timing(ring3, {
        toValue: 1, duration: 14000, easing: Easing.linear, useNativeDriver: true,
      }),
    );

    // Glow pulse
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
      ]),
    );

    // Breathe (subtle scale)
    const br = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
      ]),
    );

    r1.start(); r2.start(); r3.start(); glow.start(); br.start();
    startCloaking();

    return () => { r1.stop(); r2.stop(); r3.stop(); glow.stop(); br.stop(); };
  }, [imageUri]);

  // Animate progress bar
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const startCloaking = async () => {
    try {
      const result = await cloakImageRemote(imageUri, strength, (p: CloakProgress) => {
        setCloakPhase(p.phase);
        setProgress(p.progress);
        setMessage(p.message);
        if (p.phase === 'processing') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      });

      setCloakedUri(result.localUri);
      setAnalysisUri(result.analysisUri);
      setResultMeta({
        facesDetected: result.facesDetected,
        facesCloaked: result.facesCloaked,
        processingTimeMs: result.processingTimeMs,
        width: result.width,
        height: result.height,
      });

      const store = useCloakStore.getState();
      store.addImage({
        originalUri: imageUri,
        cloakedUri: result.localUri,
        analysisUri: result.analysisUri,
        facesDetected: result.facesDetected,
        facesCloaked: result.facesCloaked,
        strength,
        processingTimeMs: result.processingTimeMs,
        width: result.width,
        height: result.height,
      });
      setCloakedId(useCloakStore.getState().images[0]?.id || null);

      // ⬇ Transition to done — immediate, no opacity animation
      setModalPhase('done');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setModalPhase('error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleSaveToDevice = async () => {
    if (!cloakedUri) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant gallery access.');
      return;
    }
    try {
      await MediaLibrary.saveToLibraryAsync(cloakedUri);
      setSavedToDevice(true);
      if (cloakedId) markSaved(cloakedId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Error', 'Failed to save photo.');
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  // ── Interpolations ──
  const phaseColor = getPhaseColor(cloakPhase);
  const spin1 = ring1.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const spin2 = ring2.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });
  const spin3 = ring3.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const breatheScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.03] });
  const glowOpacity = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.7] });
  const orbScale = orbEnter;

  const displayUri =
    modalPhase === 'done' && viewMode === 'ai' && analysisUri ? analysisUri
    : modalPhase === 'done' && viewMode === 'cloaked' && cloakedUri ? cloakedUri
    : imageUri;

  // ──────────────────────────── RENDER ────────────────────────────────────────

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>

        {/* ── Top bar ── */}
        <View style={s.topBar}>
          {modalPhase === 'processing' ? (
            <View style={s.liveChip}>
              <View style={[s.liveDot, { backgroundColor: phaseColor }]} />
              <Text style={[s.liveText, { color: phaseColor }]}>{getPhaseLabel(cloakPhase)}</Text>
            </View>
          ) : modalPhase === 'done' ? (
            <View style={s.liveChip}>
              <Ionicons name="checkmark-circle" size={12} color={colors.success} />
              <Text style={[s.liveText, { color: colors.success }]}>PROTECTED</Text>
            </View>
          ) : null}

          {modalPhase !== 'processing' && (
            <TouchableOpacity style={s.closeBtn} onPress={handleClose} activeOpacity={0.7}>
              <Ionicons name="close" size={18} color={colors.silver} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Image Card ── */}
        <View style={s.imageWrap}>
          <View style={s.imageCard}>
            <Image
              source={{ uri: displayUri }}
              style={s.image}
              contentFit="contain"
              transition={250}
            />
            {/* Processing overlay */}
            {modalPhase === 'processing' && (
              <View style={s.imageOverlay}>
                <LinearGradient
                  colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.25)']}
                  style={StyleSheet.absoluteFill}
                />
              </View>
            )}
            {/* AI badge */}
            {modalPhase === 'done' && viewMode === 'ai' && (
              <View style={s.aiBadge}>
                <Text style={s.aiBadgeText}>AI FEATURE ANALYSIS</Text>
              </View>
            )}
          </View>

          {/* Toggle row (done only) */}
          {modalPhase === 'done' && (
            <View style={s.toggleRow}>
              {(['cloaked', 'original', ...(analysisUri ? ['ai'] : [])] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    s.toggleBtn,
                    viewMode === mode && (mode === 'ai' ? s.toggleBtnAi : s.toggleBtnActive),
                  ]}
                  onPress={() => {
                    setViewMode(mode as any);
                    Haptics.selectionAsync();
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      s.toggleText,
                      viewMode === mode && (mode === 'ai' ? s.toggleTextAi : s.toggleTextActive),
                    ]}
                  >
                    {mode === 'ai' ? 'AI VIEW' : mode.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── Processing: Orb + Progress ── */}
        {modalPhase === 'processing' && (
          <View style={s.processingArea}>
            {/* The Orb */}
            <Animated.View
              style={[
                s.orbWrap,
                { transform: [{ scale: Animated.multiply(orbScale, breatheScale) }] },
              ]}
            >
              {/* Outer glow */}
              <Animated.View style={[s.orbGlow, { opacity: glowOpacity }]}>
                <Svg width={ORB} height={ORB}>
                  <Defs>
                    <RadialGradient id="g" cx="50%" cy="50%" rx="50%" ry="50%">
                      <Stop offset="0%" stopColor={phaseColor} stopOpacity="0.5" />
                      <Stop offset="50%" stopColor={phaseColor} stopOpacity="0.12" />
                      <Stop offset="100%" stopColor={phaseColor} stopOpacity="0" />
                    </RadialGradient>
                  </Defs>
                  <Circle cx={ORB_C} cy={ORB_C} r={ORB_C} fill="url(#g)" />
                </Svg>
              </Animated.View>

              {/* Ring 1 — outer, dashed, slow */}
              <Animated.View style={[s.orbRingAbs, { transform: [{ rotate: spin3 }] }]}>
                <Svg width={ORB} height={ORB}>
                  <Circle
                    cx={ORB_C} cy={ORB_C} r={56}
                    stroke={phaseColor} strokeWidth={0.8}
                    strokeDasharray="1.5 9" fill="none" opacity={0.3}
                  />
                  <Circle
                    cx={ORB_C} cy={ORB_C} r={62}
                    stroke={phaseColor} strokeWidth={0.5}
                    strokeDasharray="1 12" fill="none" opacity={0.15}
                  />
                </Svg>
              </Animated.View>

              {/* Ring 2 — middle, counter-rotate */}
              <Animated.View style={[s.orbRingAbs, { transform: [{ rotate: spin2 }] }]}>
                <Svg width={ORB} height={ORB}>
                  <Circle
                    cx={ORB_C} cy={ORB_C} r={42}
                    stroke={phaseColor} strokeWidth={1}
                    strokeDasharray="2 7" fill="none" opacity={0.5}
                  />
                  <Circle
                    cx={ORB_C} cy={ORB_C} r={48}
                    stroke={phaseColor} strokeWidth={0.8}
                    strokeDasharray="1.5 10" fill="none" opacity={0.25}
                  />
                </Svg>
              </Animated.View>

              {/* Ring 3 — inner, fast */}
              <Animated.View style={[s.orbRingAbs, { transform: [{ rotate: spin1 }] }]}>
                <Svg width={ORB} height={ORB}>
                  <Circle
                    cx={ORB_C} cy={ORB_C} r={28}
                    stroke="#FFF" strokeWidth={1.2}
                    strokeDasharray="2 5" fill="none" opacity={0.65}
                  />
                  <Circle
                    cx={ORB_C} cy={ORB_C} r={34}
                    stroke={phaseColor} strokeWidth={1}
                    strokeDasharray="1.5 6" fill="none" opacity={0.45}
                  />
                </Svg>
              </Animated.View>

              {/* Core — bright center */}
              <View style={s.orbCore}>
                <Svg width={40} height={40}>
                  <Defs>
                    <RadialGradient id="core" cx="50%" cy="50%" rx="50%" ry="50%">
                      <Stop offset="0%" stopColor="#FFF" stopOpacity="0.9" />
                      <Stop offset="40%" stopColor={phaseColor} stopOpacity="0.5" />
                      <Stop offset="100%" stopColor={phaseColor} stopOpacity="0" />
                    </RadialGradient>
                  </Defs>
                  <Circle cx={20} cy={20} r={18} fill="url(#core)" />
                </Svg>
              </View>
            </Animated.View>

            {/* Percentage */}
            <Text style={[s.percent, { color: phaseColor }]}>
              {Math.round(progress * 100)}%
            </Text>

            {/* Progress bar */}
            <View style={s.barBg}>
              <Animated.View
                style={[s.barFill, {
                  backgroundColor: phaseColor,
                  width: progressAnim.interpolate({
                    inputRange: [0, 1], outputRange: ['0%', '100%'],
                  }),
                }]}
              />
            </View>

            <Text style={s.msgText} numberOfLines={1}>{message}</Text>

            <View style={s.strengthPill}>
              <FontAwesome5 name="sliders-h" size={7} color={colors.muted} />
              <Text style={s.strengthLabel}>{strength.toUpperCase()}</Text>
            </View>
          </View>
        )}

        {/* ── Done: Stats + Actions ── */}
        {modalPhase === 'done' && resultMeta && (
          <View style={s.doneArea}>
            <View style={s.statsRow}>
              <StatChip
                icon={<FontAwesome5 name="user-shield" size={10} color={colors.success} />}
                value={`${resultMeta.facesCloaked}/${resultMeta.facesDetected}`}
                label="faces"
              />
              <View style={s.statDivider} />
              <StatChip
                icon={<Ionicons name="timer-outline" size={12} color={colors.muted} />}
                value={`${(resultMeta.processingTimeMs / 1000).toFixed(1)}s`}
                label="time"
              />
              <View style={s.statDivider} />
              <StatChip
                icon={<FontAwesome5 name="sliders-h" size={9} color={colors.muted} />}
                value={strength}
                label="strength"
              />
            </View>

            <TouchableOpacity
              style={s.saveBtn}
              onPress={handleSaveToDevice}
              activeOpacity={0.7}
              disabled={savedToDevice}
            >
              <LinearGradient
                colors={savedToDevice ? ['rgba(0,255,148,0.15)', 'rgba(0,255,148,0.06)'] : ['#FFF', '#E0E0E0']}
                style={s.saveBtnInner}
              >
                <Ionicons
                  name={savedToDevice ? 'checkmark-circle' : 'download-outline'}
                  size={17}
                  color={savedToDevice ? colors.success : colors.black}
                />
                <Text style={[s.saveBtnLabel, savedToDevice && { color: colors.success }]}>
                  {savedToDevice ? 'Saved' : 'Save to Gallery'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={s.doneBtn} onPress={handleClose} activeOpacity={0.7}>
              <Text style={s.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Error ── */}
        {modalPhase === 'error' && (
          <View style={s.errorArea}>
            <Ionicons name="close-circle" size={44} color={colors.error} />
            <Text style={s.errorTitle}>Cloaking Failed</Text>
            <Text style={s.errorMsg}>{message || 'Check your connection and try again.'}</Text>
            <TouchableOpacity style={s.errorBtn} onPress={handleClose} activeOpacity={0.7}>
              <Text style={s.errorBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

// ─── Sub-component ───────────────────────────────────────────────────────────

function StatChip({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <View style={s.statChip}>
      {icon}
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPhaseColor(phase: CloakPhase): string {
  switch (phase) {
    case 'preparing':
    case 'encrypting': return '#8E8E93';
    case 'uploading': return '#5AC8FA';
    case 'processing': return '#00DDFF';
    case 'downloading':
    case 'decrypting': return '#64D2FF';
    case 'saving':
    case 'complete': return colors.success;
    case 'error': return colors.error;
    default: return colors.silver;
  }
}

function getPhaseLabel(phase: CloakPhase): string {
  switch (phase) {
    case 'preparing': return 'PREPARING';
    case 'encrypting': return 'ENCRYPTING';
    case 'uploading': return 'UPLOADING';
    case 'processing': return 'CLOAKING';
    case 'downloading': return 'RECEIVING';
    case 'decrypting': return 'DECRYPTING';
    case 'saving': return 'SAVING';
    case 'complete': return 'COMPLETE';
    case 'error': return 'ERROR';
    default: return 'WORKING';
  }
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.black },
  safe: { flex: 1 },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    height: 44,
  },
  liveChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: borderRadius.full,
  },
  liveDot: { width: 5, height: 5, borderRadius: 2.5 },
  liveText: { fontFamily: fonts.monoBold, fontSize: 8, letterSpacing: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Image
  imageWrap: { alignItems: 'center', paddingHorizontal: spacing.lg },
  imageCard: {
    width: IMAGE_W, height: IMAGE_H,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.charcoal,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  image: { width: '100%', height: '100%' },
  imageOverlay: { ...StyleSheet.absoluteFillObject },
  aiBadge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: 'rgba(0,255,148,0.12)',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  aiBadgeText: {
    fontFamily: fonts.monoBold, fontSize: 7, color: '#00FF94', letterSpacing: 1.5,
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: borderRadius.full,
    padding: 3, gap: 2, marginTop: spacing.md,
  },
  toggleBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: borderRadius.full,
  },
  toggleBtnActive: { backgroundColor: 'rgba(255,255,255,0.1)' },
  toggleBtnAi: { backgroundColor: 'rgba(0,255,148,0.1)' },
  toggleText: {
    fontFamily: fonts.monoBold, fontSize: 8, color: colors.muted, letterSpacing: 2,
  },
  toggleTextActive: { color: colors.white },
  toggleTextAi: { color: '#00FF94' },

  // Processing area
  processingArea: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingBottom: spacing.xl,
  },

  // Orb
  orbWrap: {
    width: ORB, height: ORB,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  orbGlow: { position: 'absolute' },
  orbRingAbs: { position: 'absolute' },
  orbCore: { position: 'absolute' },

  // Progress
  percent: { fontFamily: fonts.monoBold, fontSize: 24, letterSpacing: 1, marginBottom: 6 },
  barBg: {
    width: 120, height: 2, backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 1, overflow: 'hidden', marginBottom: spacing.sm,
  },
  barFill: { height: '100%', borderRadius: 1 },
  msgText: { fontFamily: fonts.sans, fontSize: 11, color: colors.muted, marginBottom: 4 },
  strengthPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4, opacity: 0.4,
  },
  strengthLabel: { fontFamily: fonts.mono, fontSize: 7, color: colors.muted, letterSpacing: 2 },

  // Done area
  doneArea: {
    flex: 1, justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg, paddingBottom: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.lg, marginBottom: spacing.lg,
  },
  statChip: { alignItems: 'center', gap: 3 },
  statValue: { fontFamily: fonts.monoBold, fontSize: fontSize.md, color: colors.white },
  statLabel: { fontFamily: fonts.mono, fontSize: 7, color: colors.muted, letterSpacing: 1 },
  statDivider: { width: 1, height: 24, backgroundColor: colors.border },
  saveBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 4 },
  saveBtnInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: 14,
  },
  saveBtnLabel: { fontFamily: fonts.sansBold, fontSize: fontSize.md, color: colors.black },
  doneBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  doneBtnText: { fontFamily: fonts.sans, fontSize: fontSize.md, color: colors.muted },

  // Error
  errorArea: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.xl, gap: spacing.sm,
  },
  errorTitle: { fontFamily: fonts.sansBold, fontSize: fontSize.lg, color: colors.error },
  errorMsg: {
    fontFamily: fonts.sans, fontSize: fontSize.sm, color: colors.muted,
    textAlign: 'center', lineHeight: 20,
  },
  errorBtn: {
    marginTop: spacing.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: borderRadius.lg,
  },
  errorBtnText: { fontFamily: fonts.sansBold, fontSize: fontSize.md, color: colors.silver },
});
