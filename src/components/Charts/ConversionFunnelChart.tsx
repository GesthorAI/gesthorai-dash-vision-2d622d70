import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Lead } from "@/hooks/useLeads";
import { ArrowDown, TrendingDown, AlertCircle } from "lucide-react";

interface ConversionFunnelChartProps {
  leads: Lead[];
  title?: string;
  showDropRates?: boolean;
}

interface FunnelStage {
  stage: string;
  count: number;
  percentage: number;
  color: string;
  description: string;
  dropRate?: number;
  icon?: React.ReactNode;
}

export const ConversionFunnelChart = ({ 
  leads, 
  title = "Funil de Conversão",
  showDropRates = true 
}: ConversionFunnelChartProps) => {
  
  // Define funnel stages based on lead status
  const totalLeads = leads.length;
  
  const stages: FunnelStage[] = [
    {
      stage: "Leads Captados",
      count: totalLeads,
      percentage: 100,
      color: "#3B82F6",
      description: "Total de leads gerados"
    },
    {
      stage: "Contactados",
      count: leads.filter(lead => 
        !['novo', 'perdido'].includes(lead.status.toLowerCase())
      ).length,
      percentage: 0,
      color: "#10B981",
      description: "Leads que responderam ao primeiro contato"
    },
    {
      stage: "Qualificados", 
      count: leads.filter(lead => 
        lead.score >= 6 && !['novo', 'contatado', 'perdido'].includes(lead.status.toLowerCase())
      ).length,
      percentage: 0,
      color: "#F59E0B",
      description: "Leads com potencial confirmado"
    },
    {
      stage: "Agendados",
      count: leads.filter(lead => 
        ['agendado', 'meeting', 'scheduled'].includes(lead.status.toLowerCase())
      ).length,
      percentage: 0,
      color: "#8B5CF6", 
      description: "Reuniões ou demonstrações marcadas"
    },
    {
      stage: "Convertidos",
      count: leads.filter(lead => 
        ['convertido', 'cliente', 'won', 'fechado'].includes(lead.status.toLowerCase())
      ).length,
      percentage: 0,
      color: "#EF4444",
      description: "Leads que se tornaram clientes"
    }
  ];
  
  // Calculate percentages and drop rates
  for (let i = 1; i < stages.length; i++) {
    const previousStage = stages[i - 1];
    const currentStage = stages[i];
    
    if (previousStage.count > 0) {
      currentStage.percentage = (currentStage.count / previousStage.count) * 100;
      currentStage.dropRate = 100 - currentStage.percentage;
    }
  }
  
  // Overall conversion rate
  const overallConversionRate = totalLeads > 0 ? 
    (stages[stages.length - 1].count / totalLeads) * 100 : 0;
  
  // Identify biggest bottleneck
  const bottleneck = stages.slice(1).reduce((worst, stage) => 
    (stage.dropRate || 0) > (worst.dropRate || 0) ? stage : worst
  );

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary">
            {overallConversionRate.toFixed(1)}%
          </p>
          <p className="text-sm text-muted-foreground">Conversão geral</p>
        </div>
      </div>
      
      {/* Funnel Visualization */}
      <div className="space-y-4">
        {stages.map((stage, index) => (
          <div key={index} className="relative">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">{stage.stage}</h4>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold" style={{ color: stage.color }}>
                  {stage.count.toLocaleString('pt-BR')}
                </span>
                {index > 0 && (
                  <Badge variant="outline">
                    {stage.percentage.toFixed(1)}%
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="relative mb-2">
              <Progress 
                value={index === 0 ? 100 : (stage.count / stages[0].count) * 100} 
                className="h-6"
                style={{ 
                  '--progress-foreground': stage.color 
                } as React.CSSProperties}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-medium text-white mix-blend-difference">
                  {index === 0 ? '100%' : `${((stage.count / stages[0].count) * 100).toFixed(1)}%`} do total
                </span>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground mb-2">{stage.description}</p>
            
            {showDropRates && stage.dropRate !== undefined && (
              <div className="flex items-center gap-2">
                <Badge 
                  variant={stage.dropRate > 70 ? "destructive" : 
                           stage.dropRate > 50 ? "secondary" : "default"}
                  className="text-xs"
                >
                  <TrendingDown className="h-3 w-3 mr-1" />
                  {stage.dropRate.toFixed(1)}% perda
                </Badge>
                {stage.dropRate > 70 && (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                )}
              </div>
            )}
            
            {/* Arrow between stages */}
            {index < stages.length - 1 && (
              <div className="flex justify-center my-2">
                <ArrowDown className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Bottleneck Analysis */}
      {showDropRates && bottleneck.dropRate && bottleneck.dropRate > 50 && (
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-800">Maior Gargalo Identificado</h4>
              <p className="text-sm text-amber-700 mt-1">
                <strong>{bottleneck.stage}</strong> tem {bottleneck.dropRate.toFixed(1)}% de perda. 
                Foque em melhorar esta etapa para aumentar a conversão geral.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t">
        <div className="text-center">
          <p className="text-lg font-bold text-blue-600">
            {stages[1].percentage.toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground">Taxa de resposta</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-green-600">
            {stages[2].count > 0 ? 
              ((stages[4].count / stages[2].count) * 100).toFixed(1) : '0'}%
          </p>
          <p className="text-xs text-muted-foreground">Qualificado → Cliente</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-purple-600">
            {totalLeads > 0 ? (stages[3].count / totalLeads * 100).toFixed(1) : '0'}%
          </p>
          <p className="text-xs text-muted-foreground">Taxa de agendamento</p>
        </div>
      </div>
    </Card>
  );
};