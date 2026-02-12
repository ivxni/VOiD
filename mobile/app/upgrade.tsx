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
import { useRouter } from 'expo-router';
import { FontAwesome5, FontAwesome6, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
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

// Feature comparison rows with icons
const FEATURE_ROWS: {
  icon: React.ReactNode;
  label: string;
  free: string;
  pro: string;
  proplus: string;
}[] = [
  {
    icon: <FontAwesome5 name="shield-alt" size={14} color={colors.accent} />,
    label: 'Monthly cloaks',
    free: '3',
    pro: 'Unlimited',
    proplus: 'Unlimited',
  },
  {
    icon: <Ionicons name="videocam-outline" size={16} color={colors.accent} />,
    label: 'Video cloaking',
    free: '—',
    pro: '—',
    proplus: 'Yes',
  },
  {
    icon: <Ionicons name="speedometer-outline" size={16} color={colors.accent} />,
    label: 'Strength levels',
    free: 'Standard',
    pro: 'All',
    proplus: 'All + Custom',
  },
  {
    icon: <Ionicons name="images-outline" size={16} color={colors.accent} />,
    label: 'Batch processing',
    free: '—',
    pro: '—',
    proplus: 'Up to 50',
  },
  {
    icon: <Ionicons name="camera-outline" size={16} color={colors.accent} />,
    label: 'Auto-cloak roll',
    free: '—',
    pro: '—',
    proplus: 'Yes',
  },
  {
    icon: <FontAwesome5 name="expand-arrows-alt" size={14} color={colors.accent} />,
    label: 'Export quality',
    free: 'Standard',
    pro: 'Full HD',
    proplus: 'RAW',
  },
  {
    icon: <Ionicons name="flash-outline" size={16} color={colors.accent} />,
    label: 'Priority engine',
    free: '—',
    pro: 'Yes',
    proplus: 'Yes',
  },
  {
    icon: <Ionicons name="bar-chart-outline" size={16} color={colors.accent} />,
    label: 'Analytics',
    free: '—',
    pro: 'Basic',
    proplus: 'Advanced',
  },
  {
    icon: <FontAwesome5 name="flask" size={14} color={colors.accent} />,
    label: 'Early access',
    free: '—',
    pro: '—',
    proplus: 'Yes',
  },
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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeButton}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={24} color={colors.silver} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upgrade</Text>
        <View style={styles.closeButton} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIconContainer}>
            <FontAwesome5 name="shield-alt" size={32} color={colors.white} />
          </View>
          <Text style={styles.heroTitle}>Unlock Full{'\n'}Protection</Text>
          <Text style={styles.heroSubtitle}>
            Get unlimited cloaking and advanced features{'\n'}to keep your identity safe everywhere.
          </Text>
        </View>

        {/* Tier Selector */}
        <View style={styles.tierSelector}>
          <TouchableOpacity
            style={[
              styles.tierTab,
              selectedTier === 'pro' && styles.tierTabActive,
            ]}
            onPress={() => {
              setSelectedTier('pro');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tierTabName,
                selectedTier === 'pro' && styles.tierTabNameActive,
              ]}
            >
              Pro
            </Text>
            <Text style={styles.tierTabPrice}>
              {billingCycle === 'yearly' ? '$59.99/yr' : '$7.99/mo'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tierTab,
              selectedTier === 'proplus' && styles.tierTabActive,
            ]}
            onPress={() => {
              setSelectedTier('proplus');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.bestValueBadge}>
              <Text style={styles.bestValueText}>BEST VALUE</Text>
            </View>
            <Text
              style={[
                styles.tierTabName,
                selectedTier === 'proplus' && styles.tierTabNameActive,
              ]}
            >
              Pro+
            </Text>
            <Text style={styles.tierTabPrice}>
              {billingCycle === 'yearly' ? '$119.99/yr' : '$14.99/mo'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Billing Toggle */}
        <View style={styles.billingToggle}>
          <TouchableOpacity
            style={[
              styles.billingOption,
              billingCycle === 'monthly' && styles.billingOptionActive,
            ]}
            onPress={() => setBillingCycle('monthly')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.billingOptionText,
                billingCycle === 'monthly' && styles.billingOptionTextActive,
              ]}
            >
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.billingOption,
              billingCycle === 'yearly' && styles.billingOptionActive,
            ]}
            onPress={() => setBillingCycle('yearly')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.billingOptionText,
                billingCycle === 'yearly' && styles.billingOptionTextActive,
              ]}
            >
              Yearly
            </Text>
            {plan.yearlySavings && (
              <View style={styles.saveBadge}>
                <Text style={styles.saveText}>{plan.yearlySavings}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Feature List for selected tier */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresSectionTitle}>WHAT YOU GET</Text>
          {plan.features.map((feature, i) => (
            <View key={i} style={styles.featureItem}>
              <View style={styles.featureCheck}>
                <FontAwesome5 name="check" size={10} color={colors.success} />
              </View>
              <Text style={styles.featureItemText}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Comparison Table */}
        <View style={styles.comparisonSection}>
          <Text style={styles.featuresSectionTitle}>FULL COMPARISON</Text>
          <GlassCard style={styles.comparisonCard} noPadding>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.tableFeatureCol]}>Feature</Text>
              <Text style={styles.tableHeaderCell}>Free</Text>
              <Text style={[styles.tableHeaderCell, selectedTier === 'pro' && styles.tableHeaderCellActive]}>Pro</Text>
              <Text style={[styles.tableHeaderCell, selectedTier === 'proplus' && styles.tableHeaderCellActive]}>Pro+</Text>
            </View>

            {/* Table Rows */}
            {FEATURE_ROWS.map((row, i) => (
              <View
                key={i}
                style={[
                  styles.tableRow,
                  i % 2 === 0 && styles.tableRowAlt,
                ]}
              >
                <View style={[styles.tableCell, styles.tableFeatureCol]}>
                  {row.icon}
                  <Text style={styles.tableCellLabel} numberOfLines={1}>{row.label}</Text>
                </View>
                <Text style={[styles.tableCell, styles.tableCellValue, row.free === '—' && styles.tableCellMuted]}>
                  {row.free}
                </Text>
                <Text style={[styles.tableCell, styles.tableCellValue, selectedTier === 'pro' && styles.tableCellHighlight]}>
                  {row.pro}
                </Text>
                <Text style={[styles.tableCell, styles.tableCellValue, selectedTier === 'proplus' && styles.tableCellHighlight]}>
                  {row.proplus}
                </Text>
              </View>
            ))}
          </GlassCard>
        </View>

        {/* Social Proof */}
        <View style={styles.socialProof}>
          <View style={styles.proofRow}>
            <FontAwesome5 name="lock" size={12} color={colors.success} />
            <Text style={styles.proofText}>100% on-device. We never see your photos.</Text>
          </View>
          <View style={styles.proofRow}>
            <Ionicons name="card-outline" size={14} color={colors.success} />
            <Text style={styles.proofText}>Cancel anytime. No questions asked.</Text>
          </View>
          <View style={styles.proofRow}>
            <FontAwesome6 name="apple" size={13} color={colors.success} />
            <Text style={styles.proofText}>Secured by Apple In-App Purchase.</Text>
          </View>
        </View>

        {/* Spacer for button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky CTA */}
      <View style={styles.ctaContainer}>
        <Button
          title={`Subscribe — ${price}${period}`}
          onPress={handleSubscribe}
          variant="primary"
          size="lg"
          style={styles.ctaButton}
        />
        <Text style={styles.ctaHint}>
          {billingCycle === 'yearly'
            ? `That's just ${selectedTier === 'pro' ? '$4.99' : '$9.99'}/month`
            : 'Switch to yearly to save more'}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.lg,
    color: colors.white,
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  heroIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accentGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  heroTitle: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.xxxl,
    color: colors.white,
    textAlign: 'center',
    lineHeight: fontSize.xxxl * 1.15,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    fontFamily: fonts.sans,
    fontSize: fontSize.md,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: fontSize.md * 1.5,
  },

  // Tier Selector
  tierSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tierTab: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.cardBg,
    alignItems: 'center',
  },
  tierTabActive: {
    borderColor: colors.white,
    backgroundColor: colors.accentGlow,
  },
  tierTabName: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.xl,
    color: colors.muted,
  },
  tierTabNameActive: {
    color: colors.white,
  },
  tierTabPrice: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    color: colors.muted,
    marginTop: 4,
  },
  bestValueBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  bestValueText: {
    fontFamily: fonts.monoBold,
    fontSize: 8,
    color: colors.black,
    letterSpacing: 1.5,
  },

  // Billing Toggle
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: colors.darkGray,
    borderRadius: borderRadius.md,
    padding: 3,
    marginBottom: spacing.xl,
  },
  billingOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md - 2,
  },
  billingOptionActive: {
    backgroundColor: colors.surfaceBg,
  },
  billingOptionText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.sm,
    color: colors.muted,
  },
  billingOptionTextActive: {
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
    fontSize: 9,
    color: colors.success,
    letterSpacing: 0.5,
  },

  // Features
  featuresSection: {
    marginBottom: spacing.xl,
  },
  featuresSectionTitle: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.muted,
    letterSpacing: 2,
    marginBottom: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  featureCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.successGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureItemText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.md,
    color: colors.silver,
    flex: 1,
  },

  // Comparison Table
  comparisonSection: {
    marginBottom: spacing.xl,
  },
  comparisonCard: {
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeaderCell: {
    fontFamily: fonts.monoBold,
    fontSize: fontSize.xs,
    color: colors.muted,
    flex: 1,
    textAlign: 'center',
    letterSpacing: 1,
  },
  tableHeaderCellActive: {
    color: colors.white,
  },
  tableFeatureCol: {
    flex: 1.8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    textAlign: 'left',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  tableRowAlt: {
    backgroundColor: 'rgba(255,255,255,0.02)',
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
    color: colors.silver,
    textAlign: 'center',
  },
  tableCellMuted: {
    color: colors.subtle,
  },
  tableCellHighlight: {
    color: colors.white,
  },

  // Social Proof
  socialProof: {
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  proofRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  proofText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.muted,
  },

  // CTA
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl + 12,
    backgroundColor: colors.black,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  ctaButton: {
    width: '100%',
    height: 56,
    borderRadius: 14,
  },
  ctaHint: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.muted,
    marginTop: spacing.sm,
    letterSpacing: 0.5,
  },
});
