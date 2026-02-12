/**
 * VOiD Design System
 * "Be visible to friends. Invisible to machines."
 *
 * Aesthetic: Crypto-premium, futuristic minimalism.
 * Dark mode only. Sharp typography. Glassmorphism accents.
 */

export const colors = {
  // Backgrounds
  black: '#000000',
  charcoal: '#0A0A0A',
  darkGray: '#111111',
  cardBg: '#141414',
  surfaceBg: '#1A1A1A',

  // Text
  white: '#FFFFFF',
  silver: '#E0E0E0',
  muted: '#6B6B6B',
  subtle: '#3A3A3A',

  // Accent (white/silver — monochrome premium)
  accent: '#FFFFFF',
  accentGlow: 'rgba(255, 255, 255, 0.08)',
  accentMuted: '#AAAAAA',

  // Legacy alias (for migration)
  purple: '#FFFFFF',
  purpleGlow: 'rgba(255, 255, 255, 0.08)',
  purpleMuted: '#AAAAAA',

  // Status
  success: '#00FF94',
  successGlow: 'rgba(0, 255, 148, 0.15)',
  error: '#FF2A2A',
  errorGlow: 'rgba(255, 42, 42, 0.15)',
  warning: '#FFB800',
  warningGlow: 'rgba(255, 184, 0, 0.15)',

  // Strength gradient (green → orange → red)
  strengthLow: '#00FF94',
  strengthMid: '#FFB800',
  strengthHigh: '#FF2A2A',

  // Borders
  border: '#1E1E1E',
  borderLight: '#2A2A2A',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.7)',
  glassBg: 'rgba(20, 20, 20, 0.85)',
} as const;

export const fonts = {
  // Sharp sans-serif for headlines and UI
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',

  // Monospace for data, stats, and technical elements
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 28,
  xxxl: 36,
  display: 48,
} as const;

export const lineHeight = {
  tight: 1.1,
  normal: 1.4,
  relaxed: 1.6,
} as const;
