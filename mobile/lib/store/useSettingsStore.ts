/**
 * VOiD — Settings Store
 *
 * Persists cloak settings to AsyncStorage so they
 * survive app restarts.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CloakSettings, CloakStrength } from '../types';

interface SettingsState extends CloakSettings {
  setStrength: (strength: CloakStrength) => void;
  setKeepOriginal: (keep: boolean) => void;
  setAutoSave: (auto: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      strength: 'standard',
      keepOriginal: false,
      autoSave: true,

      setStrength: (strength) => set({ strength }),
      setKeepOriginal: (keepOriginal) => set({ keepOriginal }),
      setAutoSave: (autoSave) => set({ autoSave }),
    }),
    {
      name: 'void-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
