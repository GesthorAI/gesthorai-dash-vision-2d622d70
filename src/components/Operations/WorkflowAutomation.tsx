import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
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
  ArrowRight
} from "lucide-react";

interface WorkflowRule {
  id: string;
  name: string;
  isActive: boolean;
  trigger: {
    type: 'score_threshold' | 'status_change' | 'time_based' | 'source';
    value: string;
  };
  conditions: {
    field: string;
    operator: string;
    value: string;
  }[];
  actions: {
    type: 'assign_user' | 'update_status' | 'send_email' | 'schedule_task';
    value: string;
  }[];
}

export const WorkflowAutomation = () => {
  const [workflows, setWorkflows] = useState<WorkflowRule[]>([
    {
      id: '1',
      name: 'Leads de Alto Score',
      isActive: true,
      trigger: { type: 'score_threshold', value: '8' },
      conditions: [
        { field: 'score', operator: 'gte', value: '8' },
        { field: 'status', operator: 'eq', value: 'novo' }
      ],
      actions: [
        { type: 'assign_user', value: 'equipe-premium' },
        { type: 'update_status', value: 'prioridade-alta' }
      ]
    },
    {
      id: '2', 
      name: 'Follow-up Automático',
      isActive: true,
      trigger: { type: 'time_based', value: '3_days' },
      conditions: [
        { field: 'status', operator: 'eq', value: 'contatado' },
        { field: 'last_contact', operator: 'older_than', value: '3_days' }
      ],
      actions: [
        { type: 'schedule_task', value: 'follow_up_call' },
        { type: 'send_email', value: 'template_follow_up' }
      ]
    },
    {
      id: '3',
      name: 'Leads Sem Contato',
      isActive: false,
      trigger: { type: 'time_based', value: '24_hours' },
      conditions: [
        { field: 'status', operator: 'eq', value: 'novo' },
        { field: 'created_at', operator: 'older_than', value: '24_hours' }
      ],
      actions: [
        { type: 'update_status', value: 'pendente' },
        { type: 'assign_user', value: 'equipe-junior' }
      ]
    }
  ]);

  const [showNewWorkflow, setShowNewWorkflow] = useState(false);
  const { toast } = useToast();

  const toggleWorkflow = (id: string) => {
    setWorkflows(prev => 
      prev.map(w => 
        w.id === id ? { ...w, isActive: !w.isActive } : w
      )
    );
    
    const workflow = workflows.find(w => w.id === id);
    toast({
      title: workflow?.isActive ? "Workflow desativado" : "Workflow ativado",
      description: `"${workflow?.name}" foi ${workflow?.isActive ? 'desativado' : 'ativado'} com sucesso`,
    });
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
              {workflows.filter(w => w.isActive).length}
            </div>
            <p className="text-sm text-muted-foreground">Workflows Ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {workflows.reduce((acc, w) => acc + w.actions.length, 0)}
            </div>
            <p className="text-sm text-muted-foreground">Ações Configuradas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-purple-600">
              247
            </div>
            <p className="text-sm text-muted-foreground">Leads Processados (7d)</p>
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
                    {getTriggerIcon(workflow.trigger.type)}
                    <CardTitle className="text-lg">{workflow.name}</CardTitle>
                  </div>
                  <Badge variant={workflow.isActive ? "default" : "secondary"}>
                    {workflow.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={workflow.isActive}
                    onCheckedChange={() => toggleWorkflow(workflow.id)}
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
                    {getTriggerIcon(workflow.trigger.type)}
                    <span className="text-sm">
                      {getTriggerLabel(workflow.trigger.type, workflow.trigger.value)}
                    </span>
                  </div>
                </div>

                {/* Conditions */}
                {workflow.conditions.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Condições</Label>
                    <div className="space-y-1 mt-1">
                      {workflow.conditions.map((condition, index) => (
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
                    {workflow.actions.map((action, index) => (
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
    </div>
  );
};