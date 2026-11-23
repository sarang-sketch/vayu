/**
 * Global client state (zustand + localStorage persistence).
 * Holds the household profile and the adopted-swap impact ledger.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Persona } from '@vayusense/shared';

export interface AdoptedSwap {
  quantityPerDay: number;
  daysPerWeek: number;
}

interface AppState {
  persona: Persona;
  city: string;
  coords: { lat: number; lng: number };
  locale: 'en' | 'hi';
  adoptedSwaps: Record<string, AdoptedSwap>;
  setPersona: (persona: Persona) => void;
  setCity: (city: string) => void;
  setCoords: (coords: { lat: number; lng: number }) => void;
  setLocale: (locale: 'en' | 'hi') => void;
  adoptSwap: (swapId: string, swap: AdoptedSwap) => void;
  removeSwap: (swapId: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      persona: 'family_kids',
      city: 'New Delhi',
      coords: { lat: 28.6139, lng: 77.209 },
      locale: 'en',
      adoptedSwaps: {},
      setPersona: (persona) => set({ persona }),
      setCity: (city) => set({ city }),
      setCoords: (coords) => set({ coords }),
      setLocale: (locale) => set({ locale }),
      adoptSwap: (swapId, swap) =>
        set((state) => ({ adoptedSwaps: { ...state.adoptedSwaps, [swapId]: swap } })),
      removeSwap: (swapId) =>
        set((state) => {
          const next = { ...state.adoptedSwaps };
          delete next[swapId];
          return { adoptedSwaps: next };
        }),
    }),
    {
      name: 'vayusense-profile',
      partialize: (state) => ({
        persona: state.persona,
        city: state.city,
        coords: state.coords,
        locale: state.locale,
        adoptedSwaps: state.adoptedSwaps,
      }),
    },
  ),
);
