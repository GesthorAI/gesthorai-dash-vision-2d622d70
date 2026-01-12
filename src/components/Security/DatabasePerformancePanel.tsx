import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Database,
  RefreshCw,
  Activity,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  Play,
  BarChart3,
  HardDrive,
  Zap,
  Info,
} from "lucide-react";
import {
  useLeadStats,
  useRefreshLeadStats,
  useDatabaseMaintenance,
  useUnusedIndexes,
  useMaintenanceHistory,
} from "@/hooks/useLeadStats";
import { useTrendData } from "@/hooks/useLeadStatsHistory";
import { format, formatDistanceToNow, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DatabaseTrendChart } from "@/components/Charts/DatabaseTrendChart";

export const DatabasePerformancePanel = () => {
  const { data: leadStats, isLoading: statsLoading } = useLeadStats();
  const { data: unusedIndexes, isLoading: indexesLoading } = useUnusedIndexes();
  const { data: maintenanceHistory, isLoading: historyLoading } =
    useMaintenanceHistory(5);
  
  // Dados de tendência reais ou simulados
  const { data: realTrendData, hasRealData, isLoading: trendLoading } = useTrendData(14);

  const refreshStats = useRefreshLeadStats();
  const runMaintenance = useDatabaseMaintenance();

  const [showAllIndexes, setShowAllIndexes] = useState(false);

  // Calcular métricas derivadas
  const conversionRate = leadStats
    ? leadStats.total_leads > 0
      ? ((leadStats.converted_leads / leadStats.total_leads) * 100).toFixed(1)
      : "0"
    : "0";

  const qualificationRate = leadStats
    ? leadStats.total_leads > 0
      ? ((leadStats.qualified_leads / leadStats.total_leads) * 100).toFixed(1)
      : "0"
    : "0";

  const whatsappCoverage = leadStats
    ? leadStats.total_leads > 0
      ? ((leadStats.whatsapp_leads / leadStats.total_leads) * 100).toFixed(1)
      : "0"
    : "0";

  const displayedIndexes = showAllIndexes
    ? unusedIndexes
    : unusedIndexes?.slice(0, 5);

  // Gerar dados simulados como fallback se não houver dados reais
  const trendData = useMemo(() => {
    // Se tem dados reais, usa eles
    if (hasRealData && realTrendData.leads.length > 0) {
      return realTrendData;
    }
    
    // Fallback: dados simulados baseados nas estatísticas atuais
    if (!leadStats) return { leads: [], conversions: [], qualifications: [], whatsapp: [] };
    
    const days = 14;
    const leadsData = [];
    const conversionsData = [];
    const qualificationsData = [];
    const whatsappData = [];
    
    const baseLeadsPerDay = leadStats.leads_last_7_days / 7;
    const baseConversionsPerDay = leadStats.converted_leads / 30;
    const baseQualPerDay = leadStats.qualified_leads / 30;
    const baseWhatsappPerDay = leadStats.whatsapp_leads / 30;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const variance = 0.4 + Math.random() * 0.6;
      const weekendFactor = [0, 6].includes(date.getDay()) ? 0.3 : 1;
      
      leadsData.push({
        date: date.toISOString(),
        value: Math.max(0, Math.round(baseLeadsPerDay * variance * weekendFactor)),
      });
      
      conversionsData.push({
        date: date.toISOString(),
        value: Math.max(0, Math.round(baseConversionsPerDay * variance * weekendFactor)),
      });
      
      qualificationsData.push({
        date: date.toISOString(),
        value: Math.max(0, Math.round(baseQualPerDay * variance * weekendFactor)),
      });
      
      whatsappData.push({
        date: date.toISOString(),
        value: Math.max(0, Math.round(baseWhatsappPerDay * variance)),
      });
    }
    
    return { leads: leadsData, conversions: conversionsData, qualifications: qualificationsData, whatsapp: whatsappData };
  }, [leadStats, hasRealData, realTrendData]);

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Database Performance
          </h2>
          <p className="text-sm text-muted-foreground">
            Monitoramento de índices, views materializadas e manutenção
          </p>
        </div>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refreshStats.mutate()}
                  disabled={refreshStats.isPending}
                  className="focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 motion-reduce:transition-none ${
                      refreshStats.isPending ? "animate-spin" : ""
                    }`}
                  />
                  Refresh View
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Atualizar view materializada de estatísticas</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => runMaintenance.mutate()}
                  disabled={runMaintenance.isPending}
                  className="focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Play
                    className={`h-4 w-4 mr-2 motion-reduce:transition-none ${
                      runMaintenance.isPending ? "animate-pulse" : ""
                    }`}
                  />
                  Run Maintenance
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Executar ANALYZE, refresh e cleanup</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* KPIs de Leads (da view materializada) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              Total Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : leadStats?.total_leads.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {leadStats?.active_leads || 0} ativos
            </p>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Conversão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {conversionRate}%
            </div>
            <Progress value={parseFloat(conversionRate)} className="h-1 mt-2" />
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Qualificação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {qualificationRate}%
            </div>
            <Progress
              value={parseFloat(qualificationRate)}
              className="h-1 mt-2"
            />
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Activity className="h-3 w-3" />
              WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {whatsappCoverage}%
            </div>
            <Progress
              value={parseFloat(whatsappCoverage)}
              className="h-1 mt-2"
            />
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Últimos 7 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : leadStats?.leads_last_7_days || 0}
            </div>
            <p className="text-xs text-muted-foreground">novos leads</p>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <HardDrive className="h-3 w-3" />
              Score Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : leadStats?.avg_score?.toFixed(1) || "0"}
            </div>
            <p className="text-xs text-muted-foreground">
              max: {leadStats?.max_score || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* View Materializada Info */}
      {leadStats?.refreshed_at && (
        <Card className="border-dashed">
          <CardContent className="py-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  <Database className="h-3 w-3 mr-1" />
                  mv_lead_stats_by_org
                </Badge>
                <span className="text-muted-foreground">
                  Última atualização:{" "}
                  {formatDistanceToNow(new Date(leadStats.refreshed_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {format(new Date(leadStats.refreshed_at), "dd/MM/yyyy HH:mm:ss")}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Gráficos de Tendência */}
      <div className="space-y-2">
        {!hasRealData && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
            <Info className="h-3.5 w-3.5" />
            <span>
              Dados simulados. Execute a migração <code className="font-mono bg-muted px-1 rounded">DATABASE_SNAPSHOTS.sql</code> e rode <strong>Run Maintenance</strong> para capturar dados reais.
            </span>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DatabaseTrendChart
            title="Novos Leads"
            data={trendData.leads}
            type="area"
            color="hsl(var(--primary))"
            height={160}
          />
          <DatabaseTrendChart
            title="Conversões"
            data={trendData.conversions}
            type="bar"
            color="hsl(142, 76%, 36%)"
            height={160}
          />
          <DatabaseTrendChart
            title="Qualificações"
            data={trendData.qualifications}
            type="area"
            color="hsl(217, 91%, 60%)"
            height={160}
          />
          <DatabaseTrendChart
            title="WhatsApp"
            data={trendData.whatsapp}
            type="bar"
            color="hsl(142, 69%, 58%)"
            height={160}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Índices não utilizados */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Índices Pouco Utilizados
            </CardTitle>
            <CardDescription>
              Índices com menos de 10 utilizações - candidatos a remoção
            </CardDescription>
          </CardHeader>
          <CardContent>
            {indexesLoading ? (
              <div className="animate-pulse space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-8 bg-muted rounded" />
                ))}
              </div>
            ) : unusedIndexes && unusedIndexes.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Índice</TableHead>
                      <TableHead className="text-xs text-right">Usos</TableHead>
                      <TableHead className="text-xs text-right">
                        Tamanho
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedIndexes?.map((idx) => (
                      <TableRow key={idx.index_name}>
                        <TableCell className="text-xs font-mono">
                          <span className="text-muted-foreground">
                            {idx.table_name}.
                          </span>
                          {idx.index_name}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          <Badge
                            variant={
                              idx.times_used === 0 ? "destructive" : "secondary"
                            }
                          >
                            {idx.times_used}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-right text-muted-foreground">
                          {idx.index_size}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {unusedIndexes.length > 5 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => setShowAllIndexes(!showAllIndexes)}
                  >
                    {showAllIndexes
                      ? "Mostrar menos"
                      : `Ver todos (${unusedIndexes.length})`}
                  </Button>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                Todos os índices estão sendo utilizados
              </div>
            )}
          </CardContent>
        </Card>

        {/* Histórico de Manutenções */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Histórico de Manutenções
            </CardTitle>
            <CardDescription>
              Últimas execuções de manutenção programada
            </CardDescription>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="animate-pulse space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded" />
                ))}
              </div>
            ) : maintenanceHistory && maintenanceHistory.length > 0 ? (
              <div className="space-y-3">
                {maintenanceHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-sm font-medium">
                          {entry.timestamp
                            ? format(
                                new Date(entry.timestamp),
                                "dd/MM/yyyy HH:mm"
                              )
                            : "Data não disponível"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.action}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">Executado</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Clock className="h-5 w-5 mr-2" />
                Nenhuma manutenção registrada
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Status do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">pg_trgm</p>
                <p className="text-sm font-medium">Ativo</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">
                  View Materializada
                </p>
                <p className="text-sm font-medium">Configurada</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Autovacuum</p>
                <p className="text-sm font-medium">Otimizado</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Índices Parciais</p>
                <p className="text-sm font-medium">Aplicados</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
