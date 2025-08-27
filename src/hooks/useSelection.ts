import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Lead } from './useLeads';

interface SelectionState {
  selectedLeads: Lead[];
  selectedLeadIds: string[];
  setSelectedLeads: (leads: Lead[]) => void;
  addLead: (lead: Lead) => void;
  removeLead: (leadId: string) => void;
  clearSelection: () => void;
  isSelected: (leadId: string) => boolean;
  toggleLead: (lead: Lead) => void;
}

export const useSelection = create<SelectionState>()(
  persist(
    (set, get) => ({
      selectedLeads: [],
      selectedLeadIds: [],
      
      setSelectedLeads: (leads) => set({ 
        selectedLeads: leads,
        selectedLeadIds: leads.map(l => l.id)
      }),
      
      addLead: (lead) => {
        const { selectedLeads, selectedLeadIds } = get();
        if (!selectedLeadIds.includes(lead.id)) {
          set({
            selectedLeads: [...selectedLeads, lead],
            selectedLeadIds: [...selectedLeadIds, lead.id]
          });
        }
      },
      
      removeLead: (leadId) => {
        const { selectedLeads } = get();
        set({
          selectedLeads: selectedLeads.filter(l => l.id !== leadId),
          selectedLeadIds: selectedLeads.filter(l => l.id !== leadId).map(l => l.id)
        });
      },
      
      clearSelection: () => set({ 
        selectedLeads: [], 
        selectedLeadIds: [] 
      }),
      
      isSelected: (leadId) => get().selectedLeadIds.includes(leadId),
      
      toggleLead: (lead) => {
        const { isSelected, addLead, removeLead } = get();
        if (isSelected(lead.id)) {
          removeLead(lead.id);
        } else {
          addLead(lead);
        }
      }
    }),
    {
      name: 'lead-selection-store'
    }
  )
);