import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { KPICard } from "@/components/Dashboard/KPICard";
import { useLeads } from "@/hooks/useLeads";
import { useFilters } from "@/hooks/useFilters";
import { 
  Users, 
  UserCheck, 
  Phone, 
  Calendar,
  TrendingDown,
  ArrowDown,
  Target,
  MessageSquare
} from "lucide-react";

const FunnelStage = ({ 
  stage, 
  count, 
  percentage, 
  color, 
  description, 
  dropRate 
}: {
  stage: string;
  count: number;
  percentage: number;
  color: string;
  description: string;
  dropRate?: number;
}) => (
  <div className="relative">
    <Card className="p-6 text-center">
      <h3 className="text-lg font-semibold mb-2">{stage}</h3>
      <div className="text-3xl font-bold mb-2" style={{ color }}>
        {count.toLocaleString('pt-BR')}
      </div>
      <Progress value={percentage} className="mb-2" />
      <p className="text-sm text-muted-foreground mb-2">
        {percentage.toFixed(1)}% do total
      </p>
      <p className="text-xs text-muted-foreground">{description}</p>
      {dropRate && (
        <Badge variant="secondary" className="mt-2">
          <TrendingDown className="h-3 w-3 mr-1" />
          {dropRate.toFixed(1)}% drop
        </Badge>
      )}
    </Card>
    <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 z-10">
      <ArrowDown className="h-6 w-6 text-muted-foreground bg-background border rounded-full p-1" />
    </div>
  </div>
);

export const Funnel = () => {
  const { data: allLeads = [], isLoading } = useLeads();
  
  // Calculate funnel stages based on lead status
  const totalLeads = allLeads.length;
  const contactedLeads = allLeads.filter(lead => 
    ['contatado', 'responded', 'interessado'].includes(lead.status.toLowerCase())
  ).length;
  const qualifiedLeads = allLeads.filter(lead => 
    lead.score >= 6 && ['interessado', 'qualified', 'quente'].includes(lead.status.toLowerCase())
  ).length;
  const scheduledLeads = allLeads.filter(lead => 
    ['agendado', 'scheduled', 'meeting'].includes(lead.status.toLowerCase())
  ).length;
  const convertedLeads = allLeads.filter(lead => 
    ['convertido', 'converted', 'cliente', 'won'].includes(lead.status.toLowerCase())
  ).length;

  // Calculate conversion rates
  const contactRate = totalLeads > 0 ? (contactedLeads / totalLeads) * 100 : 0;
  const qualificationRate = contactedLeads > 0 ? (qualifiedLeads / contactedLeads) * 100 : 0;
  const scheduleRate = qualifiedLeads > 0 ? (scheduledLeads / qualifiedLeads) * 100 : 0;
  const conversionRate = scheduledLeads > 0 ? (convertedLeads / scheduledLeads) * 100 : 0;

  // Calculate drop rates
  const contactDropRate = 100 - contactRate;
  const qualificationDropRate = 100 - qualificationRate;
  const scheduleDropRate = 100 - scheduleRate;
  const conversionDropRate = 100 - conversionRate;

  const stages = [
    {
      stage: "Leads Captados",
      count: totalLeads,
      percentage: 100,
      color: "#3B82F6",
      description: "Total de leads gerados",
      dropRate: undefined
    },
    {
      stage: "Contactados",
      count: contactedLeads,
      percentage: contactRate,
      color: "#10B981",
      description: "Leads que responderam",
      dropRate: contactDropRate
    },
    {
      stage: "Qualificados",
      count: qualifiedLeads,
      percentage: qualificationRate,
      color: "#F59E0B",
      description: "Leads com score alto",
      dropRate: qualificationDropRate
    },
    {
      stage: "Agendamentos",
      count: scheduledLeads,
      percentage: scheduleRate,
      color: "#8B5CF6",
      description: "Reuniões marcadas",
      dropRate: scheduleDropRate
    },
    {
      stage: "Conversões",
      count: convertedLeads,
      percentage: conversionRate,
      color: "#EF4444",
      description: "Clientes fechados",
      dropRate: conversionDropRate
    }
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Funil de Conversão</h1>
        <p className="text-muted-foreground">Carregando dados do funil...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Funil de Conversão</h1>
        <p className="text-muted-foreground">
          Acompanhe a jornada dos leads desde a captação até a conversão
        </p>
      </div>

      {/* KPIs principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Taxa de Contato"
          value={`${contactRate.toFixed(1)}%`}
          trend={{
            value: 0,
            isPositive: true,
            period: "período anterior"
          }}
          icon={<MessageSquare className="h-4 w-4" />}
          description="Leads que responderam"
        />
        <KPICard
          title="Taxa de Qualificação"
          value={`${qualificationRate.toFixed(1)}%`}
          trend={{
            value: 0,
            isPositive: true,
            period: "período anterior"
          }}
          icon={<Target className="h-4 w-4" />}
          description="Leads qualificados"
        />
        <KPICard
          title="Taxa de Agendamento"
          value={`${scheduleRate.toFixed(1)}%`}
          trend={{
            value: 0,
            isPositive: true,
            period: "período anterior"
          }}
          icon={<Calendar className="h-4 w-4" />}
          description="Reuniões agendadas"
        />
        <KPICard
          title="Taxa de Conversão Final"
          value={`${conversionRate.toFixed(1)}%`}
          trend={{
            value: 0,
            isPositive: true,
            period: "período anterior"
          }}
          icon={<UserCheck className="h-4 w-4" />}
          description="Clientes convertidos"
        />
      </div>

      {/* Funil Visual */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6">Análise do Funil</h2>
        <div className="grid gap-8 md:grid-cols-5">
          {stages.map((stage, index) => (
            <FunnelStage
              key={index}
              stage={stage.stage}
              count={stage.count}
              percentage={stage.percentage}
              color={stage.color}
              description={stage.description}
              dropRate={stage.dropRate}
            />
          ))}
        </div>
      </Card>

      {/* Métricas por Etapa */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Gargalos Identificados</h3>
          <div className="space-y-4">
            {stages.slice(1).map((stage, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium">{stage.stage}</p>
                  <p className="text-sm text-muted-foreground">
                    {stage.dropRate ? `${stage.dropRate.toFixed(1)}% de perda` : 'Base do funil'}
                  </p>
                </div>
                <Badge 
                  variant={stage.dropRate && stage.dropRate > 70 ? "destructive" : 
                           stage.dropRate && stage.dropRate > 50 ? "secondary" : "default"}
                >
                  {stage.percentage.toFixed(1)}% conversão
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Oportunidades de Melhoria</h3>
          <div className="space-y-4">
            {contactDropRate > 60 && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="font-medium text-destructive">Alta perda no primeiro contato</p>
                <p className="text-sm text-muted-foreground">
                  {contactDropRate.toFixed(1)}% dos leads não respondem. Considere melhorar a abordagem inicial.
                </p>
              </div>
            )}
            {qualificationDropRate > 50 && (
              <div className="p-3 rounded-lg bg-yellow-100 border border-yellow-200">
                <p className="font-medium text-yellow-800">Qualificação pode melhorar</p>
                <p className="text-sm text-yellow-600">
                  {qualificationDropRate.toFixed(1)}% dos leads contatados não se qualificam.
                </p>
              </div>
            )}
            {scheduleDropRate > 40 && (
              <div className="p-3 rounded-lg bg-blue-100 border border-blue-200">
                <p className="font-medium text-blue-800">Agendamentos em baixa</p>
                <p className="text-sm text-blue-600">
                  {scheduleDropRate.toFixed(1)}% dos leads qualificados não agendam.
                </p>
              </div>
            )}
            {stages.every(s => !s.dropRate || s.dropRate < 40) && (
              <div className="p-3 rounded-lg bg-green-100 border border-green-200">
                <p className="font-medium text-green-800">Funil funcionando bem!</p>
                <p className="text-sm text-green-600">
                  Todas as etapas estão com taxas de conversão saudáveis.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};