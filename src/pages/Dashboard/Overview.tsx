import { Card } from "@/components/ui/card";
import { KPICard } from "@/components/Dashboard/KPICard";
import { FilterBar } from "@/components/Filters/FilterBar";
import { LeadTrendChart } from "@/components/Charts/LeadTrendChart";
import { ScoreDistributionChart } from "@/components/Charts/ScoreDistributionChart";
import { ConversionFunnelChart } from "@/components/Charts/ConversionFunnelChart";
import { useLeadsWithRealtime } from "@/hooks/useLeads";
import { useLeadScoring } from "@/hooks/useLeadScoring";
import { useFilters } from "@/hooks/useFilters";
import { 
  Users, 
  UserCheck, 
  TrendingUp, 
  Phone,
  Mail,
  Star,
  Calendar,
  Building2,
  BarChart3,
  Target,
  Award
} from "lucide-react";

export const Overview = () => {
  const {
    selectedNiche,
    selectedCity,
    dateRange,
    status
  } = useFilters();

  const { data: allLeads = [], isLoading } = useLeadsWithRealtime({
    niche: selectedNiche,
    city: selectedCity,
    status,
    dateRange
  });

  // Use enhanced lead scoring
  const { scoredLeads, scoringStats } = useLeadScoring(allLeads);

  // Calculate KPIs with improved scoring
  const totalLeads = scoredLeads.length;
  const contactedLeads = scoredLeads.filter(lead => 
    !['novo', 'perdido'].includes(lead.status.toLowerCase())
  ).length;
  const convertedLeads = scoredLeads.filter(lead => 
    lead.status.toLowerCase() === 'convertido'
  ).length;
  const averageScore = scoringStats?.avgScore || 0;

  // High-quality leads (score >= 7)
  const highQualityLeads = scoredLeads.filter(lead => lead.score >= 7).length;
  const highQualityPercentage = totalLeads > 0 ? (highQualityLeads / totalLeads) * 100 : 0;

  // Contact information completeness
  const leadsWithPhone = scoredLeads.filter(lead => lead.phone && lead.phone.trim()).length;
  const leadsWithEmail = scoredLeads.filter(lead => lead.email && lead.email.trim()).length;
  const completeContacts = scoredLeads.filter(lead => 
    lead.phone && lead.phone.trim() && lead.email && lead.email.trim()
  ).length;

  // Conversion metrics
  const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
  const contactRate = totalLeads > 0 ? (contactedLeads / totalLeads) * 100 : 0;

  // Recent activity
  const recentLeads = scoredLeads
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard - Analytics Avançado</h1>
        <p className="text-muted-foreground">
          Acompanhe seus principais indicadores com análises avançadas e scoring inteligente
        </p>
      </div>

      {/* Global Filters */}
      <FilterBar />

      {/* KPIs principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <KPICard
          title="Total de Leads"
          value={totalLeads.toLocaleString('pt-BR')}
          trend={{
            value: 0,
            isPositive: true,
            period: "período anterior"
          }}
          icon={<Users className="h-4 w-4" />}
          description="Leads captados no período"
        />
        <KPICard
          title="Alta Qualidade"
          value={highQualityLeads.toLocaleString('pt-BR')}
          trend={{
            value: 0,
            isPositive: true,
            period: "período anterior"
          }}
          icon={<Award className="h-4 w-4" />}
          description={`${highQualityPercentage.toFixed(1)}% do total (score ≥ 7)`}
        />
        <KPICard
          title="Taxa de Contato"
          value={`${contactRate.toFixed(1)}%`}
          trend={{
            value: 0,
            isPositive: true,
            period: "período anterior"
          }}
          icon={<Phone className="h-4 w-4" />}
          description="Leads que responderam"
        />
        <KPICard
          title="Taxa de Conversão"
          value={`${conversionRate.toFixed(1)}%`}
          trend={{
            value: 0,
            isPositive: true,
            period: "período anterior"
          }}
          icon={<UserCheck className="h-4 w-4" />}
          description="Leads convertidos em clientes"
        />
        <KPICard
          title="Score Médio"
          value={averageScore.toFixed(1)}
          trend={{
            value: 0,
            isPositive: true,
            period: "período anterior"
          }}
          icon={<Star className="h-4 w-4" />}
          description="Qualidade média dos leads"
        />
      </div>

      {/* Advanced Analytics Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <LeadTrendChart 
          leads={scoredLeads} 
          days={dateRange}
          title="Tendência de Leads e Conversões"
          showComparison={true}
        />
        <ScoreDistributionChart 
          leads={scoredLeads} 
          type="bar"
          title="Distribuição de Qualidade"
        />
      </div>

      {/* Conversion Funnel */}
      <ConversionFunnelChart 
        leads={scoredLeads}
        title="Análise do Funil de Conversão" 
        showDropRates={true}
      />

      {/* Métricas Secundárias */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Phone className="h-4 w-4 mr-2" />
            Informações de Contato
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Com telefone</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{leadsWithPhone}</span>
                <span className="text-xs text-muted-foreground">
                  ({totalLeads > 0 ? ((leadsWithPhone / totalLeads) * 100).toFixed(1) : 0}%)
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Com email</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{leadsWithEmail}</span>
                <span className="text-xs text-muted-foreground">
                  ({totalLeads > 0 ? ((leadsWithEmail / totalLeads) * 100).toFixed(1) : 0}%)
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Contato completo</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{completeContacts}</span>
                <span className="text-xs text-muted-foreground">
                  ({totalLeads > 0 ? ((completeContacts / totalLeads) * 100).toFixed(1) : 0}%)
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Target className="h-4 w-4 mr-2" />
            Métricas de Qualidade
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Score médio</span>
              <span className="font-medium">{averageScore.toFixed(1)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Alta qualidade</span>
              <span className="font-medium">{highQualityPercentage.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Score máximo</span>
              <span className="font-medium">
                {scoringStats?.maxScore?.toFixed(1) || '0'}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            Performance Geral
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Taxa de contato</span>
              <span className="font-medium">{contactRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Taxa de conversão</span>
              <span className="font-medium">{conversionRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Leads por dia</span>
              <span className="font-medium">
                {(totalLeads / dateRange).toFixed(1)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Building2 className="h-4 w-4 mr-2" />
          Leads Recentes de Alta Qualidade
        </h3>
        <div className="space-y-3">
          {recentLeads.filter(lead => lead.score >= 7).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum lead de alta qualidade recente</p>
          ) : (
            recentLeads
              .filter(lead => lead.score >= 7)
              .slice(0, 8)
              .map((lead) => (
                <div key={lead.id} className="flex items-center justify-between text-sm p-3 rounded-lg border">
                  <div className="flex-1">
                    <p className="font-medium">{lead.name}</p>
                    <p className="text-muted-foreground text-xs">{lead.business} • {lead.city}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
                      Score: {lead.score}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {lead.niche || 'N/A'}
                    </span>
                  </div>
                </div>
              ))
          )}
        </div>
      </Card>
    </div>
  );
};