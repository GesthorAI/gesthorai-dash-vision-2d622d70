import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FilterState {
  selectedNiche?: string;
  selectedCity?: string;
  dateRange: number; // days
  status?: string;
  setNiche: (niche?: string) => void;
  setCity: (city?: string) => void;
  setDateRange: (days: number) => void;
  setStatus: (status?: string) => void;
  clearFilters: () => void;
}

export const useFilters = create<FilterState>()(
  persist(
    (set) => ({
      dateRange: 30,
      setNiche: (niche) => set({ selectedNiche: niche }),
      setCity: (city) => set({ selectedCity: city }),
      setDateRange: (days) => set({ dateRange: days }),
      setStatus: (status) => set({ status }),
      clearFilters: () => set({ 
        selectedNiche: undefined,
        selectedCity: undefined,
        dateRange: 30,
        status: undefined
      }),
    }),
    {
      name: 'dashboard-filters'
    }
  )
);