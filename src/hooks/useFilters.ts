import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FilterState {
  selectedNiche?: string;
  selectedCity?: string;
  dateRange: number; // days
  status?: string;
  scoreRange?: [number, number];
  hasPhone?: boolean | null;
  hasEmail?: boolean | null;
  whatsappVerified?: boolean | null;
  archived?: boolean | null;
  assignedTo?: string | null;
  sources?: string[];
  searchTerm?: string;
  customDateRange?: { from?: Date; to?: Date };
  setNiche: (niche?: string) => void;
  setCity: (city?: string) => void;
  setDateRange: (days: number) => void;
  setStatus: (status?: string) => void;
  setScoreRange: (range?: [number, number]) => void;
  setHasPhone: (value?: boolean | null) => void;
  setHasEmail: (value?: boolean | null) => void;
  setWhatsappVerified: (value?: boolean | null) => void;
  setArchived: (value?: boolean | null) => void;
  setAssignedTo: (memberId?: string | null) => void;
  setSources: (sources?: string[]) => void;
  setSearchTerm: (term?: string) => void;
  setCustomDateRange: (range?: { from?: Date; to?: Date }) => void;
  clearFilters: () => void;
  getActiveFiltersCount: () => number;
}

export const useFilters = create<FilterState>()(
  persist(
    (set, get) => ({
      dateRange: 30,
      setNiche: (niche) => set({ selectedNiche: niche }),
      setCity: (city) => set({ selectedCity: city }),
      setDateRange: (days) => set({ dateRange: days }),
      setStatus: (status) => set({ status }),
      setScoreRange: (range) => set({ scoreRange: range }),
      setHasPhone: (value) => set({ hasPhone: value }),
      setHasEmail: (value) => set({ hasEmail: value }),
      setWhatsappVerified: (value) => set({ whatsappVerified: value }),
      setArchived: (value) => set({ archived: value }),
      setAssignedTo: (memberId) => set({ assignedTo: memberId }),
      setSources: (sources) => set({ sources }),
      setSearchTerm: (term) => set({ searchTerm: term }),
      setCustomDateRange: (range) => set({ customDateRange: range }),
      clearFilters: () => set({ 
        selectedNiche: undefined,
        selectedCity: undefined,
        dateRange: 30,
        status: undefined,
        scoreRange: undefined,
        hasPhone: null,
        hasEmail: null,
        whatsappVerified: null,
        archived: null,
        assignedTo: null,
        sources: undefined,
        searchTerm: undefined,
        customDateRange: undefined
      }),
      getActiveFiltersCount: () => {
        const state = get();
        let count = 0;
        if (state.selectedNiche) count++;
        if (state.selectedCity) count++;
        if (state.status) count++;
        if (state.scoreRange && (state.scoreRange[0] > 0 || state.scoreRange[1] < 10)) count++;
        if (state.hasPhone !== null && state.hasPhone !== undefined) count++;
        if (state.hasEmail !== null && state.hasEmail !== undefined) count++;
        if (state.whatsappVerified !== null && state.whatsappVerified !== undefined) count++;
        if (state.archived !== null && state.archived !== undefined) count++;
        if (state.assignedTo) count++;
        if (state.sources?.length) count++;
        if (state.searchTerm) count++;
        if (state.customDateRange?.from || state.customDateRange?.to) count++;
        return count;
      },
    }),
    {
      name: 'dashboard-filters'
    }
  )
);