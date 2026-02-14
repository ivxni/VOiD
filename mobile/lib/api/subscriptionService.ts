/**
 * VOiD — Subscription API Service
 *
 * Manages subscription state, feature gates, and tier operations
 * by communicating with the backend subscription endpoints.
 */

import { apiRequest } from './client';
import type { SubscriptionInfo, SubscriptionTier, BillingCycle } from '../types';

// ── API Response Types (snake_case from backend) ─────────────────────────────

interface SubscriptionApiResponse {
  tier: string;
  billing_cycle: string | null;
  status: string;
  is_premium: boolean;
  monthly_cloak_limit: number;
  remaining_cloaks: number;
  features: {
    strength_levels: string[];
    video_cloaking: boolean;
    batch_processing: boolean;
    auto_cloak_roll: boolean;
    export_resolution: string;
    priority_processing: boolean;
    analytics_access: boolean;
    custom_profiles: boolean;
  };
  expires_at: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function mapApiResponse(data: SubscriptionApiResponse): SubscriptionInfo {
  return {
    tier: data.tier as SubscriptionTier,
    billingCycle: data.billing_cycle as BillingCycle | null,
    status: data.status as any,
    isPremium: data.is_premium,
    monthlyCloakLimit: data.monthly_cloak_limit,
    remainingCloaks: data.remaining_cloaks,
    features: {
      strengthLevels: data.features.strength_levels,
      videoCloaking: data.features.video_cloaking,
      batchProcessing: data.features.batch_processing,
      autoCloakRoll: data.features.auto_cloak_roll,
      exportResolution: data.features.export_resolution,
      priorityProcessing: data.features.priority_processing,
      analyticsAccess: data.features.analytics_access,
      customProfiles: data.features.custom_profiles,
    },
    expiresAt: data.expires_at,
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch the current user's subscription details from the backend.
 */
export async function fetchSubscription(token: string): Promise<SubscriptionInfo> {
  const data = await apiRequest<SubscriptionApiResponse>('/api/v1/subscriptions/me', {
    token,
  });
  return mapApiResponse(data);
}

/**
 * Update subscription after a successful App Store purchase.
 *
 * In development, this can be called directly to simulate purchases.
 * In production, the backend would validate the App Store receipt.
 */
export async function updateSubscription(
  token: string,
  tier: SubscriptionTier,
  billingCycle: BillingCycle | null,
  appleTransactionId?: string,
): Promise<SubscriptionInfo> {
  const data = await apiRequest<SubscriptionApiResponse>('/api/v1/subscriptions/update', {
    method: 'POST',
    token,
    body: {
      tier,
      billing_cycle: billingCycle,
      apple_transaction_id: appleTransactionId ?? null,
    },
  });
  return mapApiResponse(data);
}

/**
 * Cancel the current subscription.
 */
export async function cancelSubscription(token: string): Promise<{ status: string; message: string; expires_at: string | null }> {
  return apiRequest('/api/v1/subscriptions/cancel', {
    method: 'POST',
    token,
  });
}

/**
 * Restore purchases — validates with Apple and restores subscription state.
 */
export async function restorePurchases(token: string): Promise<SubscriptionInfo> {
  const data = await apiRequest<SubscriptionApiResponse>('/api/v1/subscriptions/restore', {
    method: 'POST',
    token,
  });
  return mapApiResponse(data);
}
