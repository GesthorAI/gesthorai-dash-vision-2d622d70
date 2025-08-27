import { useLeadsWithRealtime } from "@/hooks/useLeads";
import { useFilters } from "@/hooks/useFilters";
import { FilterBar } from "@/components/Filters/FilterBar";
import { AdvancedFilters } from "@/components/Filters/AdvancedFilters";
import { AdvancedAnalytics } from "@/components/Analytics/AdvancedAnalytics";
import { StatusWorkflow } from "@/components/Workflow/StatusWorkflow";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Analytics = () => {
  const { 
    selectedNiche, 
    selectedCity, 
    dateRange, 
    status 
  } = useFilters();
  
  const [advancedFilters, setAdvancedFilters] = useState<any>(null);
  
  // Combine basic and advanced filters
  const combinedFilters = {
    niche: selectedNiche,
    city: selectedCity,
    dateRange,
    status,
    ...advancedFilters
  };

  const { data: leads = [], isLoading } = useLeadsWithRealtime(combinedFilters);

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', leadId);

      if (error) throw error;
      
      toast.success(`Status atualizado para: ${newStatus}`);
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast.error('Erro ao atualizar status do lead');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Analítico</h1>
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Analítico Avançado</h1>
          <p className="text-muted-foreground">
            Análise completa de performance, trends e insights dos seus leads
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {leads.length} leads analisados
        </Badge>
      </div>

      {/* Global Filters */}
      <FilterBar />

      {/* Main Content Tabs */}
      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analytics">Analytics Avançado</TabsTrigger>
          <TabsTrigger value="workflow">Workflow & Status</TabsTrigger>
          <TabsTrigger value="filters">Filtros Avançados</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          <AdvancedAnalytics leads={leads} />
        </TabsContent>

        <TabsContent value="workflow" className="space-y-6">
          <StatusWorkflow 
            leads={leads} 
            onStatusChange={handleStatusChange}
          />
        </TabsContent>

        <TabsContent value="filters" className="space-y-6">
          <AdvancedFilters onFiltersChange={setAdvancedFilters} />
          
          {/* Preview of filtered results */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Resultados dos Filtros</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{leads.length}</p>
                <p className="text-sm text-muted-foreground">Total de Leads</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {leads.filter(l => l.score >= 8).length}
                </p>
                <p className="text-sm text-muted-foreground">Alta Qualidade</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {leads.filter(l => l.status === 'convertido').length}
                </p>
                <p className="text-sm text-muted-foreground">Convertidos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {leads.filter(l => l.phone && l.email).length}
                </p>
                <p className="text-sm text-muted-foreground">Contato Completo</p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};