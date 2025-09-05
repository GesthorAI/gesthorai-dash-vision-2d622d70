
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, CheckCircle, AlertCircle, XCircle, Clock, MessageSquare, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRecentSearches, useCreateSearch } from "@/hooks/useSearches";
import { useLeadsWithRealtime } from "@/hooks/useLeads";
import { useRealtimeSearches } from "@/hooks/useRealtimeSearches";
import { useAuth } from "@/hooks/useAuth";
import { useLeadScoring } from "@/hooks/useLeadScoring";
import { useCreateFollowupRun, useMessageTemplates } from "@/hooks/useFollowups";
import { useDispatchToN8n } from "@/hooks/useDispatchToN8n";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AIScoreIndicator } from "@/components/Leads/AIScoreIndicator";
import { AdvancedSearchForm } from "@/components/Search/AdvancedSearchForm";
import { LeadCaptureForm } from "@/components/Search/LeadCaptureForm";
import { ImportExportPanel } from "@/components/Search/ImportExportPanel";
import { useSearchOptions } from "@/hooks/useSearchOptions";
import { useNavigate } from "react-router-dom";

export const LeadSearch = () => {
  const [selectedNicho, setSelectedNicho] = useState<string>("");
  const [selectedCidade, setSelectedCidade] = useState<string>("");
  const [newNicho, setNewNicho] = useState("");
  const [newCidade, setNewCidade] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  
  // Filter states for recent searches
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState("");
  const { toast } = useToast();
  const { isConnected } = useRealtimeSearches();
  const { session } = useAuth();
  const { niches, cities, addNiche, addCity } = useSearchOptions();
  const navigate = useNavigate();

  // Fetch real data - using realtime for leads to get automatic updates
  const { data: recentSearches = [], isLoading: searchesLoading } = useRecentSearches(20);
  const { data: recentLeads = [], isLoading: leadsLoading } = useLeadsWithRealtime({ dateRange: 1 });
  const createSearch = useCreateSearch();
  const { data: messageTemplates = [] } = useMessageTemplates();
  const createRun = useCreateFollowupRun();
  const dispatchToN8n = useDispatchToN8n();
  const { currentOrganizationId } = useOrganizationContext();
  
  // Calculate lead scores for display
  const { scoredLeads } = useLeadScoring(recentLeads);

  // Filter recent searches
  const filteredRecentSearches = recentSearches.filter(search => {
    const matchesStatus = statusFilter === "all" || search.status === statusFilter;
    const matchesSearch = !searchFilter || 
      search.niche?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      search.city?.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleSearch = async () => {
    const nicho = newNicho.trim() || selectedNicho;
    const cidade = newCidade.trim() || selectedCidade;
    
    if (!nicho || !cidade) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, selecione ou digite um nicho e uma cidade.",
        variant: "destructive"
      });
      return;
    }

    // Persist new values if typed
    if (newNicho.trim()) {
      addNiche(newNicho.trim());
    }
    if (newCidade.trim()) {
      addCity(newCidade.trim());
    }

    setIsSearching(true);

    try {
      // Get the current session token for authorization
      if (!session?.access_token) {
        throw new Error("No authentication token available");
      }

      // Call start-search Edge Function - it will create the search record and handle n8n
      const { data, error } = await supabase.functions.invoke('start-search', {
        body: {
          niche: nicho,
          city: cidade
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) {
        console.error("Start search function error:", error);
        throw new Error(error.message || 'Failed to start search');
      }

      console.log("Search started successfully:", data);

      toast({
        title: "Busca iniciada!",
        description: `Buscando leads para ${nicho} em ${cidade}. Você será notificado quando concluir.`,
      });
      
      // Reset form
      setSelectedNicho("");
      setSelectedCidade("");
      setNewNicho("");
      setNewCidade("");
    } catch (error) {
      console.error("Erro ao enviar busca:", error);
      
      let errorMessage = "Não foi possível iniciar a busca. Tente novamente.";
      
      if (error instanceof Error) {
        if (error.message.includes("Server configuration")) {
          errorMessage = "Erro de configuração do servidor. Entre em contato com o suporte.";
        } else if (error.message.includes("Authorization")) {
          errorMessage = "Erro de autenticação. Faça login novamente.";
        } else if (error.message.includes("n8n")) {
          errorMessage = "Erro no sistema de processamento. Tente novamente em alguns minutos.";
        }
      }
      
      toast({
        title: "Erro na busca",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "concluida":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "processando":
        return <Clock className="h-4 w-4 text-warning" />;
      case "falhou":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleDispatchMessage = async (searchId: string, niche: string, city: string) => {
    if (!currentOrganizationId) {
      toast({
        title: "Erro",
        description: "Organização não selecionada",
        variant: "destructive",
      });
      return;
    }

    try {
      // Buscar template "Follow-up Inicial"
      const initialTemplate = messageTemplates.find(t => t.name === "Follow-up Inicial");
      if (!initialTemplate) {
        toast({
          title: "Template não encontrado",
          description: "Template 'Follow-up Inicial' não foi encontrado. Crie um template primeiro.",
          variant: "destructive",
        });
        return;
      }

      // Criar run com filtros da busca e organization_id
      const run = await createRun.mutateAsync({
        name: `Follow-up da busca ${searchId.slice(0, 8)}`,
        template_id: initialTemplate.id,
        organization_id: currentOrganizationId,
        status: "preparing",
        filters: {
          search_id: searchId,
          status: ["novo", "contatado"]
        }
      });

      toast({
        title: "Mensagens preparadas",
        description: "Preparando envio automático...",
      });

      // Auto-dispatch to N8N
      await dispatchToN8n.mutateAsync({
        runId: run.id,
        organizationId: currentOrganizationId
      });

      // Navigate to followups page
      navigate("/dashboard/followups");

    } catch (error) {
      console.error("Error in dispatch flow:", error);
      toast({
        title: "Erro ao disparar mensagens",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "concluida":
        return "Concluída";
      case "processando":
        return "Processando";
      case "falhou":
        return "Falhou";
      default:
        return "Desconhecido";
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Busca e Captura de Leads</h1>
        <p className="text-muted-foreground">
          Centro completo para busca, captura e importação de leads
          {isConnected && (
            <span className="ml-2 text-xs text-success">● Atualizações em tempo real</span>
          )}
        </p>
      </div>

      <Tabs defaultValue="simple-search" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="simple-search">Busca Simples</TabsTrigger>
          <TabsTrigger value="advanced-search">Busca Avançada</TabsTrigger>
          <TabsTrigger value="manual-capture">Cadastro Manual</TabsTrigger>
          <TabsTrigger value="import-export">Importar/Exportar</TabsTrigger>
        </TabsList>

        <TabsContent value="simple-search" className="space-y-6">

      {/* Search Form */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Search className="h-5 w-5 text-accent" />
          Nova Busca
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <Label htmlFor="nicho">Nicho do Negócio</Label>
            <Select value={selectedNicho} onValueChange={setSelectedNicho}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um nicho" />
              </SelectTrigger>
              <SelectContent>
                {niches.map((nicho) => (
                  <SelectItem key={nicho} value={nicho}>
                    {nicho}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Input
              placeholder="Ou digite um novo nicho"
              value={newNicho}
              onChange={(e) => setNewNicho(e.target.value)}
              className="mt-2"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cidade">Cidade</Label>
            <Select value={selectedCidade} onValueChange={setSelectedCidade}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma cidade" />
              </SelectTrigger>
              <SelectContent>
                {cities.map((cidade) => (
                  <SelectItem key={cidade} value={cidade}>
                    {cidade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Input
              placeholder="Ou digite uma nova cidade"
              value={newCidade}
              onChange={(e) => setNewCidade(e.target.value)}
              className="mt-2"
            />
          </div>
        </div>

        <Button 
          onClick={handleSearch}
          disabled={isSearching}
          className="w-full md:w-auto"
        >
          {isSearching ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Iniciando busca...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Iniciar Busca
            </>
          )}
        </Button>
      </Card>

      {/* Recent Searches and New Leads Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Searches */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Buscas Recentes</h2>
          
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nicho ou cidade..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
                <SelectItem value="processando">Processando</SelectItem>
                <SelectItem value="falhou">Falhou</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {searchesLoading ? (
            <p className="text-muted-foreground">Carregando buscas...</p>
          ) : filteredRecentSearches.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma busca encontrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Nicho</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecentSearches.map((search) => (
                  <TableRow key={search.id}>
                    <TableCell className="flex items-center gap-2">
                      {getStatusIcon(search.status)}
                      <span className="text-sm">{getStatusText(search.status)}</span>
                    </TableCell>
                    <TableCell>{search.niche}</TableCell>
                    <TableCell>{search.city}</TableCell>
                    <TableCell className="font-medium">
                      <Badge variant="secondary">{search.total_leads}</Badge>
                    </TableCell>
                    <TableCell>
                      {search.status === "concluida" && search.total_leads > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDispatchMessage(search.id, search.niche, search.city)}
                          className="gap-2"
                          disabled={createRun.isPending || dispatchToN8n.isPending}
                        >
                          <MessageSquare className="h-3 w-3" />
                          Disparar Mensagem
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Leads Adicionados (24h)</h2>
          {leadsLoading ? (
            <p className="text-muted-foreground">Carregando leads...</p>
          ) : recentLeads.length === 0 ? (
            <p className="text-muted-foreground">Nenhum lead encontrado nas últimas 24h.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Negócio</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Horário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scoredLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>{lead.business}</TableCell>
                    <TableCell>{lead.city}</TableCell>
                    <TableCell>
                      <AIScoreIndicator
                        score={lead.score || 0}
                        scoreSource={(lead as any).scoreSource || 'heuristic'}
                        aiRationale={(lead as any).aiRationale}
                        aiConfidence={(lead as any).aiConfidence}
                        aiModel={(lead as any).aiModel}
                        aiScoredAt={(lead as any).aiScoredAt}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(lead.created_at), 'HH:mm', { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="advanced-search" className="space-y-6">
          <AdvancedSearchForm onSearchStart={(filters) => {
            toast({
              title: "Busca avançada configurada",
              description: `Filtros aplicados para ${filters.niche} em ${filters.city}`,
            });
          }} />
        </TabsContent>

        <TabsContent value="manual-capture" className="space-y-6">
          <LeadCaptureForm />
        </TabsContent>

        <TabsContent value="import-export" className="space-y-6">
          <ImportExportPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};
