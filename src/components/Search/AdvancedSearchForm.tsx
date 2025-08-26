import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useCreateSearch } from "@/hooks/useSearches";
import { 
  Search, 
  Settings, 
  MapPin, 
  Building, 
  Target,
  Filter,
  ChevronDown,
  ChevronUp,
  Plus,
  X
} from "lucide-react";

interface SearchFilters {
  niche: string;
  city: string;
  minScore: number;
  hasPhone: boolean;
  hasEmail: boolean;
  sources: string[];
  excludeCompetitors: boolean;
  minEmployees?: number;
  maxEmployees?: number;
  keywords: string[];
}

interface AdvancedSearchFormProps {
  onSearchStart?: (filters: SearchFilters) => void;
}

export const AdvancedSearchForm = ({ onSearchStart }: AdvancedSearchFormProps) => {
  const [filters, setFilters] = useState<SearchFilters>({
    niche: "",
    city: "",
    minScore: 5,
    hasPhone: true,
    hasEmail: false,
    sources: ["google_maps", "linkedin"],
    excludeCompetitors: true,
    keywords: []
  });

  const [customNiche, setCustomNiche] = useState("");
  const [customCity, setCustomCity] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const { toast } = useToast();
  const createSearch = useCreateSearch();

  const predefinedNiches = [
    "Restaurantes", "Academias", "Salões de Beleza", "Clínicas Médicas",
    "Escritórios de Advocacia", "Consultórios Odontológicos", "Pet Shops",
    "Lojas de Roupas", "Farmácias", "Oficinas Mecânicas", "Imobiliárias",
    "Escolas Particulares", "Corretoras de Seguros", "Agências de Viagem"
  ];

  const predefinedCities = [
    "São Paulo", "Rio de Janeiro", "Belo Horizonte", "Salvador", "Brasília",
    "Fortaleza", "Curitiba", "Recife", "Porto Alegre", "Manaus", "Belém",
    "Goiânia", "Guarulhos", "Campinas", "São Luís", "Maceió", "Natal"
  ];

  const dataSources = [
    { id: "google_maps", label: "Google Maps", description: "Empresas listadas no Google Maps" },
    { id: "linkedin", label: "LinkedIn", description: "Perfis de empresas no LinkedIn" },
    { id: "facebook", label: "Facebook", description: "Páginas comerciais do Facebook" },
    { id: "yellow_pages", label: "Páginas Amarelas", description: "Listagens tradicionais" },
    { id: "web_scraping", label: "Web Scraping", description: "Sites e diretórios online" }
  ];

  const handleAddKeyword = () => {
    if (newKeyword.trim() && !filters.keywords.includes(newKeyword.trim())) {
      setFilters(prev => ({
        ...prev,
        keywords: [...prev.keywords, newKeyword.trim()]
      }));
      setNewKeyword("");
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setFilters(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword)
    }));
  };

  const handleSourceToggle = (sourceId: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      sources: checked 
        ? [...prev.sources, sourceId]
        : prev.sources.filter(s => s !== sourceId)
    }));
  };

  const handleStartSearch = async () => {
    const niche = customNiche.trim() || filters.niche;
    const city = customCity.trim() || filters.city;

    if (!niche || !city) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione ou digite um nicho e uma cidade.",
        variant: "destructive"
      });
      return;
    }

    if (filters.sources.length === 0) {
      toast({
        title: "Fontes necessárias",
        description: "Selecione pelo menos uma fonte de dados.",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);

    try {
      const searchResult = await createSearch.mutateAsync({
        niche,
        city,
        status: "processando",
        total_leads: 0,
        webhook_id: `advanced_${Date.now()}`
      });

      toast({
        title: "Busca avançada iniciada!",
        description: `Buscando leads para "${niche}" em "${city}" com filtros personalizados.`,
      });

      onSearchStart?.({ ...filters, niche, city });

      // Reset form
      setFilters({
        niche: "",
        city: "",
        minScore: 5,
        hasPhone: true,
        hasEmail: false,
        sources: ["google_maps", "linkedin"],
        excludeCompetitors: true,
        keywords: []
      });
      setCustomNiche("");
      setCustomCity("");

    } catch (error) {
      toast({
        title: "Erro na busca",
        description: "Não foi possível iniciar a busca avançada.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Busca Avançada de Leads
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Filters */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Nicho do Negócio</Label>
            <Select value={filters.niche} onValueChange={(value) => setFilters(prev => ({...prev, niche: value}))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um nicho" />
              </SelectTrigger>
              <SelectContent>
                {predefinedNiches.map((niche) => (
                  <SelectItem key={niche} value={niche}>{niche}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Ou digite uma especialização específica"
              value={customNiche}
              onChange={(e) => setCustomNiche(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Cidade</Label>
            <Select value={filters.city} onValueChange={(value) => setFilters(prev => ({...prev, city: value}))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma cidade" />
              </SelectTrigger>
              <SelectContent>
                {predefinedCities.map((city) => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Ou digite uma cidade específica"
              value={customCity}
              onChange={(e) => setCustomCity(e.target.value)}
            />
          </div>
        </div>

        {/* Advanced Filters */}
        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Filtros Avançados
              </div>
              {isAdvancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-6 mt-4">
            {/* Quality Filters */}
            <div>
              <Label className="text-sm font-medium">Qualidade Mínima</Label>
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Score mínimo: {filters.minScore}</span>
                  <Badge variant="outline">{filters.minScore}/10</Badge>
                </div>
                <Slider
                  value={[filters.minScore]}
                  onValueChange={(value) => setFilters(prev => ({...prev, minScore: value[0]}))}
                  max={10}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>

            {/* Contact Requirements */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Requisitos de Contato</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasPhone"
                    checked={filters.hasPhone}
                    onCheckedChange={(checked) => setFilters(prev => ({...prev, hasPhone: !!checked}))}
                  />
                  <Label htmlFor="hasPhone" className="text-sm">Deve ter telefone</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasEmail"
                    checked={filters.hasEmail}
                    onCheckedChange={(checked) => setFilters(prev => ({...prev, hasEmail: !!checked}))}
                  />
                  <Label htmlFor="hasEmail" className="text-sm">Deve ter email</Label>
                </div>
              </div>
            </div>

            {/* Data Sources */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Fontes de Dados</Label>
              <div className="space-y-3">
                {dataSources.map((source) => (
                  <div key={source.id} className="flex items-start space-x-2">
                    <Checkbox
                      id={source.id}
                      checked={filters.sources.includes(source.id)}
                      onCheckedChange={(checked) => handleSourceToggle(source.id, !!checked)}
                    />
                    <div className="space-y-1">
                      <Label htmlFor={source.id} className="text-sm font-medium">{source.label}</Label>
                      <p className="text-xs text-muted-foreground">{source.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Keywords */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Palavras-chave Extras</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Adicionar palavra-chave"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                  />
                  <Button type="button" size="sm" onClick={handleAddKeyword}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {filters.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {filters.keywords.map((keyword) => (
                      <Badge key={keyword} variant="secondary" className="gap-1">
                        {keyword}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => handleRemoveKeyword(keyword)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Additional Options */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Opções Adicionais</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="excludeCompetitors"
                    checked={filters.excludeCompetitors}
                    onCheckedChange={(checked) => setFilters(prev => ({...prev, excludeCompetitors: !!checked}))}
                  />
                  <Label htmlFor="excludeCompetitors" className="text-sm">Excluir possíveis concorrentes</Label>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Search Button */}
        <Button 
          onClick={handleStartSearch}
          disabled={isSearching}
          className="w-full"
          size="lg"
        >
          {isSearching ? (
            <>
              <Search className="h-4 w-4 mr-2 animate-spin" />
              Iniciando busca avançada...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Iniciar Busca Avançada
            </>
          )}
        </Button>

        {/* Search Summary */}
        {(filters.niche || customNiche) && (filters.city || customCity) && (
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Resumo da Busca</h4>
            <div className="text-sm space-y-1">
              <p><strong>Nicho:</strong> {customNiche || filters.niche}</p>
              <p><strong>Cidade:</strong> {customCity || filters.city}</p>
              <p><strong>Score mínimo:</strong> {filters.minScore}/10</p>
              <p><strong>Fontes:</strong> {filters.sources.length} selecionadas</p>
              {filters.keywords.length > 0 && (
                <p><strong>Palavras-chave:</strong> {filters.keywords.join(", ")}</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};