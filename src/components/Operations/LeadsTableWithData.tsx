import { useLeadsWithRealtime } from "@/hooks/useLeads";
import { LeadsTable } from "@/components/Leads/LeadsTable";
import { useFilters } from "@/hooks/useFilters";
import { useTemporaryFilters } from "@/hooks/useTemporaryFilters";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

export const LeadsTableWithData = () => {
  const filters = useFilters();
  const { filters: tempFilters, clearFilters: clearTempFilters, hasFilters: hasTempFilters } = useTemporaryFilters();
  
  // Merge normal filters with temporary filters
  const finalFilters = tempFilters ? {
    ...filters,
    ...tempFilters
  } : {
    dateRange: filters.dateRange,
    selectedNiche: filters.selectedNiche,
    selectedCity: filters.selectedCity,
    status: filters.status
  };

  const { data: leads = [], isLoading, refetch } = useLeadsWithRealtime(finalFilters);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-muted-foreground">Carregando leads...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hasTempFilters() && (
        <Card className="p-4 bg-accent/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">Filtros aplicados:</span>
              {tempFilters.score?.min && (
                <Badge variant="secondary">Score ≥ {tempFilters.score.min}</Badge>
              )}
              {tempFilters.dateRange && tempFilters.dateRange !== filters.dateRange && (
                <Badge variant="secondary">Últimos {tempFilters.dateRange} dias</Badge>
              )}
              {tempFilters.status && tempFilters.status !== filters.status && (
                <Badge variant="secondary">Status: {tempFilters.status}</Badge>
              )}
              {tempFilters.hasEmail === false && (
                <Badge variant="secondary">Sem email</Badge>
              )}
              {tempFilters.hasPhone === false && (
                <Badge variant="secondary">Sem telefone</Badge>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearTempFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          </div>
        </Card>
      )}
      
      <LeadsTable 
        leads={leads}
        onLeadsChange={() => refetch()}
        showActions={false}
      />
    </div>
  );
};