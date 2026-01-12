import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";
import { STATUS_OPTIONS } from "./types";

interface LeadFiltersProps {
  scoreFilter: string;
  setScoreFilter: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  sortBy: 'score' | 'created_at' | 'name';
  setSortBy: (value: 'score' | 'created_at' | 'name') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (value: 'asc' | 'desc') => void;
}

export const LeadFilters = ({
  scoreFilter,
  setScoreFilter,
  statusFilter,
  setStatusFilter,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder
}: LeadFiltersProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      <Select value={scoreFilter} onValueChange={setScoreFilter}>
        <SelectTrigger className="w-[140px]" aria-label="Filtrar por score">
          <Filter className="h-4 w-4 mr-2" aria-hidden="true" />
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
        <SelectTrigger className="w-[140px]" aria-label="Filtrar por status">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {STATUS_OPTIONS.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'score' | 'created_at' | 'name')}>
        <SelectTrigger className="w-[140px]" aria-label="Ordenar por">
          <SelectValue placeholder="Ordenar por" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="score">Score</SelectItem>
          <SelectItem value="created_at">Data</SelectItem>
          <SelectItem value="name">Nome</SelectItem>
        </SelectContent>
      </Select>

      <Button 
        variant="outline" 
        size="sm"
        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        aria-label={`Ordem ${sortOrder === 'asc' ? 'crescente' : 'decrescente'}`}
        className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {sortOrder === 'asc' ? '↑' : '↓'}
        <span className="sr-only">
          {sortOrder === 'asc' ? 'Ordem crescente' : 'Ordem decrescente'}
        </span>
      </Button>
    </div>
  );
};
