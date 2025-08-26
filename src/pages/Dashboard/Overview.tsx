import { KPICard } from "@/components/Dashboard/KPICard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilterBar } from "@/components/Filters/FilterBar";
import { useLeadsWithRealtime, useLeadsByDateRange } from "@/hooks/useLeads";
import { useRecentSearches } from "@/hooks/useSearches";
import { useFilters } from "@/hooks/useFilters";
import { 
  Users, 
  Target, 
  TrendingUp, 
  Clock,
  MapPin,
  Building2,
  Phone,
  Mail,
  Calendar,
  Search,
  CheckCircle,
  AlertCircle,
  XCircle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'concluida':
    case 'concluído':
    case 'completed':
      return <CheckCircle className="h-3 w-3 text-green-500" />;
    case 'processando':
    case 'processing':
      return <AlertCircle className="h-3 w-3 text-yellow-500" />;
    case 'erro':
    case 'error':
      return <XCircle className="h-3 w-3 text-red-500" />;
    default:
      return <Clock className="h-3 w-3 text-gray-500" />;
  }
};

const getStatusText = (status: string) => {
  switch (status.toLowerCase()) {
    case 'concluida':
      return 'Concluída';
    case 'processando':
      return 'Processando';
    case 'erro':
      return 'Erro';
    default:
      return status;
  }
};

export const Overview = () => {
  const filters = useFilters();
  
  // Fetch data using real hooks with filters
  const { data: allLeads = [], isLoading: leadsLoading } = useLeadsWithRealtime({
    niche: filters.selectedNiche,
    city: filters.selectedCity,
    status: filters.status,
    dateRange: filters.dateRange
  });
  const { data: recentLeads = [], isLoading: recentLeadsLoading } = useLeadsByDateRange(filters.dateRange);
  const { data: recentSearches = [], isLoading: searchesLoading } = useRecentSearches(10);

  // Calculate KPIs from real data
  const totalLeads = allLeads.length;
  const recentLeadsCount = recentLeads.length;
  const averageScore = allLeads.length > 0 
    ? (allLeads.reduce((sum, lead) => sum + lead.score, 0) / allLeads.length).toFixed(1)
    : '0.0';
  
  // Calculate trends (simplified - comparing last 30 days vs previous 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const last30DaysLeads = allLeads.filter(lead => 
    new Date(lead.created_at) >= thirtyDaysAgo
  ).length;
  
  const previousPeriodStart = new Date();
  previousPeriodStart.setDate(previousPeriodStart.getDate() - 60);
  
  const previous30DaysLeads = allLeads.filter(lead => {
    const createdAt = new Date(lead.created_at);
    return createdAt >= previousPeriodStart && createdAt < thirtyDaysAgo;
  }).length;
  
  const leadsTrend = previous30DaysLeads > 0 
    ? ((last30DaysLeads - previous30DaysLeads) / previous30DaysLeads * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Visão Geral</h1>
        <p className="text-muted-foreground">
          Acompanhe seus principais indicadores de geração de leads
        </p>
      </div>

      {/* Global Filters */}
      <FilterBar />

      {/* KPIs Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total de Leads"
          value={leadsLoading ? "..." : totalLeads.toLocaleString('pt-BR')}
          trend={{
            value: parseFloat(leadsTrend),
            isPositive: parseFloat(leadsTrend) >= 0,
            period: "últimos 30 dias"
          }}
          icon={<Users className="h-4 w-4" />}
          description="Leads gerados no período"
        />
        <KPICard
          title="Leads Recentes"
          value={recentLeadsLoading ? "..." : recentLeadsCount.toLocaleString('pt-BR')}
          trend={{
            value: 0,
            isPositive: true,
            period: `últimos ${filters.dateRange} dias`
          }}
          icon={<Target className="h-4 w-4" />}
          description="Leads no período selecionado"
        />
        <KPICard
          title="Score Médio"
          value={leadsLoading ? "..." : averageScore}
          trend={{
            value: 0,
            isPositive: true,
            period: "último mês"
          }}
          icon={<TrendingUp className="h-4 w-4" />}
          description="Qualidade dos leads"
        />
        <KPICard
          title="Buscas Realizadas"
          value={searchesLoading ? "..." : recentSearches.length.toString()}
          trend={{
            value: 0,
            isPositive: true,
            period: "últimas buscas"
          }}
          icon={<Search className="h-4 w-4" />}
          description="Total de buscas recentes"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            <Users className="h-4 w-4 inline mr-2" />
            Leads Recentes
          </h3>
          {recentLeadsLoading ? (
            <p className="text-muted-foreground">Carregando leads...</p>
          ) : recentLeads.length === 0 ? (
            <p className="text-muted-foreground">Nenhum lead encontrado no período.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Negócio</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLeads.slice(0, 5).map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>{lead.business}</TableCell>
                    <TableCell>{lead.city}</TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3 mr-1" />
                        {format(new Date(lead.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            <Search className="h-4 w-4 inline mr-2" />
            Buscas Recentes
          </h3>
          {searchesLoading ? (
            <p className="text-muted-foreground">Carregando buscas...</p>
          ) : recentSearches.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma busca encontrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nicho</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Leads</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSearches.slice(0, 5).map((search) => (
                  <TableRow key={search.id}>
                    <TableCell className="font-medium">{search.niche}</TableCell>
                    <TableCell>{search.city}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {getStatusIcon(search.status)}
                        <span className="ml-2">{getStatusText(search.status)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{search.total_leads}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
};