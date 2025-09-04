import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useWorkflows, useToggleWorkflow, useCreateWorkflow } from "@/hooks/useWorkflows";
import { useLeads, updateLeadStatus } from "@/hooks/useLeads";
import { useCreateTask } from "@/hooks/useTasks";
import { WorkflowCreator } from "./WorkflowCreator";
import { supabase } from "@/integrations/supabase/client";
import { 
  Zap, 
  Plus, 
  Settings, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Mail,
  Phone,
  Target,
  Filter,
  ArrowRight,
  Play
} from "lucide-react";

export const WorkflowAutomation = () => {
  const [showNewWorkflow, setShowNewWorkflow] = useState(false);
  const [executingWorkflow, setExecutingWorkflow] = useState<string | null>(null);
  
  const { data: workflows = [] } = useWorkflows();
  const toggleWorkflow = useToggleWorkflow();
  const createWorkflow = useCreateWorkflow();
  const { data: allLeads } = useLeads();
  const createTask = useCreateTask();
  const { toast } = useToast();

  const handleToggleWorkflow = async (id: string) => {
    try {
      await toggleWorkflow.mutateAsync(id);
      toast({
        title: "Workflow atualizado",
        description: "Status do workflow foi alterado com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status do workflow",
        variant: "destructive"
      });
    }
  };

  const executeWorkflow = async (workflowId: string) => {
    setExecutingWorkflow(workflowId);
    
    try {
      const workflow = workflows.find(w => w.id === workflowId);
      if (!workflow || !workflow.is_active) return;

      // Filter leads based on workflow conditions
      let matchingLeads = allLeads || [];
      
      // Apply workflow conditions
      workflow.conditions.forEach(condition => {
        const conditionObj = condition as any;
        matchingLeads = matchingLeads.filter(lead => {
          switch (conditionObj.field) {
            case 'score':
              return conditionObj.operator === 'gte' ? 
                (lead.score || 0) >= parseInt(conditionObj.value) :
                (lead.score || 0) <= parseInt(conditionObj.value);
            case 'status':
              return conditionObj.operator === 'eq' ? 
                lead.status === conditionObj.value : 
                lead.status !== conditionObj.value;
            default:
              return true;
          }
        });
      });

      // Execute workflow actions
      let actionsCount = 0;
      for (const action of workflow.actions) {
        const actionObj = action as any;
        
        for (const lead of matchingLeads) {
          try {
            switch (actionObj.type) {
              case 'update_status':
                // Use the updateLeadStatus function directly
                const updateResult = await supabase
                  .from('leads')
                  .update({ status: actionObj.value })
                  .eq('id', lead.id);
                
                if (updateResult.error) throw updateResult.error;
                actionsCount++;
                break;
                
              case 'schedule_task':
                await createTask.mutateAsync({
                  title: `${actionObj.value} - ${lead.name}`,
                  description: `Tarefa automática gerada pelo workflow: ${workflow.name}`,
                  type: 'follow_up',
                  priority: 'media',
                  due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                  lead_id: lead.id
                });
                actionsCount++;
                break;
            }
          } catch (error) {
            console.error(`Erro ao executar ação para lead ${lead.id}:`, error);
          }
        }
      }

      toast({
        title: "Workflow executado",
        description: `${actionsCount} ações foram executadas para ${matchingLeads.length} leads`,
      });
      
    } catch (error) {
      console.error('Erro ao executar workflow:', error);
      toast({
        title: "Erro",
        description: "Não foi possível executar o workflow",
        variant: "destructive"
      });
    } finally {
      setExecutingWorkflow(null);
    }
  };

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'score_threshold': return <Target className="h-4 w-4" />;
      case 'status_change': return <CheckCircle className="h-4 w-4" />;
      case 'time_based': return <Clock className="h-4 w-4" />;
      case 'source': return <Filter className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const getTriggerLabel = (type: string, value: string) => {
    switch (type) {
      case 'score_threshold': return `Score ≥ ${value}`;
      case 'status_change': return `Status = ${value}`;
      case 'time_based': return `Após ${value}`;
      case 'source': return `Fonte = ${value}`;
      default: return 'Gatilho desconhecido';
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'assign_user': return <Users className="h-3 w-3" />;
      case 'update_status': return <CheckCircle className="h-3 w-3" />;
      case 'send_email': return <Mail className="h-3 w-3" />;
      case 'schedule_task': return <Clock className="h-3 w-3" />;
      default: return <Zap className="h-3 w-3" />;
    }
  };

  const getActionLabel = (type: string, value: string) => {
    switch (type) {
      case 'assign_user': return `Atribuir para ${value}`;
      case 'update_status': return `Status → ${value}`;
      case 'send_email': return `Email: ${value}`;
      case 'schedule_task': return `Tarefa: ${value}`;
      default: return 'Ação desconhecida';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Automação de Workflows</h2>
          <p className="text-muted-foreground">
            Configure regras automáticas para otimizar o processamento de leads
          </p>
        </div>
        <Button onClick={() => setShowNewWorkflow(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Workflow
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-green-600">
              {workflows.filter(w => w.is_active).length}
            </div>
            <p className="text-sm text-muted-foreground">Workflows Ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {workflows.reduce((acc, w) => acc + (Array.isArray(w.actions) ? w.actions.length : 0), 0)}
            </div>
            <p className="text-sm text-muted-foreground">Ações Configuradas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {allLeads?.length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Total de Leads</p>
          </CardContent>
        </Card>
      </div>

      {/* Workflow List */}
      <div className="space-y-4">
        {workflows.map((workflow) => (
          <Card key={workflow.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getTriggerIcon(workflow.trigger_type)}
                    <CardTitle className="text-lg">{workflow.name}</CardTitle>
                  </div>
                  <Badge variant={workflow.is_active ? "default" : "secondary"}>
                    {workflow.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => executeWorkflow(workflow.id)}
                    disabled={!workflow.is_active || executingWorkflow === workflow.id}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    {executingWorkflow === workflow.id ? 'Executando...' : 'Executar'}
                  </Button>
                  <Switch
                    checked={workflow.is_active}
                    onCheckedChange={() => handleToggleWorkflow(workflow.id)}
                    disabled={toggleWorkflow.isPending}
                  />
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Trigger */}
                <div>
                  <Label className="text-sm font-medium">Gatilho</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {getTriggerIcon(workflow.trigger_type)}
                    <span className="text-sm">
                      {getTriggerLabel(workflow.trigger_type, workflow.trigger_config?.value || '')}
                    </span>
                  </div>
                </div>

                {/* Conditions */}
                {Array.isArray(workflow.conditions) && workflow.conditions.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Condições</Label>
                    <div className="space-y-1 mt-1">
                      {workflow.conditions.map((condition: any, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Filter className="h-3 w-3" />
                          <span>
                            {condition.field} {condition.operator} {condition.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Actions */}
                <div>
                  <Label className="text-sm font-medium">Ações</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {Array.isArray(workflow.actions) && workflow.actions.map((action: any, index) => (
                      <Badge key={index} variant="outline" className="text-xs gap-1">
                        {getActionIcon(action.type)}
                        {getActionLabel(action.type, action.value)}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Setup Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Templates Rápidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Button variant="outline" className="h-auto p-4 justify-start">
              <div className="text-left">
                <div className="font-medium">Priorização por Score</div>
                <div className="text-sm text-muted-foreground">
                  Automatizar atribuição baseada na qualidade do lead
                </div>
              </div>
            </Button>
            <Button variant="outline" className="h-auto p-4 justify-start">
              <div className="text-left">
                <div className="font-medium">Nutrição Automática</div>
                <div className="text-sm text-muted-foreground">
                  Sequência de emails para leads não contactados
                </div>
              </div>
            </Button>
            <Button variant="outline" className="h-auto p-4 justify-start">
              <div className="text-left">
                <div className="font-medium">Escalação por Tempo</div>
                <div className="text-sm text-muted-foreground">
                  Reatribuir leads sem resposta após período definido
                </div>
              </div>
            </Button>
            <Button variant="outline" className="h-auto p-4 justify-start">
              <div className="text-left">
                <div className="font-medium">Segmentação por Fonte</div>
                <div className="text-sm text-muted-foreground">
                  Diferentes abordagens por canal de aquisição
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Creator Dialog */}
      <Dialog open={showNewWorkflow} onOpenChange={setShowNewWorkflow}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Workflow</DialogTitle>
            <DialogDescription>
              Configure regras automáticas e ações para otimizar o processamento de leads
            </DialogDescription>
          </DialogHeader>
          <WorkflowCreator onClose={() => setShowNewWorkflow(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};