/**
 * VOiD — Cloaked Images Store
 *
 * Persists cloaked image history for the Gallery tab
 * and Recent Activity on the Home screen.
 */

import { create } from 'zustand';

export interface CloakedImage {
  id: string;
  originalUri: string;
  cloakedUri: string;
  analysisUri: string | null;
  timestamp: number;
  facesDetected: number;
  facesCloaked: number;
  strength: string;
  processingTimeMs: number;
  width: number;
  height: number;
  savedToGallery: boolean;
}

interface CloakStoreState {
  images: CloakedImage[];
  totalCloaked: number;
  totalSaved: number;

  addImage: (image: Omit<CloakedImage, 'id' | 'timestamp' | 'savedToGallery'>) => void;
  markSaved: (id: string) => void;
  removeImage: (id: string) => void;
  getRecentImages: (count: number) => CloakedImage[];
  getAverageTime: () => number;
}

export const useCloakStore = create<CloakStoreState>((set, get) => ({
  images: [],
  totalCloaked: 0,
  totalSaved: 0,

  addImage: (image) =>
    set((state) => ({
      images: [
        {
          ...image,
          id: `cloak_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          timestamp: Date.now(),
          savedToGallery: false,
        },
        ...state.images,
      ],
      totalCloaked: state.totalCloaked + 1,
    })),

  markSaved: (id) =>
    set((state) => ({
      images: state.images.map((img) =>
        img.id === id ? { ...img, savedToGallery: true } : img
      ),
      totalSaved: state.totalSaved + 1,
    })),

  removeImage: (id) =>
    set((state) => ({
      images: state.images.filter((img) => img.id !== id),
    })),

  getRecentImages: (count) => get().images.slice(0, count),

  getAverageTime: () => {
    const imgs = get().images;
    if (imgs.length === 0) return 0;
    const total = imgs.reduce((sum, img) => sum + img.processingTimeMs, 0);
    return Math.round(total / imgs.length);
  },
}));
