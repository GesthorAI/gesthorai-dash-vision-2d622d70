import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NavigationState {
  currentPage: string;
  navigateToPage: (page: string) => void;
  applyFiltersAndNavigate: (page: string, filters: any) => void;
  pendingFilters: any;
  clearPendingFilters: () => void;
}

export const useNavigation = create<NavigationState>()(
  persist(
    (set, get) => ({
      currentPage: 'overview',
      pendingFilters: null,
      navigateToPage: (page) => set({ currentPage: page }),
      applyFiltersAndNavigate: (page, filters) => {
        set({ 
          currentPage: page,
          pendingFilters: filters 
        });
      },
      clearPendingFilters: () => set({ pendingFilters: null }),
    }),
    {
      name: 'navigation-state'
    }
  )
);