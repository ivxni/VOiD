import { create } from 'zustand';
import type { User, SubscriptionStatus } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  updateSubscription: (status: SubscriptionStatus) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) =>
    set({ user, isAuthenticated: true, isLoading: false }),

  setLoading: (isLoading) =>
    set({ isLoading }),

  updateSubscription: (status) =>
    set((state) => ({
      user: state.user
        ? { ...state.user, subscriptionStatus: status, isPremium: status === 'active' || status === 'lifetime' }
        : null,
    })),

  logout: () =>
    set({ user: null, isAuthenticated: false, isLoading: false }),
}));
