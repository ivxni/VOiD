/**
 * VOiD — Auth Store
 *
 * Manages authentication state, JWT token persistence,
 * and Apple Sign-In API communication.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '../api/client';
import type { User, SubscriptionStatus, SubscriptionTier, BillingCycle } from '../types';

const TOKEN_KEY = 'void_auth_token';
const USER_KEY = 'void_auth_user';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (identityToken: string, email?: string | null) => Promise<void>;
  restoreSession: () => Promise<void>;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  updateSubscription: (
    tier: SubscriptionTier,
    status: SubscriptionStatus,
    billingCycle: BillingCycle | null,
    expiresAt: string | null,
  ) => void;
  logout: () => void;
}

interface AuthApiResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    email: string | null;
    is_premium: boolean;
    subscription_tier: string;
    subscription_status: string;
    billing_cycle: string | null;
    subscription_expires_at: string | null;
    created_at: string;
    last_login: string | null;
  };
}

function mapApiUser(raw: AuthApiResponse['user']): User {
  return {
    id: raw.id,
    email: raw.email ?? undefined,
    appleSubjectId: '', // Not returned from API
    isPremium: raw.is_premium,
    subscriptionTier: (raw.subscription_tier || 'free') as SubscriptionTier,
    subscriptionStatus: (raw.subscription_status || 'none') as SubscriptionStatus,
    billingCycle: (raw.billing_cycle || null) as BillingCycle | null,
    subscriptionExpiresAt: raw.subscription_expires_at || null,
    createdAt: raw.created_at,
    lastLogin: raw.last_login || raw.created_at,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  /**
   * Send Apple identity token to backend, receive JWT + user.
   */
  login: async (identityToken: string, email?: string | null) => {
    try {
      const response = await apiRequest<AuthApiResponse>('/api/v1/auth/apple', {
        method: 'POST',
        body: {
          identity_token: identityToken,
          email: email || null,
        },
      });

      const user = mapApiUser(response.user);
      const token = response.access_token;

      // Persist to AsyncStorage
      await AsyncStorage.multiSet([
        [TOKEN_KEY, token],
        [USER_KEY, JSON.stringify(user)],
      ]);

      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('[Auth] Login failed:', error);
      throw error;
    }
  },

  /**
   * Restore session from AsyncStorage on app launch.
   */
  restoreSession: async () => {
    try {
      const [[, token], [, userJson]] = await AsyncStorage.multiGet([TOKEN_KEY, USER_KEY]);

      if (token && userJson) {
        const user = JSON.parse(userJson) as User;
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      }
    } catch (error) {
      console.error('[Auth] Restore session failed:', error);
    }

    set({ isLoading: false });
  },

  setUser: (user) =>
    set({ user, isAuthenticated: true, isLoading: false }),

  setLoading: (isLoading) =>
    set({ isLoading }),

  updateSubscription: (tier, status, billingCycle, expiresAt) =>
    set((state) => {
      const updatedUser = state.user
        ? {
            ...state.user,
            subscriptionTier: tier,
            subscriptionStatus: status,
            billingCycle,
            subscriptionExpiresAt: expiresAt,
            isPremium: tier !== 'free' && (status === 'active' || status === 'trial'),
          }
        : null;

      // Persist updated user
      if (updatedUser) {
        AsyncStorage.setItem(USER_KEY, JSON.stringify(updatedUser)).catch(() => {});
      }

      return { user: updatedUser };
    }),

  logout: async () => {
    try {
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY, 'void_onboarding_complete']);
    } catch {
      // Ignore storage errors on logout
    }
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },
}));
