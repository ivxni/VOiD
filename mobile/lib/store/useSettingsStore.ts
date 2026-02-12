import { create } from 'zustand';
import type { CloakSettings, CloakStrength } from '../types';

interface SettingsState extends CloakSettings {
  setStrength: (strength: CloakStrength) => void;
  setKeepOriginal: (keep: boolean) => void;
  setAutoSave: (auto: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  strength: 'standard',
  keepOriginal: false,
  autoSave: true,

  setStrength: (strength) => set({ strength }),
  setKeepOriginal: (keepOriginal) => set({ keepOriginal }),
  setAutoSave: (autoSave) => set({ autoSave }),
}));
