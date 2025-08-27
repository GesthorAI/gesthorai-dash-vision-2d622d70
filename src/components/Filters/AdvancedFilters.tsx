import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFilters } from '@/hooks/useFilters';
import { useTeamMembers } from '@/hooks/useTeam';

interface AdvancedFiltersProps {
  onFiltersChange?: (filters: any) => void;
}

interface AdvancedFilterState {
  searchTerm: string;
  scoreRange: [number, number];
  dateRange: { from?: Date; to?: Date };
  cities: string[];
  niches: string[];
  status: string[];
  sources: string[];
  hasPhone: boolean | null;
  hasEmail: boolean | null;
  whatsappVerified: boolean | null;
  contactedStatus: string | null;
  archived: boolean | null;
  assignedTo: string | null;
}

const nicheOptions = [
  "Restaurantes", "Clínicas", "Salões de Beleza", "Academia",
  "Advocacia", "Contabilidade", "Imobiliárias", "Oficinas",
  "Petshops", "Lojas de Roupas", "Consultórios", "Farmácias"
];

const cityOptions = [
  "São Paulo", "Rio de Janeiro", "Belo Horizonte", "Porto Alegre",
  "Salvador", "Brasília", "Curitiba", "Fortaleza", "Recife", "Manaus"
];

const statusOptions = [
  { value: "novo", label: "Novo" },
  { value: "contatado", label: "Contatado" },
  { value: "qualificado", label: "Qualificado" },
  { value: "agendado", label: "Agendado" },
  { value: "convertido", label: "Convertido" },
  { value: "perdido", label: "Perdido" }
];

const sourceOptions = [
  "Google Maps", "LinkedIn", "Instagram", "Facebook", 
  "Website", "Referência", "Manual", "Importação"
];

export const AdvancedFilters = ({ onFiltersChange }: AdvancedFiltersProps) => {
  const globalFilters = useFilters();
  const { data: teamMembers } = useTeamMembers();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Use global filters state directly
  const filters = {
    searchTerm: globalFilters.searchTerm || '',
    scoreRange: globalFilters.scoreRange || [0, 10],
    dateRange: globalFilters.customDateRange || {},
    cities: globalFilters.selectedCity ? [globalFilters.selectedCity] : [],
    niches: globalFilters.selectedNiche ? [globalFilters.selectedNiche] : [],
    status: globalFilters.status ? [globalFilters.status] : [],
    sources: globalFilters.sources || [],
    hasPhone: globalFilters.hasPhone,
    hasEmail: globalFilters.hasEmail,
    whatsappVerified: globalFilters.whatsappVerified,
    contactedStatus: null,
    archived: globalFilters.archived,
    assignedTo: globalFilters.assignedTo
  };

  const updateFilters = (newFilters: Partial<AdvancedFilterState>) => {
    // Update global filters
    if ('searchTerm' in newFilters) globalFilters.setSearchTerm(newFilters.searchTerm);
    if ('scoreRange' in newFilters) globalFilters.setScoreRange(newFilters.scoreRange);
    if ('dateRange' in newFilters) globalFilters.setCustomDateRange(newFilters.dateRange);
    if ('hasPhone' in newFilters) globalFilters.setHasPhone(newFilters.hasPhone);
    if ('hasEmail' in newFilters) globalFilters.setHasEmail(newFilters.hasEmail);
    if ('whatsappVerified' in newFilters) globalFilters.setWhatsappVerified(newFilters.whatsappVerified);
    if ('sources' in newFilters) globalFilters.setSources(newFilters.sources);
    if ('archived' in newFilters) globalFilters.setArchived(newFilters.archived as boolean | null);
    if ('assignedTo' in newFilters) globalFilters.setAssignedTo(newFilters.assignedTo as string | null);
    
    // Handle arrays differently
    if ('cities' in newFilters && newFilters.cities?.length) {
      globalFilters.setCity(newFilters.cities[0]);
    } else if ('cities' in newFilters && !newFilters.cities?.length) {
      globalFilters.setCity(undefined);
    }
    
    if ('niches' in newFilters && newFilters.niches?.length) {
      globalFilters.setNiche(newFilters.niches[0]);
    } else if ('niches' in newFilters && !newFilters.niches?.length) {
      globalFilters.setNiche(undefined);
    }
    
    if ('status' in newFilters && newFilters.status?.length) {
      globalFilters.setStatus(newFilters.status[0]);
    } else if ('status' in newFilters && !newFilters.status?.length) {
      globalFilters.setStatus(undefined);
    }
    
    onFiltersChange?.(globalFilters);
  };

  const clearAllFilters = () => {
    globalFilters.clearFilters();
    onFiltersChange?.(globalFilters);
  };

  const getActiveFiltersCount = () => {
    return globalFilters.getActiveFiltersCount();
  };

  const toggleArrayFilter = (array: string[], value: string, key: keyof AdvancedFilterState) => {
    const newArray = array.includes(value) 
      ? array.filter(item => item !== value)
      : [...array, value];
    updateFilters({ [key]: newArray });
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <h3 className="font-semibold">Filtros Avançados</h3>
          {getActiveFiltersCount() > 0 && (
            <Badge variant="secondary">
              {getActiveFiltersCount()} filtro(s) ativo(s)
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {getActiveFiltersCount() > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              <X className="h-3 w-3 mr-1" />
              Limpar
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Basic Search */}
      <div className="space-y-4">
        <div>
          <Label>Busca por texto</Label>
          <Input
            placeholder="Nome, empresa, telefone, email..."
            value={filters.searchTerm}
            onChange={(e) => updateFilters({ searchTerm: e.target.value })}
          />
        </div>

        {isExpanded && (
          <>
            <Separator />

            {/* Score Range */}
            <div>
              <Label>Score do Lead: {filters.scoreRange[0]} - {filters.scoreRange[1]}</Label>
              <div className="mt-2">
                <Slider
                  value={filters.scoreRange}
                  onValueChange={(value) => updateFilters({ scoreRange: value as [number, number] })}
                  max={10}
                  min={0}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>

            {/* Date Range */}
            <div>
              <Label>Período de Criação</Label>
              <div className="flex gap-2 mt-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {filters.dateRange.from 
                        ? format(filters.dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                        : "Data inicial"
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange.from}
                      onSelect={(date) => updateFilters({ 
                        dateRange: { ...filters.dateRange, from: date } 
                      })}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {filters.dateRange.to 
                        ? format(filters.dateRange.to, "dd/MM/yyyy", { locale: ptBR })
                        : "Data final"
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange.to}
                      onSelect={(date) => updateFilters({ 
                        dateRange: { ...filters.dateRange, to: date } 
                      })}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Multi-select filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cities */}
              <div>
                <Label>Cidades ({filters.cities.length})</Label>
                <div className="max-h-32 overflow-y-auto mt-2 space-y-1 border rounded p-2">
                  {cityOptions.map((city) => (
                    <div key={city} className="flex items-center space-x-2">
                      <Checkbox
                        id={`city-${city}`}
                        checked={filters.cities.includes(city)}
                        onCheckedChange={() => toggleArrayFilter(filters.cities, city, 'cities')}
                      />
                      <Label htmlFor={`city-${city}`} className="text-sm">{city}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Niches */}
              <div>
                <Label>Nichos ({filters.niches.length})</Label>
                <div className="max-h-32 overflow-y-auto mt-2 space-y-1 border rounded p-2">
                  {nicheOptions.map((niche) => (
                    <div key={niche} className="flex items-center space-x-2">
                      <Checkbox
                        id={`niche-${niche}`}
                        checked={filters.niches.includes(niche)}
                        onCheckedChange={() => toggleArrayFilter(filters.niches, niche, 'niches')}
                      />
                      <Label htmlFor={`niche-${niche}`} className="text-sm">{niche}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Status and Sources */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Status ({filters.status.length})</Label>
                <div className="mt-2 space-y-1">
                  {statusOptions.map((status) => (
                    <div key={status.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`status-${status.value}`}
                        checked={filters.status.includes(status.value)}
                        onCheckedChange={() => toggleArrayFilter(filters.status, status.value, 'status')}
                      />
                      <Label htmlFor={`status-${status.value}`} className="text-sm">{status.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Fontes ({filters.sources.length})</Label>
                <div className="mt-2 space-y-1">
                  {sourceOptions.map((source) => (
                    <div key={source} className="flex items-center space-x-2">
                      <Checkbox
                        id={`source-${source}`}
                        checked={filters.sources.includes(source)}
                        onCheckedChange={() => toggleArrayFilter(filters.sources, source, 'sources')}
                      />
                      <Label htmlFor={`source-${source}`} className="text-sm">{source}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Contact Information and Assignment Filters */}
            <div>
              <Label>Informações de Contato e Atribuição</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                <Select 
                  value={filters.hasPhone === null ? "all" : filters.hasPhone ? "yes" : "no"}
                  onValueChange={(value) => 
                    updateFilters({ 
                      hasPhone: value === "all" ? null : value === "yes" 
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Possui telefone?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="yes">Com telefone</SelectItem>
                    <SelectItem value="no">Sem telefone</SelectItem>
                  </SelectContent>
                </Select>

                <Select 
                  value={filters.hasEmail === null ? "all" : filters.hasEmail ? "yes" : "no"}
                  onValueChange={(value) => 
                    updateFilters({ 
                      hasEmail: value === "all" ? null : value === "yes" 
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Possui email?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="yes">Com email</SelectItem>
                    <SelectItem value="no">Sem email</SelectItem>
                  </SelectContent>
                </Select>

                <Select 
                  value={filters.whatsappVerified === null ? "all" : filters.whatsappVerified ? "yes" : "no"}
                  onValueChange={(value) => 
                    updateFilters({ 
                      whatsappVerified: value === "all" ? null : value === "yes" 
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="WhatsApp verificado?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="yes">Verificado</SelectItem>
                    <SelectItem value="no">Não verificado</SelectItem>
                  </SelectContent>
                </Select>

                <Select 
                  value={filters.archived === null ? "all" : filters.archived ? "yes" : "no"}
                  onValueChange={(value) => 
                    updateFilters({ 
                      archived: value === "all" ? null : value === "yes" 
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status de arquivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="no">Ativos</SelectItem>
                    <SelectItem value="yes">Arquivados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Team Member Assignment */}
              {teamMembers && teamMembers.length > 0 && (
                <div className="mt-4">
                  <Label>Atribuído para</Label>
                  <Select 
                    value={filters.assignedTo || "all"}
                    onValueChange={(value) => 
                      updateFilters({ 
                        assignedTo: value === "all" ? null : value 
                      })
                    }
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Selecione um membro da equipe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="unassigned">Não atribuídos</SelectItem>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name} - {member.role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
};