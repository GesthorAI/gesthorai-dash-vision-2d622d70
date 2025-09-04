import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUISettings } from "@/hooks/useUISettings";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BulkActionsPanel } from "@/components/Operations/BulkActionsPanel";
import { LeadAssignment } from "@/components/Operations/LeadAssignment";
import { WorkflowAutomation } from "@/components/Operations/WorkflowAutomation";
import { FollowupWizard } from "@/components/Followups/FollowupWizard";
import { AdvancedFilters } from "@/components/Filters/AdvancedFilters";
import { LeadsTableWithData } from "@/components/Operations/LeadsTableWithData";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLeadsWithRealtime } from "@/hooks/useLeads";
import { useFilters } from "@/hooks/useFilters";
import { useNavigation } from "@/hooks/useNavigation";
import { useSelection } from "@/hooks/useSelection";
import { PlayCircle, Users, Settings, MessageSquare, Filter, X } from "lucide-react";
import { WhatsAppConnectDialog } from "@/components/WhatsApp/WhatsAppConnectDialog";

const Operations = () => {
  const [activeTab, setActiveTab] = useState("team");
  const [showFollowupWizard, setShowFollowupWizard] = useState(false);
  const { settings } = useUISettings();
  const globalFilters = useFilters();
  const { pendingFilters, clearPendingFilters } = useNavigation();
  const { selectedLeads, clearSelection } = useSelection();

  // Get visible tabs based on settings
  const visibleTabs = [
    { id: 'bulk', show: settings.operationsTabsVisibility.showBulk },
    { id: 'automation', show: settings.operationsTabsVisibility.showAutomation },
    { id: 'team', show: settings.operationsTabsVisibility.showTeam },
    { id: 'settings', show: settings.operationsTabsVisibility.showSettings },
  ].filter(tab => tab.show);

  // Ensure active tab is visible, switch to first visible if not
  useEffect(() => {
    if (!visibleTabs.some(tab => tab.id === activeTab)) {
      const firstVisible = visibleTabs[0]?.id;
      if (firstVisible) {
        setActiveTab(firstVisible);
      }
    }
  }, [activeTab, visibleTabs]);

  // Apply pending filters from navigation
  useEffect(() => {
    if (pendingFilters) {
      const { filterType, ...filters } = pendingFilters;
      
      if (filterType === 'high_score' && filters.scoreMin) {
        globalFilters.setScoreRange([filters.scoreMin, 10]);
      } else if (filterType === 'recent_leads' && filters.dateRange) {
        globalFilters.setDateRange(filters.dateRange);
      } else if (filterType === 'search_results' && filters.searchId) {
        globalFilters.setSearchId(filters.searchId);
      }
      
      clearPendingFilters();
      setActiveTab("bulk");
    }
  }, [pendingFilters, globalFilters, clearPendingFilters]);

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
    searchId: globalFilters.searchId,
  };

  const { data: leads = [], isLoading, refetch } = useLeadsWithRealtime(finalFilters);

  const handleActionCardClick = (action: string) => {
    switch (action) {
      case "initial_contact":
        globalFilters.setStatus("novo");
        break;
      case "followup":
        globalFilters.setStatus("contatado");
        break;
      case "prioritize":
        globalFilters.setScoreRange([7, 10]);
        break;
    }
  };

  const getActiveFiltersCount = () => globalFilters.getActiveFiltersCount();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Operações</h1>
          <p className="text-muted-foreground">
            Gerencie leads em lote, configure automações e gerencie sua equipe
          </p>
        </div>
        <Button onClick={() => setShowFollowupWizard(true)} className="gap-2">
          <MessageSquare className="h-4 w-4" />
          Novo Follow-up
        </Button>
      </div>

      {/* Global Filters */}
      <AdvancedFilters onFiltersChange={() => refetch()} />

      {/* Show active filters summary */}
      {getActiveFiltersCount() > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filtros Ativos:</span>
              <Badge variant="secondary">
                {getActiveFiltersCount()} filtro(s) aplicado(s)
              </Badge>
              <Badge variant="outline">
                {leads.length} lead(s) encontrado(s)
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={() => globalFilters.clearFilters()}>
              <X className="h-3 w-3 mr-1" />
              Limpar Filtros
            </Button>
          </div>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`grid w-full grid-cols-${visibleTabs.length}`}>
          {settings.operationsTabsVisibility.showBulk && (
            <TabsTrigger value="bulk" className="gap-2">
              <PlayCircle className="h-4 w-4" />
              Ações em Lote
            </TabsTrigger>
          )}
          {settings.operationsTabsVisibility.showAutomation && (
            <TabsTrigger value="automation" className="gap-2">
              <Settings className="h-4 w-4" />
              Automação
            </TabsTrigger>
          )}
          {settings.operationsTabsVisibility.showTeam && (
            <TabsTrigger value="team" className="gap-2">
              <Users className="h-4 w-4" />
              Equipe
            </TabsTrigger>
          )}
          {settings.operationsTabsVisibility.showSettings && (
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </TabsTrigger>
          )}
        </TabsList>

        {settings.operationsTabsVisibility.showBulk && (
          <TabsContent value="bulk" className="space-y-6">
            {/* Priority Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" 
                    onClick={() => handleActionCardClick("initial_contact")}>
                <h3 className="font-semibold text-blue-600">Contato Inicial</h3>
                <p className="text-sm text-muted-foreground">Leads novos aguardando primeiro contato</p>
                <div className="mt-2 text-lg font-bold">
                  {leads.filter(l => l.status === 'novo').length}
                </div>
              </Card>
              
              <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" 
                    onClick={() => handleActionCardClick("followup")}>
                <h3 className="font-semibold text-yellow-600">Follow-up</h3>
                <p className="text-sm text-muted-foreground">Leads contatados precisando de follow-up</p>
                <div className="mt-2 text-lg font-bold">
                  {leads.filter(l => l.status === 'contatado').length}
                </div>
              </Card>
              
              <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" 
                    onClick={() => handleActionCardClick("prioritize")}>
                <h3 className="font-semibold text-green-600">Priorizar</h3>
                <p className="text-sm text-muted-foreground">Leads com score alto (7+)</p>
                <div className="mt-2 text-lg font-bold">
                  {leads.filter(l => l.score >= 7).length}
                </div>
              </Card>
            </div>

            {/* Selection Summary */}
            {selectedLeads.length > 0 && (
              <Card className="p-4 border-blue-200 bg-blue-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{selectedLeads.length} lead(s) selecionado(s)</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={clearSelection}>
                    <X className="h-3 w-3 mr-1" />
                    Limpar Seleção
                  </Button>
                </div>
              </Card>
            )}

            {/* Leads Table */}
            <LeadsTableWithData />

            {/* Bulk Actions */}
            <BulkActionsPanel 
              selectedLeads={selectedLeads} 
              onClearSelection={clearSelection}
            />
          </TabsContent>
        )}

        {settings.operationsTabsVisibility.showAutomation && (
          <TabsContent value="automation">
            <WorkflowAutomation />
          </TabsContent>
        )}

        {settings.operationsTabsVisibility.showTeam && (
          <TabsContent value="team">
            <LeadAssignment />
          </TabsContent>
        )}

        {settings.operationsTabsVisibility.showSettings && (
          <TabsContent value="settings">
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Integração WhatsApp</h3>
                <p className="text-muted-foreground mb-4">
                  Configure sua instância WhatsApp para envio automático de mensagens de follow-up.
                </p>
                <WhatsAppConnectDialog />
              </Card>
              
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Outras Configurações</h3>
                <p className="text-muted-foreground">
                  Configurações avançadas de operação em desenvolvimento...
                </p>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Follow-up Wizard Dialog */}
      <Dialog open={showFollowupWizard} onOpenChange={setShowFollowupWizard}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Follow-up</DialogTitle>
            <DialogDescription>
              Configure filtros, selecione templates de mensagem e envie follow-ups automatizados via WhatsApp
            </DialogDescription>
          </DialogHeader>
          <FollowupWizard onClose={() => setShowFollowupWizard(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Operations;