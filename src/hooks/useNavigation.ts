import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useNavigate } from 'react-router-dom';

interface NavigationState {
  currentPage: string;
  navigateToPage: (page: string) => void;
  applyFiltersAndNavigate: (page: string, options: any) => void;
  pendingFilters: any;
  clearPendingFilters: () => void;
}

export const useNavigation = create<NavigationState>()(
  persist(
    (set, get) => ({
      currentPage: 'overview',
      pendingFilters: null,
      navigateToPage: (page) => set({ currentPage: page }),
      applyFiltersAndNavigate: (page, options) => {
        set({ 
          currentPage: page,
          pendingFilters: options 
        });
        // Navigation will be handled by the component using this hook
      },
      clearPendingFilters: () => set({ pendingFilters: null }),
    }),
    {
      name: 'navigation-state'
    }
  )
);