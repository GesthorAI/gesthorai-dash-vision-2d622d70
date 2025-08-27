import { useLeadsWithRealtime } from "@/hooks/useLeads";
import { LeadsTable } from "@/components/Leads/LeadsTable";
import { useFilters } from "@/hooks/useFilters";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

export const LeadsTableWithData = () => {
  const globalFilters = useFilters();
  
  // Build final filters for leads query
  const finalFilters = {
    status: globalFilters.status,
    niche: globalFilters.selectedNiche,
    city: globalFilters.selectedCity,
    scoreMin: globalFilters.scoreRange?.[0],
    scoreMax: globalFilters.scoreRange?.[1],
    searchTerm: globalFilters.searchTerm,
    hasPhone: globalFilters.hasPhone,
    hasEmail: globalFilters.hasEmail,
    whatsappVerified: globalFilters.whatsappVerified,
    archived: globalFilters.archived,
    assignedTo: globalFilters.assignedTo,
    sources: globalFilters.sources,
    fromDate: globalFilters.customDateRange?.from?.toISOString(),
    toDate: globalFilters.customDateRange?.to?.toISOString(),
  };

  const { data: leads = [], isLoading, refetch } = useLeadsWithRealtime(finalFilters);

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-32">
          <p>Carregando leads...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active filters display */}
      {globalFilters.getActiveFiltersCount() > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="font-medium">Filtros aplicados:</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => globalFilters.clearFilters()}
            >
              <X className="h-4 w-4 mr-1" />
              Limpar filtros
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {globalFilters.selectedNiche && (
              <Badge variant="secondary">Nicho: {globalFilters.selectedNiche}</Badge>
            )}
            {globalFilters.selectedCity && (
              <Badge variant="secondary">Cidade: {globalFilters.selectedCity}</Badge>
            )}
            {globalFilters.status && (
              <Badge variant="secondary">Status: {globalFilters.status}</Badge>
            )}
            {globalFilters.scoreRange && (globalFilters.scoreRange[0] > 0 || globalFilters.scoreRange[1] < 10) && (
              <Badge variant="secondary">
                Score: {globalFilters.scoreRange[0]} - {globalFilters.scoreRange[1]}
              </Badge>
            )}
            {globalFilters.searchTerm && (
              <Badge variant="secondary">Busca: {globalFilters.searchTerm}</Badge>
            )}
            {globalFilters.hasPhone === true && (
              <Badge variant="secondary">Com telefone</Badge>
            )}
            {globalFilters.hasPhone === false && (
              <Badge variant="secondary">Sem telefone</Badge>
            )}
            {globalFilters.hasEmail === true && (
              <Badge variant="secondary">Com email</Badge>
            )}
            {globalFilters.hasEmail === false && (
              <Badge variant="secondary">Sem email</Badge>
            )}
            {globalFilters.archived === true && (
              <Badge variant="secondary">Arquivados</Badge>
            )}
            {globalFilters.archived === false && (
              <Badge variant="secondary">Ativos</Badge>
            )}
          </div>
        </Card>
      )}
      
      <LeadsTable leads={leads} onLeadsChange={refetch} />
    </div>
  );
};