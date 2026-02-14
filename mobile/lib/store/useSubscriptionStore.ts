/**
 * VOiD — Subscription Store
 *
 * Manages subscription state, feature gates, and tier-based
 * functionality throughout the app.
 */

import { create } from 'zustand';
import {
  fetchSubscription,
  updateSubscription as apiUpdateSubscription,
  cancelSubscription as apiCancelSubscription,
  restorePurchases as apiRestorePurchases,
} from '../api/subscriptionService';
import { useAuthStore } from './useAuthStore';
import type {
  SubscriptionInfo,
  SubscriptionTier,
  BillingCycle,
  TierFeatures,
} from '../types';

// ── Default free-tier features ───────────────────────────────────────────────

const FREE_FEATURES: TierFeatures = {
  strengthLevels: ['standard'],
  videoCloaking: false,
  batchProcessing: false,
  autoCloakRoll: false,
  exportResolution: 'standard',
  priorityProcessing: false,
  analyticsAccess: false,
  customProfiles: false,
};

const FREE_SUBSCRIPTION: SubscriptionInfo = {
  tier: 'free',
  billingCycle: null,
  status: 'none',
  isPremium: false,
  monthlyCloakLimit: 3,
  remainingCloaks: 3,
  features: FREE_FEATURES,
  expiresAt: null,
};

// ── Store ────────────────────────────────────────────────────────────────────

interface SubscriptionState {
  subscription: SubscriptionInfo;
  isLoading: boolean;
  error: string | null;

  // ── Computed / Helpers ──
  /** Get the effective tier name */
  tierName: () => string;
  /** Check if user can perform an action */
  canCloak: () => boolean;
  canUseStrength: (strength: string) => boolean;
  canCloakVideo: () => boolean;
  canBatchProcess: () => boolean;

  // ── Actions ──
  /** Fetch latest subscription from backend */
  refresh: () => Promise<void>;
  /** Upgrade/change subscription (dev mode: direct API call) */
  upgrade: (tier: SubscriptionTier, billingCycle: BillingCycle) => Promise<void>;
  /** Cancel current subscription */
  cancel: () => Promise<void>;
  /** Restore purchases */
  restore: () => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  subscription: FREE_SUBSCRIPTION,
  isLoading: false,
  error: null,

  // ── Computed ───────────────────────────────────────────────────────────────

  tierName: () => {
    const tier = get().subscription.tier;
    if (tier === 'proplus') return 'Pro+';
    if (tier === 'pro') return 'Pro';
    return 'Free';
  },

  canCloak: () => {
    const { remainingCloaks, monthlyCloakLimit } = get().subscription;
    return monthlyCloakLimit === -1 || remainingCloaks > 0;
  },

  canUseStrength: (strength: string) => {
    return get().subscription.features.strengthLevels.includes(strength);
  },

  canCloakVideo: () => {
    return get().subscription.features.videoCloaking;
  },

  canBatchProcess: () => {
    return get().subscription.features.batchProcessing;
  },

  // ── Actions ────────────────────────────────────────────────────────────────

  refresh: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    set({ isLoading: true, error: null });
    try {
      const info = await fetchSubscription(token);
      set({ subscription: info, isLoading: false });

      // Sync auth store
      useAuthStore.getState().updateSubscription(
        info.tier,
        info.status as any,
        info.billingCycle,
        info.expiresAt,
      );
    } catch (err: any) {
      console.error('[Subscription] Refresh failed:', err);
      set({ error: err.message, isLoading: false });
    }
  },

  upgrade: async (tier: SubscriptionTier, billingCycle: BillingCycle) => {
    const token = useAuthStore.getState().token;
    if (!token) throw new Error('Not authenticated');

    set({ isLoading: true, error: null });
    try {
      const info = await apiUpdateSubscription(token, tier, billingCycle);
      set({ subscription: info, isLoading: false });

      // Sync auth store
      useAuthStore.getState().updateSubscription(
        info.tier,
        info.status as any,
        info.billingCycle,
        info.expiresAt,
      );
    } catch (err: any) {
      console.error('[Subscription] Upgrade failed:', err);
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  cancel: async () => {
    const token = useAuthStore.getState().token;
    if (!token) throw new Error('Not authenticated');

    set({ isLoading: true, error: null });
    try {
      await apiCancelSubscription(token);
      // Refresh to get updated state
      await get().refresh();
    } catch (err: any) {
      console.error('[Subscription] Cancel failed:', err);
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  restore: async () => {
    const token = useAuthStore.getState().token;
    if (!token) throw new Error('Not authenticated');

    set({ isLoading: true, error: null });
    try {
      const info = await apiRestorePurchases(token);
      set({ subscription: info, isLoading: false });

      // Sync auth store
      useAuthStore.getState().updateSubscription(
        info.tier,
        info.status as any,
        info.billingCycle,
        info.expiresAt,
      );
    } catch (err: any) {
      console.error('[Subscription] Restore failed:', err);
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },
}));
