import { create } from 'zustand';

interface TemporaryFiltersState {
  filters: any;
  setFilters: (filters: any) => void;
  clearFilters: () => void;
  hasFilters: () => boolean;
}

export const useTemporaryFilters = create<TemporaryFiltersState>((set, get) => ({
  filters: null,
  setFilters: (filters) => set({ filters }),
  clearFilters: () => set({ filters: null }),
  hasFilters: () => get().filters !== null,
}));