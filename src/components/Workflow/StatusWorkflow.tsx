import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, Circle, ArrowRight, Users, Phone, 
  Calendar, DollarSign, X, Clock, Target
} from 'lucide-react';
import { Lead, updateLeadStatus } from '@/hooks/useLeads';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface StatusWorkflowProps {
  leads: Lead[];
  onStatusChange?: (leadId: string, newStatus: string) => void;
  className?: string;
}

const WORKFLOW_STAGES = [
  {
    id: 'novo',
    label: 'Novo Lead',
    description: 'Lead captado recentemente',
    icon: Users,
    color: 'bg-brand-primary text-white',
    nextStages: ['contatado', 'perdido']
  },
  {
    id: 'contatado',
    label: 'Contatado',
    description: 'Primeiro contato realizado',
    icon: Phone,
    color: 'bg-warning text-warning-foreground',
    nextStages: ['qualificado', 'perdido']
  },
  {
    id: 'qualificado',
    label: 'Qualificado',
    description: 'Lead demonstrou interesse',
    icon: Target,
    color: 'bg-accent text-accent-foreground',
    nextStages: ['agendado', 'perdido']
  },
  {
    id: 'agendado',
    label: 'Agendado',
    description: 'Reunião ou apresentação agendada',
    icon: Calendar,
    color: 'bg-brand-accent text-brand-accent-foreground',
    nextStages: ['convertido', 'perdido']
  },
  {
    id: 'convertido',
    label: 'Convertido',
    description: 'Lead se tornou cliente',
    icon: DollarSign,
    color: 'bg-success text-success-foreground',
    nextStages: []
  },
  {
    id: 'perdido',
    label: 'Perdido',
    description: 'Lead não demonstrou interesse',
    icon: X,
    color: 'bg-destructive text-destructive-foreground',
    nextStages: ['novo'] // Pode ser reativado
  }
];

export const StatusWorkflow = ({ leads, onStatusChange, className }: StatusWorkflowProps) => {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const updateStatusMutation = updateLeadStatus();

  // Calculate metrics for each stage
  const stageMetrics = WORKFLOW_STAGES.map(stage => {
    const stageLeads = leads.filter(lead => lead.status === stage.id);
    const percentage = leads.length > 0 ? (stageLeads.length / leads.length) * 100 : 0;
    
    return {
      ...stage,
      count: stageLeads.length,
      percentage,
      leads: stageLeads
    };
  });

  // Calculate conversion rates between stages
  const conversionRates = WORKFLOW_STAGES.slice(0, -1).map((stage, index) => {
    const currentStage = stageMetrics.find(m => m.id === stage.id);
    const nextStage = stageMetrics.find(m => m.id === WORKFLOW_STAGES[index + 1]?.id);
    
    if (!currentStage || !nextStage) return { from: stage.id, to: '', rate: 0 };
    
    const rate = currentStage.count > 0 
      ? ((nextStage.count + stageMetrics.slice(index + 1).reduce((acc, s) => acc + s.count, 0)) / currentStage.count) * 100
      : 0;
    
    return {
      from: stage.id,
      to: WORKFLOW_STAGES[index + 1]?.id || '',
      rate
    };
  });

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      await updateStatusMutation.mutateAsync({ id: leadId, status: newStatus });
      
      const stage = WORKFLOW_STAGES.find(s => s.id === newStatus);
      toast.success(`Status atualizado para: ${stage?.label || newStatus}`);
      
      // Also call the optional callback
      onStatusChange?.(leadId, newStatus);
      setSelectedLead(null);
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast.error('Erro ao atualizar status do lead');
    }
  };

  const getCurrentStage = (status: string) => {
    return WORKFLOW_STAGES.find(stage => stage.id === status);
  };

  const getNextStages = (currentStatus: string) => {
    const currentStage = getCurrentStage(currentStatus);
    return currentStage?.nextStages.map(stageId => 
      WORKFLOW_STAGES.find(stage => stage.id === stageId)
    ).filter(Boolean) || [];
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Workflow Overview */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-6">Funil de Conversão</h3>
        
        {/* Stage Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {stageMetrics.map((stage) => {
            const Icon = stage.icon;
            
            return (
              <Card key={stage.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedLead(null)}>
                <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-full ${stage.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                  <div>
                    <p className="font-medium text-sm">{stage.label}</p>
                    <p className="text-2xl font-bold">{stage.count}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progresso</span>
                    <span>{stage.percentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={stage.percentage} className="h-2" />
                </div>
                
                <p className="text-xs text-muted-foreground mt-2">{stage.description}</p>
              </Card>
            );
          })}
        </div>

        {/* Conversion Rates */}
        <div className="space-y-2">
          <h4 className="font-medium mb-3">Taxas de Conversão</h4>
          <div className="flex flex-wrap gap-2">
            {conversionRates.map((conversion, index) => {
              const fromStage = WORKFLOW_STAGES.find(s => s.id === conversion.from);
              const toStage = WORKFLOW_STAGES.find(s => s.id === conversion.to);
              
              if (!fromStage || !toStage) return null;
              
              return (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <span>{fromStage.label}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span>{toStage.label}</span>
                  <Badge variant={conversion.rate > 50 ? "default" : conversion.rate > 25 ? "secondary" : "destructive"}>
                    {conversion.rate.toFixed(1)}%
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Leads by Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {stageMetrics
          .filter(stage => stage.count > 0)
          .slice(0, 4) // Show top 4 stages with leads
          .map((stage) => (
            <Card key={stage.id} className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className={`p-2 rounded-full ${stage.color}`}>
                  <stage.icon className="h-4 w-4" />
                </div>
                <h4 className="font-semibold">{stage.label}</h4>
                <Badge variant="secondary">{stage.count} leads</Badge>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {stage.leads.slice(0, 10).map((lead) => (
                  <div
                    key={lead.id}
                    className={cn(
                      "p-3 rounded border cursor-pointer transition-colors",
                      selectedLead?.id === lead.id 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:bg-muted/50"
                    )}
                    onClick={() => setSelectedLead(lead)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">{lead.business}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={lead.score >= 7 ? "default" : "secondary"}>
                          Score: {lead.score}
                        </Badge>
                        {selectedLead?.id === lead.id && (
                          <div className="flex gap-1">
                            {getNextStages(lead.status).map((nextStage) => (
                              <Button
                                key={nextStage?.id}
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(lead.id, nextStage!.id);
                                }}
                                className="text-xs h-6 px-2"
                              >
                                → {nextStage?.label}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {stage.count > 10 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    +{stage.count - 10} leads adicionais
                  </p>
                )}
              </div>
            </Card>
          ))}
      </div>

      {/* Lead Actions Panel */}
      {selectedLead && (
        <Card className="p-6 bg-muted/50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-semibold">{selectedLead.name}</h4>
              <p className="text-sm text-muted-foreground">{selectedLead.business} • {selectedLead.city}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedLead(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium mb-2">Status Atual</p>
              <div className="flex items-center gap-2">
                {(() => {
                  const currentStage = getCurrentStage(selectedLead.status);
                  const Icon = currentStage?.icon || Circle;
                  return (
                    <>
                      <div className={`p-2 rounded-full ${currentStage?.color || 'bg-muted'}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span>{currentStage?.label || selectedLead.status}</span>
                    </>
                  );
                })()}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Próximas Ações</p>
              <div className="flex gap-2">
                {getNextStages(selectedLead.status).map((nextStage) => (
                  <Button
                    key={nextStage?.id}
                    size="sm"
                    onClick={() => handleStatusChange(selectedLead.id, nextStage!.id)}
                    className="text-xs"
                  >
                    Marcar como {nextStage?.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Score</p>
              <p className="font-medium">{selectedLead.score}/10</p>
            </div>
            <div>
              <p className="text-muted-foreground">Telefone</p>
              <p className="font-medium">{selectedLead.phone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{selectedLead.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Criado em</p>
              <p className="font-medium">
                {new Date(selectedLead.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};