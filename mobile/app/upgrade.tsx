import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { FontAwesome5, FontAwesome6, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { GlassCard } from '../components/ui/GlassCard';
import { TIERS } from '../lib/constants/subscriptions';
import type { SubscriptionTier } from '../lib/constants/subscriptions';
import {
  colors,
  fonts,
  fontSize,
  spacing,
  borderRadius,
} from '../lib/constants/theme';

const { width } = Dimensions.get('window');

type BillingCycle = 'monthly' | 'yearly';

const FEATURE_ROWS: {
  icon: string;
  iconSet: 'fa5' | 'ion';
  label: string;
  free: string;
  pro: string;
  proplus: string;
}[] = [
  { icon: 'shield-alt', iconSet: 'fa5', label: 'Monthly cloaks', free: '3', pro: '\u221E', proplus: '\u221E' },
  { icon: 'videocam-outline', iconSet: 'ion', label: 'Video cloaking', free: '\u2014', pro: '\u2014', proplus: '\u2713' },
  { icon: 'speedometer-outline', iconSet: 'ion', label: 'Strength levels', free: '1', pro: 'All', proplus: 'All+' },
  { icon: 'images-outline', iconSet: 'ion', label: 'Batch process', free: '\u2014', pro: '\u2014', proplus: '50' },
  { icon: 'camera-outline', iconSet: 'ion', label: 'Auto-cloak', free: '\u2014', pro: '\u2014', proplus: '\u2713' },
  { icon: 'expand-arrows-alt', iconSet: 'fa5', label: 'Export quality', free: 'SD', pro: 'HD', proplus: 'RAW' },
  { icon: 'flash-outline', iconSet: 'ion', label: 'Priority engine', free: '\u2014', pro: '\u2713', proplus: '\u2713' },
  { icon: 'bar-chart-outline', iconSet: 'ion', label: 'Analytics', free: '\u2014', pro: 'Basic', proplus: 'Full' },
];

export default function UpgradeScreen() {
  const router = useRouter();
  const [selectedTier, setSelectedTier] = useState<'pro' | 'proplus'>('pro');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly');

  const plan = TIERS[selectedTier];
  const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
  const period = billingCycle === 'yearly' ? '/year' : '/month';

  const handleSubscribe = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // TODO: Trigger Apple In-App Purchase
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={styles.closeButton}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={22} color={colors.silver} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Upgrade</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIconOuter}>
            <LinearGradient
              colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.03)', 'rgba(0,0,0,0)']}
              locations={[0, 0.5, 1]}
              start={{ x: 0.3, y: 0 }}
              end={{ x: 0.7, y: 1 }}
              style={styles.heroIconGradient}
            >
              <View style={styles.heroIconInner}>
                <FontAwesome5 name="bolt" size={28} color={colors.white} />
              </View>
            </LinearGradient>
          </View>
          <Text style={styles.heroTitle}>Unlock Full Protection</Text>
          <Text style={styles.heroSubtitle}>
            Unlimited cloaking and advanced features{'\n'}to keep your identity safe.
          </Text>
        </View>

        {/* Tier Selector */}
        <View style={styles.tierSelector}>
          {/* Pro Card */}
          <TouchableOpacity
            style={styles.tierCardOuter}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedTier('pro');
            }}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={
                selectedTier === 'pro'
                  ? ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.04)', 'rgba(0,0,0,0)']
                  : ['rgba(255,255,255,0.04)', 'rgba(0,0,0,0)']
              }
              locations={selectedTier === 'pro' ? [0, 0.5, 1] : [0, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.tierCardGradient}
            >
              <View style={[
                styles.tierCardContent,
                selectedTier === 'pro' && styles.tierCardContentActive,
              ]}>
                <FontAwesome5 name="bolt" size={14} color={selectedTier === 'pro' ? colors.white : colors.muted} />
                <Text style={[styles.tierName, selectedTier === 'pro' && styles.tierNameActive]}>Pro</Text>
                <Text style={styles.tierPrice}>
                  {billingCycle === 'yearly' ? '$59.99' : '$7.99'}
                  <Text style={styles.tierPricePeriod}>
                    {billingCycle === 'yearly' ? '/yr' : '/mo'}
                  </Text>
                </Text>
                {selectedTier === 'pro' && (
                  <View style={styles.tierSelectedDot} />
                )}
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Pro+ Card */}
          <TouchableOpacity
            style={styles.tierCardOuter}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedTier('proplus');
            }}
            activeOpacity={0.7}
          >
            {/* Best Value Badge */}
            <View style={styles.bestValueBadge}>
              <Text style={styles.bestValueText}>BEST VALUE</Text>
            </View>
            <LinearGradient
              colors={
                selectedTier === 'proplus'
                  ? ['rgba(0,255,148,0.1)', 'rgba(255,255,255,0.04)', 'rgba(0,0,0,0)']
                  : ['rgba(255,255,255,0.04)', 'rgba(0,0,0,0)']
              }
              locations={selectedTier === 'proplus' ? [0, 0.5, 1] : [0, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.tierCardGradient}
            >
              <View style={[
                styles.tierCardContent,
                selectedTier === 'proplus' && styles.tierCardContentActive,
              ]}>
                <FontAwesome5 name="crown" size={14} color={selectedTier === 'proplus' ? colors.success : colors.muted} />
                <Text style={[styles.tierName, selectedTier === 'proplus' && styles.tierNameActive]}>Pro+</Text>
                <Text style={styles.tierPrice}>
                  {billingCycle === 'yearly' ? '$119.99' : '$14.99'}
                  <Text style={styles.tierPricePeriod}>
                    {billingCycle === 'yearly' ? '/yr' : '/mo'}
                  </Text>
                </Text>
                {selectedTier === 'proplus' && (
                  <View style={[styles.tierSelectedDot, { backgroundColor: colors.success }]} />
                )}
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Billing Toggle */}
        <View style={styles.billingOuter}>
          <LinearGradient
            colors={['rgba(255,255,255,0.05)', 'rgba(0,0,0,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.billingGradient}
          >
            <View style={styles.billingRow}>
              <TouchableOpacity
                style={[styles.billingOption, billingCycle === 'monthly' && styles.billingOptionActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setBillingCycle('monthly');
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.billingText, billingCycle === 'monthly' && styles.billingTextActive]}>
                  Monthly
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.billingOption, billingCycle === 'yearly' && styles.billingOptionActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setBillingCycle('yearly');
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.billingText, billingCycle === 'yearly' && styles.billingTextActive]}>
                  Yearly
                </Text>
                {plan.yearlySavings ? (
                  <View style={styles.saveBadge}>
                    <Text style={styles.saveText}>{plan.yearlySavings}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* What You Get */}
        <View style={styles.sectionHeader}>
          <FontAwesome5 name="check-circle" size={10} color={colors.muted} />
          <Text style={styles.sectionTitle}>WHAT YOU GET</Text>
        </View>

        <GlassCard style={styles.featureCard}>
          {plan.features.map((feature, i) => (
            <View key={i} style={[styles.featureItem, i > 0 && styles.featureItemBorder]}>
              <View style={styles.featureCheck}>
                <FontAwesome5 name="check" size={9} color={colors.success} />
              </View>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </GlassCard>

        {/* Comparison Table */}
        <View style={styles.sectionHeader}>
          <Ionicons name="grid-outline" size={11} color={colors.muted} />
          <Text style={styles.sectionTitle}>FULL COMPARISON</Text>
        </View>

        <GlassCard style={styles.tableCard} noPadding>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <View style={styles.tableFeatureCol} />
            <Text style={styles.tableHeaderCell}>Free</Text>
            <Text style={[styles.tableHeaderCell, selectedTier === 'pro' && styles.tableHeaderActive]}>Pro</Text>
            <Text style={[styles.tableHeaderCell, selectedTier === 'proplus' && styles.tableHeaderActive]}>Pro+</Text>
          </View>

          {/* Rows */}
          {FEATURE_ROWS.map((row, i) => {
            const Icon = row.iconSet === 'fa5' ? FontAwesome5 : Ionicons;
            return (
              <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                <View style={[styles.tableCell, styles.tableFeatureCol]}>
                  <Icon name={row.icon as any} size={row.iconSet === 'fa5' ? 11 : 13} color={colors.muted} />
                  <Text style={styles.tableCellLabel} numberOfLines={1}>{row.label}</Text>
                </View>
                <Text style={[styles.tableCell, styles.tableCellValue, row.free === '\u2014' && styles.tableCellMuted]}>
                  {row.free}
                </Text>
                <Text style={[
                  styles.tableCell,
                  styles.tableCellValue,
                  selectedTier === 'pro' && styles.tableCellActive,
                  row.pro === '\u2713' && selectedTier === 'pro' && styles.tableCellCheck,
                ]}>
                  {row.pro}
                </Text>
                <Text style={[
                  styles.tableCell,
                  styles.tableCellValue,
                  selectedTier === 'proplus' && styles.tableCellActive,
                  row.proplus === '\u2713' && selectedTier === 'proplus' && styles.tableCellCheck,
                ]}>
                  {row.proplus}
                </Text>
              </View>
            );
          })}
        </GlassCard>

        {/* Trust Signals */}
        <View style={styles.sectionHeader}>
          <FontAwesome5 name="lock" size={10} color={colors.muted} />
          <Text style={styles.sectionTitle}>TRUST</Text>
        </View>

        <GlassCard style={styles.trustCard}>
          <TrustRow icon="lock" text="100% on-device. We never see your photos." />
          <View style={styles.trustDivider} />
          <TrustRow icon="card-outline" text="Cancel anytime. No questions asked." iconSet="ion" />
          <View style={styles.trustDivider} />
          <TrustRow icon="apple" text="Secured by Apple In-App Purchase." iconSet="fa6" />
        </GlassCard>

        {/* Bottom spacer for CTA */}
        <View style={{ height: 180 }} />
      </ScrollView>

      {/* Sticky CTA */}
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.95)', colors.black]}
        locations={[0, 0.3, 0.5]}
        style={styles.ctaGradient}
      >
        <View style={styles.ctaInner}>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleSubscribe}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FFFFFF', '#E0E0E0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.ctaButtonGradient}
            >
              <Text style={styles.ctaButtonText}>Subscribe — {price}{period}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.ctaHint}>
            {billingCycle === 'yearly'
              ? `That\u2019s just ${selectedTier === 'pro' ? '$4.99' : '$9.99'}/month`
              : 'Switch to yearly to save more'}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

function TrustRow({ icon, text, iconSet = 'fa5' }: { icon: string; text: string; iconSet?: 'fa5' | 'fa6' | 'ion' }) {
  const IconComponent = iconSet === 'ion' ? Ionicons : iconSet === 'fa6' ? FontAwesome6 : FontAwesome5;
  return (
    <View style={styles.trustRow}>
      <View style={styles.trustIconWrap}>
        <IconComponent name={icon as any} size={12} color={colors.success} />
      </View>
      <Text style={styles.trustText}>{text}</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerSpacer: {
    width: 36,
    height: 36,
  },
  headerTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.md,
    color: colors.white,
    letterSpacing: 0.5,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  heroIconOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: spacing.md,
  },
  heroIconGradient: {
    width: '100%',
    height: '100%',
  },
  heroIconInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(14,14,14,0.85)',
  },
  heroTitle: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.xxl,
    color: colors.white,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: fontSize.sm * 1.5,
  },

  // Tier Selector
  tierSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tierCardOuter: {
    flex: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tierCardGradient: {
    width: '100%',
    flex: 1,
  },
  tierCardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(14,14,14,0.85)',
    gap: spacing.xs,
  },
  tierCardContentActive: {
    backgroundColor: 'rgba(14,14,14,0.75)',
  },
  tierName: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.xl,
    color: colors.muted,
  },
  tierNameActive: {
    color: colors.white,
  },
  tierPrice: {
    fontFamily: fonts.monoBold,
    fontSize: fontSize.md,
    color: colors.silver,
  },
  tierPricePeriod: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.muted,
  },
  tierSelectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
    marginTop: 2,
  },
  bestValueBadge: {
    position: 'absolute',
    top: -1,
    alignSelf: 'center',
    zIndex: 10,
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderBottomLeftRadius: borderRadius.sm,
    borderBottomRightRadius: borderRadius.sm,
  },
  bestValueText: {
    fontFamily: fonts.monoBold,
    fontSize: 8,
    color: colors.black,
    letterSpacing: 1.5,
  },

  // Billing Toggle
  billingOuter: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  billingGradient: {
    width: '100%',
  },
  billingRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(14,14,14,0.85)',
    padding: 3,
  },
  billingOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.sm,
  },
  billingOptionActive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  billingText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.sm,
    color: colors.muted,
  },
  billingTextActive: {
    color: colors.white,
  },
  saveBadge: {
    backgroundColor: colors.successGlow,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
    borderRadius: borderRadius.full,
  },
  saveText: {
    fontFamily: fonts.monoBold,
    fontSize: 8,
    color: colors.success,
    letterSpacing: 0.5,
  },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.muted,
    letterSpacing: 2,
  },

  // Feature List
  featureCard: {
    marginBottom: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  featureItemBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  featureCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.successGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.silver,
    flex: 1,
  },

  // Table
  tableCard: {
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeaderCell: {
    flex: 1,
    fontFamily: fonts.monoBold,
    fontSize: 9,
    color: colors.muted,
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  tableHeaderActive: {
    color: colors.white,
  },
  tableFeatureCol: {
    flex: 1.6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  tableRowAlt: {
    backgroundColor: 'rgba(255,255,255,0.015)',
  },
  tableCell: {
    flex: 1,
    textAlign: 'center',
  },
  tableCellLabel: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    color: colors.silver,
    flex: 1,
  },
  tableCellValue: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.muted,
    textAlign: 'center',
  },
  tableCellMuted: {
    color: colors.subtle,
  },
  tableCellActive: {
    color: colors.silver,
  },
  tableCellCheck: {
    color: colors.success,
  },

  // Trust
  trustCard: {
    marginBottom: spacing.md,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  trustIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.successGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.muted,
    flex: 1,
  },
  trustDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },

  // CTA
  ctaGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: spacing.xl,
  },
  ctaInner: {
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    paddingBottom: spacing.xxl + spacing.md,
  },
  ctaButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  ctaButtonGradient: {
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonText: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.md,
    color: colors.black,
    letterSpacing: 0.3,
  },
  ctaHint: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.muted,
    marginTop: spacing.sm,
    letterSpacing: 0.5,
  },
});
