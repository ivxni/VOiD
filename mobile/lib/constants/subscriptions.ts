/**
 * VOiD — Subscription Tiers
 *
 * 3-tier model:
 *   FREE  — Try the technology, limited usage
 *   PRO   — Power user, unlimited cloaking
 *   PRO+  — Professional / Creator tier, batch + advanced features
 */

export type SubscriptionTier = 'free' | 'pro' | 'proplus';

export interface TierConfig {
  id: SubscriptionTier;
  name: string;
  tagline: string;
  monthlyPrice: string;
  yearlyPrice: string;
  yearlySavings: string;
  features: string[];
  limits: {
    monthlyCloak: number; // -1 = unlimited
    strengthLevels: ('subtle' | 'standard' | 'maximum')[];
    videoCloaking: boolean;
    batchProcessing: boolean;
    autoCloakRoll: boolean;
    exportResolution: 'standard' | 'full' | 'raw';
    priorityProcessing: boolean;
    analyticsAccess: boolean;
    customProfiles: boolean;
  };
}

export const TIERS: Record<SubscriptionTier, TierConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    tagline: 'Try the invisible',
    monthlyPrice: '$0',
    yearlyPrice: '$0',
    yearlySavings: '',
    features: [
      '3 cloaks per month',
      'Photos only',
      'Standard strength only',
      'Standard resolution export',
    ],
    limits: {
      monthlyCloak: 3,
      strengthLevels: ['standard'],
      videoCloaking: false,
      batchProcessing: false,
      autoCloakRoll: false,
      exportResolution: 'standard',
      priorityProcessing: false,
      analyticsAccess: false,
      customProfiles: false,
    },
  },

  pro: {
    id: 'pro',
    name: 'Pro',
    tagline: 'Unlimited invisibility',
    monthlyPrice: '$7.99',
    yearlyPrice: '$59.99',
    yearlySavings: 'Save 37%',
    features: [
      'Unlimited cloaks',
      'All strength levels',
      'Full resolution export',
      'Advanced gallery & stats',
      'Priority processing',
    ],
    limits: {
      monthlyCloak: -1,
      strengthLevels: ['subtle', 'standard', 'maximum'],
      videoCloaking: false,
      batchProcessing: false,
      autoCloakRoll: false,
      exportResolution: 'full',
      priorityProcessing: true,
      analyticsAccess: true,
      customProfiles: false,
    },
  },

  proplus: {
    id: 'proplus',
    name: 'Pro+',
    tagline: 'Maximum protection',
    monthlyPrice: '$14.99',
    yearlyPrice: '$119.99',
    yearlySavings: 'Save 33%',
    features: [
      'Everything in Pro',
      'Video cloaking',
      'Batch cloak (up to 50 photos)',
      'Auto-cloak camera roll',
      'RAW resolution export',
      'Custom perturbation profiles',
      'Detailed analytics dashboard',
      'Early access to new features',
    ],
    limits: {
      monthlyCloak: -1,
      strengthLevels: ['subtle', 'standard', 'maximum'],
      videoCloaking: true,
      batchProcessing: true,
      autoCloakRoll: true,
      exportResolution: 'raw',
      priorityProcessing: true,
      analyticsAccess: true,
      customProfiles: true,
    },
  },
} as const;

/**
 * Get the tier config for a subscription status.
 */
export function getTierForStatus(status: string): TierConfig {
  if (status === 'proplus') return TIERS.proplus;
  if (status === 'pro' || status === 'active' || status === 'premium') return TIERS.pro;
  return TIERS.free;
}
