import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KPICard } from "@/components/Dashboard/KPICard";
import { BulkActionsPanel } from "@/components/Operations/BulkActionsPanel";
import { WorkflowAutomation } from "@/components/Operations/WorkflowAutomation";
import { LeadAssignment } from "@/components/Operations/LeadAssignment";
import { useLeadsWithRealtime } from "@/hooks/useLeads";
import { useRecentSearches } from "@/hooks/useSearches";
import { useNavigation } from "@/hooks/useNavigation";
import { useFilters } from "@/hooks/useFilters";
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Users,
  Phone,
  Calendar,
  MessageSquare,
  Target,
  Zap,
  RefreshCw,
  TrendingUp,
  Activity
} from "lucide-react";
import { format, isAfter, subDays, subHours } from "date-fns";
import { ptBR } from "date-fns/locale";

const PriorityBadge = ({ priority }: { priority: 'high' | 'medium' | 'low' }) => {
  const variants = {
    high: 'destructive',
    medium: 'secondary',
    low: 'outline'
  } as const;
  
  const labels = {
    high: 'Alta',
    medium: 'Média', 
    low: 'Baixa'
  };
  
  return <Badge variant={variants[priority]}>{labels[priority]}</Badge>;
};

const ActionCard = ({ 
  title, 
  description, 
  priority, 
  count, 
  action, 
  icon: Icon,
  onClick 
}: {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  count: number;
  action: string;
  icon: any;
  onClick?: () => void;
}) => (
  <Card className="p-4">
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-accent" />
        <h3 className="font-medium">{title}</h3>
      </div>
      <PriorityBadge priority={priority} />
    </div>
    <p className="text-sm text-muted-foreground mb-3">{description}</p>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold">{count}</span>
        <span className="text-sm text-muted-foreground">itens</span>
      </div>
      <Button size="sm" variant="outline" onClick={onClick}>
        {action}
      </Button>
    </div>
  </Card>
);

export const Operations = () => {
  const { data: allLeads = [], isLoading: leadsLoading } = useLeadsWithRealtime();
  const { data: recentSearches = [], isLoading: searchesLoading } = useRecentSearches(50);
  const { applyFiltersAndNavigate } = useNavigation();
  const [selectedLeads, setSelectedLeads] = useState<any[]>([]);

  // Calculate operational metrics
  const now = new Date();
  const last24h = subHours(now, 24);
  const last7days = subDays(now, 7);

  // New leads needing first contact (last 24h)
  const newLeads = allLeads.filter(lead => 
    isAfter(new Date(lead.created_at), last24h) &&
    ['novo', 'new', 'pending'].includes(lead.status.toLowerCase())
  );

  // Leads needing follow-up (no contact in 3+ days, score >= 5)
  const needsFollowUp = allLeads.filter(lead => {
    const leadDate = new Date(lead.created_at);
    const threeDaysAgo = subDays(now, 3);
    return isAfter(threeDaysAgo, leadDate) && 
           lead.score >= 5 && 
           !['convertido', 'converted', 'cliente', 'descartado'].includes(lead.status.toLowerCase());
  });

  // High-quality leads (score >= 8) from last 7 days
  const highQualityLeads = allLeads.filter(lead =>
    isAfter(new Date(lead.created_at), last7days) &&
    lead.score >= 8
  );

  // Failed/stuck searches
  const failedSearches = recentSearches.filter(search =>
    ['falhou', 'erro', 'error', 'failed'].includes(search.status.toLowerCase())
  );

  // Processing searches (taking too long)
  const stuckSearches = recentSearches.filter(search => {
    const searchDate = new Date(search.created_at);
    const oneHourAgo = subHours(now, 1);
    return search.status.toLowerCase() === 'processando' && 
           isAfter(oneHourAgo, searchDate);
  });

  // Leads without phone/email
  const incompleteLeads = allLeads.filter(lead =>
    (!lead.phone || lead.phone === '') && 
    (!lead.email || lead.email === '') &&
    lead.score >= 6
  );

  // Calculate response rates
  const totalLeadsWithContact = allLeads.filter(lead => lead.phone || lead.email).length;
  const respondedLeads = allLeads.filter(lead => 
    ['contatado', 'respondeu', 'interessado', 'agendado'].includes(lead.status.toLowerCase())
  ).length;
  const responseRate = totalLeadsWithContact > 0 ? (respondedLeads / totalLeadsWithContact) * 100 : 0;

  // Today's activities
  const todaysLeads = allLeads.filter(lead =>
    format(new Date(lead.created_at), 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')
  ).length;

  const todaysSearches = recentSearches.filter(search =>
    format(new Date(search.created_at), 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')
  ).length;

  if (leadsLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Operacional</h1>
        <p className="text-muted-foreground">Carregando dados operacionais...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Operacional</h1>
        <p className="text-muted-foreground">
          Centro de operações para gestão eficiente de leads e automação
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="bulk-actions">Ações em Lote</TabsTrigger>
          <TabsTrigger value="automation">Automação</TabsTrigger>
          <TabsTrigger value="team">Equipe</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">

      {/* KPIs Operacionais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Leads Hoje"
          value={todaysLeads.toString()}
          trend={{
            value: 0,
            isPositive: true,
            period: "ontem"
          }}
          icon={<Activity className="h-4 w-4" />}
          description="Leads gerados hoje"
        />
        <KPICard
          title="Taxa de Resposta"
          value={`${responseRate.toFixed(1)}%`}
          trend={{
            value: 0,
            isPositive: responseRate >= 50,
            period: "período anterior"
          }}
          icon={<MessageSquare className="h-4 w-4" />}
          description="Leads que responderam"
        />
        <KPICard
          title="Pendências Urgentes"
          value={(newLeads.length + needsFollowUp.length).toString()}
          trend={{
            value: 0,
            isPositive: false,
            period: "ontem"
          }}
          icon={<AlertTriangle className="h-4 w-4" />}
          description="Ações necessárias"
        />
        <KPICard
          title="Buscas Hoje"
          value={todaysSearches.toString()}
          trend={{
            value: 0,
            isPositive: true,
            period: "ontem"
          }}
          icon={<RefreshCw className="h-4 w-4" />}
          description="Buscas realizadas"
        />
      </div>

      {/* Ações Prioritárias */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Ações Prioritárias</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ActionCard
            title="Contato Inicial"
            description="Leads novos nas últimas 24h que precisam de primeiro contato"
            priority="high"
            count={newLeads.length}
            action="Contactar"
            icon={Phone}
            onClick={() => applyFiltersAndNavigate('operations', { 
              tab: 'bulk-actions',
              filters: { dateRange: 1, status: 'novo' }
            })}
          />
          <ActionCard
            title="Follow-up Necessário" 
            description="Leads qualificados sem contato há mais de 3 dias"
            priority="high"
            count={needsFollowUp.length}
            action="Fazer Follow-up"
            icon={MessageSquare}
            onClick={() => applyFiltersAndNavigate('operations', { 
              tab: 'bulk-actions',
              filters: { score: { min: 5 }, dateRange: 7 }
            })}
          />
          <ActionCard
            title="Leads Premium"
            description="Leads de alta qualidade da última semana"
            priority="medium"
            count={highQualityLeads.length}
            action="Priorizar"
            icon={Target}
            onClick={() => applyFiltersAndNavigate('operations', { 
              tab: 'bulk-actions',
              filters: { score: { min: 8 }, dateRange: 7 }
            })}
          />
          <ActionCard
            title="Dados Incompletos"
            description="Leads qualificados sem telefone ou email"
            priority="medium"
            count={incompleteLeads.length}
            action="Completar"
            icon={Users}
            onClick={() => applyFiltersAndNavigate('operations', { 
              tab: 'bulk-actions',
              filters: { score: { min: 6 }, hasEmail: false, hasPhone: false }
            })}
          />
          <ActionCard
            title="Buscas com Erro"
            description="Buscas que falharam e precisam ser refeitas"
            priority="low"
            count={failedSearches.length}
            action="Reprocessar"
            icon={AlertTriangle}
          />
          <ActionCard
            title="Buscas Travadas"
            description="Buscas processando há mais de 1 hora"
            priority="medium"
            count={stuckSearches.length}
            action="Verificar"
            icon={Clock}
          />
        </div>
      </div>

      {/* Próximas Ações Detalhadas */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Phone className="h-4 w-4 mr-2" />
            Leads para Contato Imediato
          </h3>
          {newLeads.length === 0 ? (
            <div className="text-center py-4">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-muted-foreground">Todos os leads foram contatados!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Negócio</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Tempo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {newLeads.slice(0, 5).map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{lead.business}</TableCell>
                    <TableCell>
                      <Badge variant={lead.score >= 7 ? "default" : "secondary"}>
                        {lead.score}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(lead.created_at), 'HH:mm', { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <TrendingUp className="h-4 w-4 mr-2" />
            Leads de Alto Valor
          </h3>
          {highQualityLeads.length === 0 ? (
            <div className="text-center py-4">
              <Zap className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Nenhum lead de alto valor recente.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {highQualityLeads.slice(0, 5).map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>{lead.city}</TableCell>
                    <TableCell>
                      <Badge className="bg-green-500">{lead.score}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{lead.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="bulk-actions" className="space-y-6">
          <BulkActionsPanel 
            selectedLeads={[]} // Will use global selection
            onClearSelection={() => {}}
          />
        </TabsContent>

        <TabsContent value="automation" className="space-y-6">
          <WorkflowAutomation />
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <LeadAssignment />
        </TabsContent>
      </Tabs>
    </div>
  );
};