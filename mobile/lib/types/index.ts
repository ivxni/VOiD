/**
 * VOiD - Core Type Definitions
 */

export interface User {
  id: string;
  email?: string;
  appleSubjectId: string;
  isPremium: boolean;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  billingCycle: BillingCycle | null;
  subscriptionExpiresAt: string | null;
  createdAt: string;
  lastLogin: string;
}

export type SubscriptionTier = 'free' | 'pro' | 'proplus';

export type BillingCycle = 'monthly' | 'yearly';

export type SubscriptionStatus =
  | 'active'
  | 'expired'
  | 'trial'
  | 'cancelled'
  | 'lifetime'
  | 'none';

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  billingCycle: BillingCycle | null;
  status: SubscriptionStatus;
  isPremium: boolean;
  monthlyCloakLimit: number;
  remainingCloaks: number;
  features: TierFeatures;
  expiresAt: string | null;
}

export interface TierFeatures {
  strengthLevels: string[];
  videoCloaking: boolean;
  batchProcessing: boolean;
  autoCloakRoll: boolean;
  exportResolution: string;
  priorityProcessing: boolean;
  analyticsAccess: boolean;
  customProfiles: boolean;
}

export interface CloakResult {
  /** URI to the cloaked image in local storage */
  uri: string;
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Strength of the perturbation applied (0-1) */
  strength: number;
  /** Original image dimensions */
  width: number;
  height: number;
}

export interface CloakSettings {
  /** Perturbation strength: 'subtle', 'standard', 'maximum' */
  strength: CloakStrength;
  /** Whether to preserve the original image alongside the cloaked version */
  keepOriginal: boolean;
  /** Auto-save cloaked images to camera roll */
  autoSave: boolean;
}

export type CloakStrength = 'subtle' | 'standard' | 'maximum';

export type CloakMode = 'photo' | 'video';

export interface VideoCloakResult {
  /** URI to the cloaked video in local storage */
  uri: string;
  /** Total processing time in milliseconds */
  processingTimeMs: number;
  /** Number of frames processed */
  framesProcessed: number;
  /** Video duration in seconds */
  durationSeconds: number;
  /** Strength of the perturbation applied (0-1) */
  strength: number;
}

export interface UsageLog {
  id: string;
  actionType: 'cloak_photo' | 'cloak_video' | 'save_gallery';
  timestamp: string;
}
