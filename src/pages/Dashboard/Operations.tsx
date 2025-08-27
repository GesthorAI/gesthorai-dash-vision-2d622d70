import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BulkActionsPanel } from "@/components/Operations/BulkActionsPanel";
import { LeadsTableWithData } from "@/components/Operations/LeadsTableWithData";
import { WorkflowAutomation } from "@/components/Operations/WorkflowAutomation";
import { LeadAssignment } from "@/components/Operations/LeadAssignment";
import { FollowupWizard } from "@/components/Followups/FollowupWizard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLeads } from "@/hooks/useLeads";
import { useTemporaryFilters } from "@/hooks/useTemporaryFilters";
import { useNavigation } from "@/hooks/useNavigation";
import { 
  Users, 
  Clock,
  TrendingUp,
  Target,
  Filter,
  X,
  Settings,
  Zap,
  UserPlus,
  MessageSquare,
  Send
} from "lucide-react";

export const Operations = () => {
  const [activeTab, setActiveTab] = useState("acoes-lote");
  const [showFollowupWizard, setShowFollowupWizard] = useState(false);
  const { filters: temporaryFilters, clearFilters: clearTemporaryFilters } = useTemporaryFilters();
  
  const { data: leads = [] } = useLeads(temporaryFilters);

  const hasTemporaryFilters = temporaryFilters && Object.keys(temporaryFilters).length > 0;

  const handleActionCardClick = (filters: any) => {
    // Apply filters and switch to bulk actions tab
    // This will be implemented with the temporary filters hook
    setActiveTab("acoes-lote");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Operacional</h1>
        <p className="text-muted-foreground">
          Centro de operações para gestão eficiente de leads e automação
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="acoes-lote">Ações em Lote</TabsTrigger>
          <TabsTrigger value="automacao">Automação</TabsTrigger>
          <TabsTrigger value="equipe">Equipe</TabsTrigger>
          <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="acoes-lote" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Ações Prioritárias</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFollowupWizard(true)}
                    className="gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Criar Follow-up
                  </Button>
                  {hasTemporaryFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearTemporaryFilters}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Limpar Filtros
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleActionCardClick({ status: 'novo', dateRange: 1 })}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <h3 className="font-medium">Contato Inicial</h3>
                    </div>
                    <Badge variant="destructive">Alta</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">Leads novos nas últimas 24h</p>
                  <div className="text-2xl font-bold">{leads.filter(l => l.status === 'novo').length}</div>
                </Card>

                <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleActionCardClick({ scoreMin: 5, dateRange: 7 })}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <h3 className="font-medium">Follow-up</h3>
                    </div>
                    <Badge variant="destructive">Alta</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">Leads qualificados sem contato</p>
                  <div className="text-2xl font-bold">{leads.filter(l => (l.score || 0) >= 5).length}</div>
                </Card>

                <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleActionCardClick({ scoreMin: 8, dateRange: 7 })}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      <h3 className="font-medium">Priorizar</h3>
                    </div>
                    <Badge variant="secondary">Média</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">Leads de alta qualidade</p>
                  <div className="text-2xl font-bold">{leads.filter(l => (l.score || 0) >= 8).length}</div>
                </Card>
              </div>

              {hasTemporaryFilters && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-primary" />
                    <span className="font-medium">Filtros aplicados:</span>
                    {Object.entries(temporaryFilters).map(([key, value]) => (
                      <Badge key={key} variant="outline" className="text-xs">
                        {key}: {String(value)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <LeadsTableWithData />
          <BulkActionsPanel 
            selectedLeads={[]}
            onClearSelection={() => {}}
          />
        </TabsContent>

        <TabsContent value="automacao" className="space-y-6">
          <WorkflowAutomation />
        </TabsContent>

        <TabsContent value="equipe" className="space-y-6">
          <LeadAssignment />
        </TabsContent>

        <TabsContent value="configuracoes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações Operacionais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Configurações avançadas em desenvolvimento...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Follow-up Wizard Dialog */}
      <Dialog open={showFollowupWizard} onOpenChange={setShowFollowupWizard}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <FollowupWizard onClose={() => setShowFollowupWizard(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};