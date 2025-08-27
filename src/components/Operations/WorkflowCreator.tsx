import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useCreateWorkflow } from "@/hooks/useWorkflows";
import { useTeamMembers } from "@/hooks/useTeam";
import { 
  X, 
  Plus, 
  Zap, 
  Target, 
  CheckCircle, 
  Clock, 
  Filter,
  Users,
  Mail,
  MessageSquare
} from "lucide-react";

interface WorkflowCreatorProps {
  onClose: () => void;
}

interface WorkflowCondition {
  field: string;
  operator: string;
  value: string;
}

interface WorkflowAction {
  type: string;
  value: string;
}

export const WorkflowCreator = ({ onClose }: WorkflowCreatorProps) => {
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState("");
  const [triggerValue, setTriggerValue] = useState("");
  const [conditions, setConditions] = useState<WorkflowCondition[]>([]);
  const [actions, setActions] = useState<WorkflowAction[]>([]);
  const [newCondition, setNewCondition] = useState<WorkflowCondition>({
    field: '',
    operator: '',
    value: ''
  });
  const [newAction, setNewAction] = useState<WorkflowAction>({
    type: '',
    value: ''
  });

  const { data: teamMembers = [] } = useTeamMembers();
  const createWorkflow = useCreateWorkflow();
  const { toast } = useToast();

  const triggerOptions = [
    { value: 'score_threshold', label: 'Score Alto', description: 'Quando lead atinge score específico' },
    { value: 'status_change', label: 'Mudança de Status', description: 'Quando status do lead muda' },
    { value: 'time_based', label: 'Baseado em Tempo', description: 'Após período específico' },
    { value: 'source', label: 'Fonte do Lead', description: 'Por canal de aquisição' }
  ];

  const conditionFields = [
    { value: 'score', label: 'Score' },
    { value: 'status', label: 'Status' },
    { value: 'niche', label: 'Nicho' },
    { value: 'source', label: 'Fonte' },
    { value: 'city', label: 'Cidade' }
  ];

  const operators = [
    { value: 'eq', label: 'Igual a' },
    { value: 'neq', label: 'Diferente de' },
    { value: 'gte', label: 'Maior ou igual' },
    { value: 'lte', label: 'Menor ou igual' },
    { value: 'contains', label: 'Contém' }
  ];

  const actionTypes = [
    { value: 'update_status', label: 'Alterar Status', icon: CheckCircle },
    { value: 'assign_user', label: 'Atribuir para Usuário', icon: Users },
    { value: 'schedule_task', label: 'Agendar Tarefa', icon: Clock },
    { value: 'send_email', label: 'Enviar Email', icon: Mail },
    { value: 'send_whatsapp', label: 'Enviar WhatsApp', icon: MessageSquare }
  ];

  const statusOptions = ['novo', 'contatado', 'qualificado', 'proposta', 'negociacao', 'fechado', 'perdido'];

  const addCondition = () => {
    if (newCondition.field && newCondition.operator && newCondition.value) {
      setConditions([...conditions, newCondition]);
      setNewCondition({ field: '', operator: '', value: '' });
    }
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const addAction = () => {
    if (newAction.type && newAction.value) {
      setActions([...actions, newAction]);
      setNewAction({ type: '', value: '' });
    }
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name || !triggerType || actions.length === 0) {
      toast({
        title: "Erro",
        description: "Preencha nome, gatilho e pelo menos uma ação",
        variant: "destructive"
      });
      return;
    }

    try {
      await createWorkflow.mutateAsync({
        name,
        trigger_type: triggerType,
        trigger_config: { value: triggerValue },
        conditions,
        actions,
        is_active: false
      });

      toast({
        title: "Workflow Criado",
        description: "Workflow foi criado com sucesso. Ative-o na lista para começar a usar.",
      });

      onClose();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar o workflow",
        variant: "destructive"
      });
    }
  };

  const getActionIcon = (type: string) => {
    const actionType = actionTypes.find(a => a.value === type);
    return actionType ? actionType.icon : Zap;
  };

  const getActionLabel = (type: string) => {
    const actionType = actionTypes.find(a => a.value === type);
    return actionType ? actionType.label : 'Ação';
  };

  const renderActionValueInput = () => {
    switch (newAction.type) {
      case 'update_status':
        return (
          <Select value={newAction.value} onValueChange={(value) => setNewAction({...newAction, value})}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(status => (
                <SelectItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'assign_user':
        return (
          <Select value={newAction.value} onValueChange={(value) => setNewAction({...newAction, value})}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o usuário" />
            </SelectTrigger>
            <SelectContent>
              {teamMembers.map(member => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      default:
        return (
          <Input
            placeholder="Valor da ação"
            value={newAction.value}
            onChange={(e) => setNewAction({...newAction, value: e.target.value})}
          />
        );
    }
  };

  const renderConditionValueInput = () => {
    switch (newCondition.field) {
      case 'status':
        return (
          <Select value={newCondition.value} onValueChange={(value) => setNewCondition({...newCondition, value})}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(status => (
                <SelectItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'score':
        return (
          <Input
            type="number"
            min="0"
            max="10"
            placeholder="Score (0-10)"
            value={newCondition.value}
            onChange={(e) => setNewCondition({...newCondition, value: e.target.value})}
          />
        );
      default:
        return (
          <Input
            placeholder="Valor"
            value={newCondition.value}
            onChange={(e) => setNewCondition({...newCondition, value: e.target.value})}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Criar Workflow</h3>
          <p className="text-sm text-muted-foreground">
            Configure regras automáticas para otimizar o processamento de leads
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Informações Básicas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="workflow-name">Nome do Workflow</Label>
            <Input
              id="workflow-name"
              placeholder="Ex: Priorização de Leads Premium"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <Label>Gatilho</Label>
            <Select value={triggerType} onValueChange={setTriggerType}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha quando o workflow deve ser executado" />
              </SelectTrigger>
              <SelectContent>
                {triggerOptions.map(trigger => (
                  <SelectItem key={trigger.value} value={trigger.value}>
                    <div>
                      <div className="font-medium">{trigger.label}</div>
                      <div className="text-xs text-muted-foreground">{trigger.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {triggerType && (
            <div>
              <Label>Valor do Gatilho</Label>
              <Input
                placeholder={
                  triggerType === 'score_threshold' ? 'Ex: 7' :
                  triggerType === 'status_change' ? 'Ex: qualificado' :
                  triggerType === 'time_based' ? 'Ex: 24h' :
                  triggerType === 'source' ? 'Ex: website' : 'Valor'
                }
                value={triggerValue}
                onChange={(e) => setTriggerValue(e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conditions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Condições (Opcional)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            <Select value={newCondition.field} onValueChange={(value) => setNewCondition({...newCondition, field: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Campo" />
              </SelectTrigger>
              <SelectContent>
                {conditionFields.map(field => (
                  <SelectItem key={field.value} value={field.value}>
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={newCondition.operator} onValueChange={(value) => setNewCondition({...newCondition, operator: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Operador" />
              </SelectTrigger>
              <SelectContent>
                {operators.map(op => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div>
              {renderConditionValueInput()}
            </div>

            <Button onClick={addCondition} disabled={!newCondition.field || !newCondition.operator || !newCondition.value}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {conditions.length > 0 && (
            <div className="space-y-2">
              <Label>Condições Configuradas:</Label>
              {conditions.map((condition, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="text-sm">
                    {conditionFields.find(f => f.value === condition.field)?.label} {' '}
                    {operators.find(o => o.value === condition.operator)?.label} {' '}
                    {condition.value}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => removeCondition(index)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Ações *
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Select value={newAction.type} onValueChange={(value) => setNewAction({...newAction, type: value, value: ''})}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de Ação" />
              </SelectTrigger>
              <SelectContent>
                {actionTypes.map(action => (
                  <SelectItem key={action.value} value={action.value}>
                    <div className="flex items-center gap-2">
                      <action.icon className="h-4 w-4" />
                      {action.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div>
              {renderActionValueInput()}
            </div>

            <Button onClick={addAction} disabled={!newAction.type || !newAction.value}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {actions.length > 0 && (
            <div className="space-y-2">
              <Label>Ações Configuradas:</Label>
              {actions.map((action, index) => {
                const ActionIcon = getActionIcon(action.type);
                return (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex items-center gap-2">
                      <ActionIcon className="h-4 w-4" />
                      <span className="text-sm">
                        {getActionLabel(action.type)}: {action.value}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeAction(index)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={createWorkflow.isPending}>
          {createWorkflow.isPending ? 'Salvando...' : 'Criar Workflow'}
        </Button>
      </div>
    </div>
  );
};