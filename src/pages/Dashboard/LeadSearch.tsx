import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, CheckCircle, AlertCircle, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRecentSearches, useCreateSearch } from "@/hooks/useSearches";
import { useLeadsByDateRange } from "@/hooks/useLeads";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AdvancedSearchForm } from "@/components/Search/AdvancedSearchForm";
import { LeadCaptureForm } from "@/components/Search/LeadCaptureForm";
import { ImportExportPanel } from "@/components/Search/ImportExportPanel";

// Mock data
const mockNichos = [
  "Restaurantes", "Lojas de Roupas", "Salões de Beleza", "Academias", 
  "Clínicas Médicas", "Escritórios de Advocacia", "Imobiliárias"
];

const mockCidades = [
  "Rio de Janeiro", "São Paulo", "Belo Horizonte", "Salvador", 
  "Brasília", "Fortaleza", "Recife", "Porto Alegre"
];

const mockRecentSearches = [
  { id: 1, nicho: "Restaurantes", cidade: "Rio de Janeiro", status: "concluida", total: 45, timestamp: "2024-01-15 14:30" },
  { id: 2, nicho: "Academias", cidade: "São Paulo", status: "processando", total: 32, timestamp: "2024-01-15 13:15" },
  { id: 3, nicho: "Salões", cidade: "Belo Horizonte", status: "concluida", total: 28, timestamp: "2024-01-15 11:45" },
];

const mockRecentLeads = [
  { nome: "Maria Silva", negocio: "Restaurante Bom Sabor", cidade: "Rio de Janeiro", telefone: "21999887766", timestamp: "14:30" },
  { nome: "João Santos", negocio: "Academia Fitness", cidade: "São Paulo", telefone: "11988776655", timestamp: "13:45" },
  { nome: "Ana Costa", negocio: "Salão Beleza Total", cidade: "Belo Horizonte", telefone: "31977665544", timestamp: "12:20" },
];

export const LeadSearch = () => {
  const [selectedNicho, setSelectedNicho] = useState<string>("");
  const [selectedCidade, setSelectedCidade] = useState<string>("");
  const [newNicho, setNewNicho] = useState("");
  const [newCidade, setNewCidade] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  // Fetch real data
  const { data: recentSearches = [], isLoading: searchesLoading } = useRecentSearches(20);
  const { data: recentLeads = [], isLoading: leadsLoading } = useLeadsByDateRange(1);
  const createSearch = useCreateSearch();

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

    setIsSearching(true);

    try {
      // Create search record first
      const searchResult = await createSearch.mutateAsync({
        niche: nicho,
        city: cidade,
        status: "processando",
        total_leads: 0,
        webhook_id: `webhook_${Date.now()}`
      });

      // Now call start-search Edge Function to queue the search with n8n
      const startSearchUrl = `https://xpgazdzcbtjqivbsunvh.supabase.co/functions/v1/start-search`;
      
      const response = await fetch(startSearchUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          search_id: searchResult.id,
          niche: nicho,
          city: cidade
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

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
      toast({
        title: "Erro na busca",
        description: "Não foi possível iniciar a busca. Tente novamente.",
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
                {mockNichos.map((nicho) => (
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
                {mockCidades.map((cidade) => (
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
          {searchesLoading ? (
            <p className="text-muted-foreground">Carregando buscas...</p>
          ) : recentSearches.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma busca encontrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Nicho</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSearches.map((search) => (
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
                {recentLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>{lead.business}</TableCell>
                    <TableCell>{lead.city}</TableCell>
                    <TableCell>
                      <Badge variant={lead.score >= 7 ? "default" : lead.score >= 4 ? "secondary" : "destructive"}>
                        {lead.score}
                      </Badge>
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