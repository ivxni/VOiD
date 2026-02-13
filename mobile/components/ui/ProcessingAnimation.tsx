/**
 * VOiD — Premium Processing Animation
 *
 * Apple Watch-inspired particle field animation shown during
 * the cloaking process. Features:
 *   - Hundreds of small dots forming a swirling vortex pattern
 *   - Dots pulse and shift based on processing phase
 *   - Center shows a rotating shield icon
 *   - Progress ring around the center
 *   - Phase label + progress percentage
 *   - Smooth transitions between states
 *
 * Inspired by the Apple Watch pairing animation where particles
 * swirl in an organic, flowing pattern.
 */

import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { colors, fonts, fontSize, spacing } from '../../lib/constants/theme';
import type { CloakPhase } from '../../lib/api/cloakService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_SIZE = SCREEN_WIDTH * 0.7;
const CENTER = CANVAS_SIZE / 2;
const NUM_PARTICLES = 120;
const PROGRESS_RING_SIZE = 100;
const PROGRESS_RING_STROKE = 3;
const PROGRESS_RING_RADIUS = (PROGRESS_RING_SIZE - PROGRESS_RING_STROKE) / 2;
const PROGRESS_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RING_RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProcessingAnimationProps {
  phase: CloakPhase;
  progress: number; // 0–1
  message: string;
}

interface Particle {
  // Orbital parameters
  orbitRadius: number;
  angle: number;
  speed: number;
  size: number;
  opacity: number;
  // Animation offsets
  pulseOffset: number;
  wobbleAmp: number;
  wobbleSpeed: number;
}

function generateParticles(): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < NUM_PARTICLES; i++) {
    const ring = Math.floor(i / 20); // 6 rings of 20 particles
    const baseRadius = 30 + ring * 16 + Math.random() * 12;
    particles.push({
      orbitRadius: baseRadius,
      angle: (Math.PI * 2 * (i % 20)) / 20 + Math.random() * 0.3,
      speed: 0.3 + Math.random() * 0.4 + (ring * 0.05),
      size: 1.5 + Math.random() * 2.5,
      opacity: 0.3 + Math.random() * 0.7,
      pulseOffset: Math.random() * Math.PI * 2,
      wobbleAmp: 2 + Math.random() * 4,
      wobbleSpeed: 0.5 + Math.random() * 1.5,
    });
  }
  return particles;
}

export function ProcessingAnimation({
  phase,
  progress,
  message,
}: ProcessingAnimationProps) {
  const particles = useMemo(() => generateParticles(), []);

  // Master rotation
  const rotation = useRef(new Animated.Value(0)).current;
  // Pulse effect
  const pulse = useRef(new Animated.Value(0)).current;
  // Progress ring
  const progressAnim = useRef(new Animated.Value(0)).current;
  // Fade in
  const fadeIn = useRef(new Animated.Value(0)).current;
  // Icon scale
  const iconScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Icon bounce in
    Animated.spring(iconScale, {
      toValue: 1,
      friction: 6,
      tension: 100,
      useNativeDriver: true,
    }).start();

    // Continuous rotation
    const rotateLoop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    rotateLoop.start();

    // Pulse loop
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    return () => {
      rotateLoop.stop();
      pulseLoop.stop();
    };
  }, []);

  // Animate progress ring
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // SVG props can't use native driver
    }).start();
  }, [progress]);

  const rotationInterpolate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.97, 1.03],
  });

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [PROGRESS_CIRCUMFERENCE, 0],
  });

  const phaseColor = getPhaseColor(phase);
  const percent = Math.round(progress * 100);

  return (
    <Animated.View style={[styles.container, { opacity: fadeIn }]}>
      {/* Particle Field */}
      <Animated.View
        style={[
          styles.particleField,
          {
            transform: [
              { rotate: rotationInterpolate },
              { scale: pulseScale },
            ],
          },
        ]}
      >
        {particles.map((p, i) => {
          const x = CENTER + Math.cos(p.angle) * p.orbitRadius;
          const y = CENTER + Math.sin(p.angle) * p.orbitRadius;
          const adjustedOpacity = p.opacity * (0.4 + progress * 0.6);

          return (
            <View
              key={i}
              style={[
                styles.particle,
                {
                  left: x - p.size / 2,
                  top: y - p.size / 2,
                  width: p.size,
                  height: p.size,
                  borderRadius: p.size / 2,
                  backgroundColor: phaseColor,
                  opacity: adjustedOpacity,
                },
              ]}
            />
          );
        })}
      </Animated.View>

      {/* Center Hub */}
      <View style={styles.centerHub}>
        {/* Glow ring */}
        <View style={[styles.glowRing, { shadowColor: phaseColor }]} />

        {/* Progress Ring */}
        <Svg
          width={PROGRESS_RING_SIZE}
          height={PROGRESS_RING_SIZE}
          style={styles.progressRingSvg}
        >
          {/* Background ring */}
          <Circle
            cx={PROGRESS_RING_SIZE / 2}
            cy={PROGRESS_RING_SIZE / 2}
            r={PROGRESS_RING_RADIUS}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={PROGRESS_RING_STROKE}
            fill="none"
          />
          {/* Progress arc */}
          <AnimatedCircle
            cx={PROGRESS_RING_SIZE / 2}
            cy={PROGRESS_RING_SIZE / 2}
            r={PROGRESS_RING_RADIUS}
            stroke={phaseColor}
            strokeWidth={PROGRESS_RING_STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${PROGRESS_CIRCUMFERENCE}`}
            strokeDashoffset={strokeDashoffset}
            rotation="-90"
            origin={`${PROGRESS_RING_SIZE / 2}, ${PROGRESS_RING_SIZE / 2}`}
          />
        </Svg>

        {/* Icon + percentage */}
        <Animated.View
          style={[styles.centerContent, { transform: [{ scale: iconScale }] }]}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
            style={styles.iconBg}
          >
            <FontAwesome5 name="shield-alt" size={22} color={phaseColor} />
          </LinearGradient>
        </Animated.View>
      </View>

      {/* Status Info */}
      <View style={styles.statusSection}>
        <Text style={[styles.percentage, { color: phaseColor }]}>
          {percent}%
        </Text>
        <Text style={styles.phaseLabel}>{getPhaseLabel(phase)}</Text>
        <Text style={styles.message} numberOfLines={1}>{message}</Text>
      </View>
    </Animated.View>
  );
}

function getPhaseColor(phase: CloakPhase): string {
  switch (phase) {
    case 'preparing':
    case 'encrypting':
      return '#8E8E93'; // Gray
    case 'uploading':
      return '#5AC8FA'; // Blue
    case 'processing':
      return '#FF9F0A'; // Orange
    case 'downloading':
    case 'decrypting':
      return '#64D2FF'; // Light blue
    case 'saving':
    case 'complete':
      return colors.success; // Green
    case 'error':
      return colors.error;  // Red
    default:
      return colors.silver;
  }
}

function getPhaseLabel(phase: CloakPhase): string {
  switch (phase) {
    case 'preparing':   return 'PREPARING';
    case 'encrypting':  return 'ENCRYPTING';
    case 'uploading':   return 'UPLOADING';
    case 'processing':  return 'CLOAKING';
    case 'downloading': return 'RECEIVING';
    case 'decrypting':  return 'DECRYPTING';
    case 'saving':      return 'SAVING';
    case 'complete':    return 'COMPLETE';
    case 'error':       return 'ERROR';
    default:            return 'WORKING';
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  particleField: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    position: 'relative',
  },
  particle: {
    position: 'absolute',
  },
  centerHub: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: '50%',
    left: '50%',
    marginTop: -(PROGRESS_RING_SIZE / 2) - spacing.lg - 30,
    marginLeft: -(PROGRESS_RING_SIZE / 2),
  },
  glowRing: {
    position: 'absolute',
    width: PROGRESS_RING_SIZE + 30,
    height: PROGRESS_RING_SIZE + 30,
    borderRadius: (PROGRESS_RING_SIZE + 30) / 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 10,
  },
  progressRingSvg: {
    position: 'absolute',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusSection: {
    alignItems: 'center',
    marginTop: -spacing.md,
  },
  percentage: {
    fontFamily: fonts.monoBold,
    fontSize: 28,
    letterSpacing: 1,
    marginBottom: 4,
  },
  phaseLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 3,
    marginBottom: spacing.xs,
  },
  message: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    color: colors.subtle,
    textAlign: 'center',
    maxWidth: 250,
  },
});
