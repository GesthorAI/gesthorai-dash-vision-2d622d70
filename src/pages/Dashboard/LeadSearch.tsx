import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Clock, CheckCircle, AlertCircle } from "lucide-react";

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
  const [newNicho, setNewNicho] = useState<string>("");
  const [newCidade, setNewCidade] = useState<string>("");
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    console.log('[BuscaLeads] Iniciando busca...');
    
    const nicho = newNicho || selectedNicho;
    const cidade = newCidade || selectedCidade;
    
    if (!nicho || !cidade) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione ou digite um nicho e uma cidade",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    
    try {
      console.log('[BuscaLeads] Dados da busca:', { nicho, cidade });
      
      // Mock webhook call - replace with real n8n webhook URL
      const webhookUrl = "/api/webhook/leads-data";
      
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nicho,
          cidade,
          timestamp: new Date().toISOString(),
          responsavel: "dashboard",
        }),
      });

      console.log('[BuscaLeads] Resposta do webhook:', response.status);
      
      toast({
        title: "Busca iniciada!",
        description: `Buscando leads para ${nicho} em ${cidade}. Você será notificado quando concluir.`,
      });
      
      // Clear form
      setSelectedNicho("");
      setSelectedCidade("");
      setNewNicho("");
      setNewCidade("");
      
    } catch (error) {
      console.error('[BuscaLeads] Erro na busca:', error);
      toast({
        title: "Erro na busca",
        description: "Não foi possível iniciar a busca. Tente novamente.",
        variant: "destructive",
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
      default:
        return "Erro";
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Busca de Leads</h1>
        <p className="text-muted-foreground">Configure e inicie uma nova busca de leads</p>
      </div>

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
            
            <div className="flex items-center gap-2 mt-2">
              <Plus className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ou digite um novo nicho"
                value={newNicho}
                onChange={(e) => setNewNicho(e.target.value)}
                className="flex-1"
              />
            </div>
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
            
            <div className="flex items-center gap-2 mt-2">
              <Plus className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ou digite uma nova cidade"
                value={newCidade}
                onChange={(e) => setNewCidade(e.target.value)}
                className="flex-1"
              />
            </div>
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
              {mockRecentSearches.map((search) => (
                <TableRow key={search.id}>
                  <TableCell className="flex items-center gap-2">
                    {getStatusIcon(search.status)}
                    <span className="text-sm">{getStatusText(search.status)}</span>
                  </TableCell>
                  <TableCell>{search.nicho}</TableCell>
                  <TableCell>{search.cidade}</TableCell>
                  <TableCell className="font-medium">{search.total}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Recent Leads Added */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Leads Adicionados (24h)</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Negócio</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Horário</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockRecentLeads.map((lead, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{lead.nome}</TableCell>
                  <TableCell>{lead.negocio}</TableCell>
                  <TableCell>{lead.cidade}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{lead.timestamp}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
};