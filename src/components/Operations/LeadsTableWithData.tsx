import { useLeadsWithRealtime } from "@/hooks/useLeads";
import { LeadsTable } from "@/components/Leads/LeadsTable";
import { useFilters } from "@/hooks/useFilters";
import { useNavigation } from "@/hooks/useNavigation";
import { useEffect } from "react";

export const LeadsTableWithData = () => {
  const filters = useFilters();
  const { pendingFilters, clearPendingFilters } = useNavigation();
  
  // Apply filters from navigation if present
  const appliedFilters = pendingFilters?.filters || {
    dateRange: filters.dateRange,
    selectedNiche: filters.selectedNiche,
    selectedCity: filters.selectedCity,
    status: filters.status
  };

  const { data: leads = [], isLoading, refetch } = useLeadsWithRealtime(appliedFilters);

  // Clear pending filters after applying them
  useEffect(() => {
    if (pendingFilters) {
      clearPendingFilters();
    }
  }, [pendingFilters, clearPendingFilters]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-muted-foreground">Carregando leads...</div>
      </div>
    );
  }

  return (
    <LeadsTable 
      leads={leads}
      onLeadsChange={() => refetch()}
      showActions={false}
    />
  );
};