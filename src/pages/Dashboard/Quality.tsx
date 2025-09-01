import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { LeadsTable } from "@/components/Leads/LeadsTable";
import { LeadScoreCard } from "@/components/Leads/LeadScoreCard";
import { QuickActions } from "@/components/Leads/QuickActions";
import { ScoreDistributionChart } from "@/components/Charts/ScoreDistributionChart";
import { useLeads } from "@/hooks/useLeads";
import { useLeadScoring } from "@/hooks/useLeadScoring";
import { useGenerateAIScores, useCheckStaleScores } from "@/hooks/useAILeadScoring";
import { Star, TrendingUp, Users, Target, Filter, Search, Brain, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Quality = () => {
  const { data: leads = [], refetch } = useLeads();
  const { scoredLeads, scoringStats } = useLeadScoring(leads);
  const [searchTerm, setSearchTerm] = useState("");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState<any>(null);

  // AI scoring functionality
  const generateAIScores = useGenerateAIScores();
  const { data: staleScoresInfo } = useCheckStaleScores();
  
  const handleGenerateAIScores = async () => {
    if (!scoredLeads.length) {
      toast.error("Nenhum lead encontrado para análise");
      return;
    }

    try {
      // Get leads that need scoring (without recent AI scores)
      const leadsNeedingScoring = scoredLeads
        .filter(lead => (lead as any).scoreSource === 'heuristic')
        .slice(0, 50) // Limit to 50 leads per batch
        .map(lead => ({
          id: lead.id,
          name: lead.name,
          business: lead.business,
          niche: lead.niche,
          city: lead.city,
          phone: lead.phone,
          email: lead.email,
          status: lead.status,
          source: lead.source,
          created_at: lead.created_at
        }));

      if (leadsNeedingScoring.length === 0) {
        toast.info("Todos os leads já possuem scores recentes de IA");
        return;
      }

      await generateAIScores.mutateAsync({
        leads: leadsNeedingScoring,
        batch_mode: true
      });

      toast.success(`${leadsNeedingScoring.length} leads analisados com IA`);
    } catch (error) {
      console.error('Error generating AI scores:', error);
      toast.error("Erro ao gerar scores com IA");
    }
  };

  // Filter leads based on search and filters
  const filteredLeads = scoredLeads.filter(lead => {
    const matchesSearch = !searchTerm || 
      lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.business?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesScore = scoreFilter === "all" || 
      (scoreFilter === "high" && lead.score >= 7) ||
      (scoreFilter === "medium" && lead.score >= 4 && lead.score < 7) ||
      (scoreFilter === "low" && lead.score < 4);
    
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    
    return matchesSearch && matchesScore && matchesStatus;
  });

  const highQualityLeads = scoredLeads.filter(lead => lead.score >= 7).length;
  const qualifiedLeads = scoredLeads.filter(lead => 
    ["qualificado", "agendado", "convertido"].includes(lead.status.toLowerCase())
  ).length;
  const conversionRate = scoredLeads.length > 0 ? 
    (scoredLeads.filter(lead => lead.status === "convertido").length / scoredLeads.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Qualidade dos Leads</h1>
          <p className="text-muted-foreground">
            Analise e gerencie a qualidade dos seus leads com scoring inteligente
          </p>
        </div>
        
        {staleScoresInfo && staleScoresInfo.stale_count > 0 && (
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              {staleScoresInfo.stale_count} leads precisam de análise de IA
            </div>
            <Button
              onClick={handleGenerateAIScores}
              disabled={generateAIScores.isPending}
              variant="outline"
              size="sm"
            >
              {generateAIScores.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Analisar com IA
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Quality Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium">Score Médio</span>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold">
              {scoringStats?.avgScore.toFixed(1) || "0.0"}
            </div>
            <div className="text-sm text-muted-foreground">
              / 10.0
            </div>
          </div>
          {scoringStats && scoringStats.aiCoverage > 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              {Math.round(scoringStats.aiCoverage)}% analisados com IA
            </div>
          )}
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">Alta Qualidade</span>
          </div>
          <div className="text-2xl font-bold">{highQualityLeads}</div>
          <div className="text-sm text-muted-foreground">
            {scoredLeads.length > 0 ? ((highQualityLeads / scoredLeads.length) * 100).toFixed(1) : 0}% do total
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">Qualificados</span>
          </div>
          <div className="text-2xl font-bold">{qualifiedLeads}</div>
          <div className="text-sm text-muted-foreground">
            {scoredLeads.length > 0 ? ((qualifiedLeads / scoredLeads.length) * 100).toFixed(1) : 0}% do total
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium">Taxa Conversão</span>
          </div>
          <div className="text-2xl font-bold">{conversionRate.toFixed(1)}%</div>
          <div className="text-sm text-muted-foreground">
            Leads → Clientes
          </div>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar leads por nome, empresa ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={scoreFilter} onValueChange={setScoreFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Score" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="high">Alto (7+)</SelectItem>
                <SelectItem value="medium">Médio (4-6)</SelectItem>
                <SelectItem value="low">Baixo (&lt;4)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="novo">Novo</SelectItem>
                <SelectItem value="contatado">Contatado</SelectItem>
                <SelectItem value="qualificado">Qualificado</SelectItem>
                <SelectItem value="agendado">Agendado</SelectItem>
                <SelectItem value="convertido">Convertido</SelectItem>
                <SelectItem value="perdido">Perdido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Score Distribution Chart */}
      <ScoreDistributionChart leads={scoredLeads} />

      {/* Selected Lead Details */}
      {selectedLead && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LeadScoreCard lead={selectedLead} showBreakdown={true} />
          <QuickActions 
            lead={selectedLead} 
            onLeadUpdate={() => {
              refetch();
              setSelectedLead(null);
            }} 
          />
        </div>
      )}

      {/* Leads Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Leads ({filteredLeads.length})
          </h3>
          {selectedLead && (
            <Button variant="outline" onClick={() => setSelectedLead(null)}>
              Fechar Detalhes
            </Button>
          )}
        </div>
        
        <div onClick={(e) => {
          const target = e.target as HTMLElement;
          const row = target.closest('tr');
          if (row) {
            const leadId = row.getAttribute('data-lead-id');
            if (leadId) {
              const lead = filteredLeads.find(l => l.id === leadId);
              if (lead) setSelectedLead(lead);
            }
          }
        }}>
          <LeadsTable 
            leads={filteredLeads}
            onLeadsChange={refetch}
            showActions={true}
          />
        </div>
      </div>

      {/* Quick Stats */}
      {scoringStats && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Estatísticas de Scoring</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {scoringStats.distribution.excellent}
              </div>
              <div className="text-sm text-muted-foreground">Excelentes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {scoringStats.distribution.good}
              </div>
              <div className="text-sm text-muted-foreground">Bons</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {scoringStats.distribution.fair}
              </div>
              <div className="text-sm text-muted-foreground">Médios</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {scoringStats.distribution.poor}
              </div>
              <div className="text-sm text-muted-foreground">Baixos</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};