import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Filter, X } from "lucide-react";
import { format, subDays } from "date-fns";
import { useFilters } from "@/hooks/useFilters";
import { Badge } from "@/components/ui/badge";

const nicheOptions = [
  "Restaurantes",
  "Clínicas",
  "Salões de Beleza",
  "Academia",
  "Advocacia",
  "Contabilidade",
  "Imobiliárias",
  "Oficinas",
  "Petshops",
  "Lojas de Roupas"
];

const cityOptions = [
  "São Paulo",
  "Rio de Janeiro", 
  "Belo Horizonte",
  "Porto Alegre",
  "Salvador",
  "Brasília",
  "Curitiba",
  "Fortaleza",
  "Recife",
  "Manaus"
];

const statusOptions = [
  { value: "novo", label: "Novo" },
  { value: "contatado", label: "Contatado" },
  { value: "qualificado", label: "Qualificado" },
  { value: "agendado", label: "Agendado" },
  { value: "convertido", label: "Convertido" },
  { value: "perdido", label: "Perdido" }
];

const dateRangeOptions = [
  { value: 7, label: "Últimos 7 dias" },
  { value: 30, label: "Últimos 30 dias" },
  { value: 90, label: "Últimos 90 dias" },
  { value: 365, label: "Último ano" }
];

export const FilterBar = () => {
  const {
    selectedNiche,
    selectedCity,
    dateRange,
    status,
    setNiche,
    setCity,
    setDateRange,
    setStatus,
    clearFilters
  } = useFilters();

  const hasActiveFilters = selectedNiche || selectedCity || status || dateRange !== 30;
  
  const getActiveFilterCount = () => {
    let count = 0;
    if (selectedNiche) count++;
    if (selectedCity) count++;
    if (status) count++;
    if (dateRange !== 30) count++;
    return count;
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-card rounded-lg border">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Filtros:</span>
      </div>

      <Select value={selectedNiche || ""} onValueChange={(value) => setNiche(value || undefined)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Nicho" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Todos os nichos</SelectItem>
          {nicheOptions.map((niche) => (
            <SelectItem key={niche} value={niche}>
              {niche}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedCity || ""} onValueChange={(value) => setCity(value || undefined)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Cidade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Todas as cidades</SelectItem>
          {cityOptions.map((city) => (
            <SelectItem key={city} value={city}>
              {city}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={status || ""} onValueChange={(value) => setStatus(value || undefined)}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Todos os status</SelectItem>
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={dateRange.toString()} onValueChange={(value) => setDateRange(Number(value))}>
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {dateRangeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value.toString()}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            {getActiveFilterCount()} filtro(s) ativo(s)
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 px-2"
          >
            <X className="h-3 w-3" />
            Limpar
          </Button>
        </div>
      )}
    </div>
  );
};