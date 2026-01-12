import { useState, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Lead } from "@/hooks/useLeads";
import { useLeadScoring } from "@/hooks/useLeadScoring";
import { useSelection } from "@/hooks/useSelection";
import { LeadFilters } from "./LeadFilters";
import { LeadBulkSelect } from "./LeadBulkSelect";
import { LeadRow } from "./LeadRow";
import { ScoredLead } from "./types";

interface LeadsTableProps {
  leads: Lead[];
  onLeadsChange?: () => void;
  showActions?: boolean;
}

export const LeadsTable = ({ leads, onLeadsChange, showActions = true }: LeadsTableProps) => {
  const { scoredLeads } = useLeadScoring(leads);
  const { selectedLeads: globalSelectedLeads, toggleLead, isSelected, clearSelection } = useSelection();
  
  // Filter state
  const [sortBy, setSortBy] = useState<'score' | 'created_at' | 'name'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [scoreFilter, setScoreFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Memoized filtered and sorted leads
  const filteredAndSortedLeads = useMemo(() => {
    return (scoredLeads as ScoredLead[])
      .filter(lead => {
        if (scoreFilter === 'all') return true;
        if (scoreFilter === 'high') return lead.score >= 7;
        if (scoreFilter === 'medium') return lead.score >= 4 && lead.score < 7;
        if (scoreFilter === 'low') return lead.score < 4;
        return true;
      })
      .filter(lead => statusFilter === 'all' || lead.status === statusFilter)
      .sort((a, b) => {
        let aValue: string | number = 0;
        let bValue: string | number = 0;
        
        if (sortBy === 'created_at') {
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
        } else if (sortBy === 'name') {
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
        } else if (sortBy === 'score') {
          aValue = a.score;
          bValue = b.score;
        }
        
        const modifier = sortOrder === 'asc' ? 1 : -1;
        if (aValue > bValue) return modifier;
        if (aValue < bValue) return -modifier;
        return 0;
      });
  }, [scoredLeads, scoreFilter, statusFilter, sortBy, sortOrder]);

  // Handlers
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      filteredAndSortedLeads.forEach(lead => {
        if (!isSelected(lead.id)) {
          toggleLead(lead);
        }
      });
    } else {
      clearSelection();
    }
  }, [filteredAndSortedLeads, isSelected, toggleLead, clearSelection]);

  const handleSelectLead = useCallback((lead: Lead, _checked: boolean) => {
    toggleLead(lead);
  }, [toggleLead]);

  const allSelected = filteredAndSortedLeads.length > 0 && 
    filteredAndSortedLeads.every(lead => isSelected(lead.id));

  return (
    <Card className="p-6">
      {/* Header with filters and bulk actions */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-4">Lista de Leads</h3>
          
          <LeadFilters
            scoreFilter={scoreFilter}
            setScoreFilter={setScoreFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
          />
        </div>

        <LeadBulkSelect
          selectedLeads={globalSelectedLeads}
          clearSelection={clearSelection}
          onLeadsChange={onLeadsChange}
        />
      </div>

      {/* Leads Table */}
      <div className="overflow-x-auto" role="region" aria-label="Tabela de leads">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox 
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label={allSelected ? "Desmarcar todos os leads" : "Selecionar todos os leads"}
                />
              </TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Nome / Empresa</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              {showActions && <TableHead>Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedLeads.map((lead) => (
              <LeadRow
                key={lead.id}
                lead={lead}
                isSelected={isSelected(lead.id)}
                onSelect={handleSelectLead}
                showActions={showActions}
                onLeadsChange={onLeadsChange}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredAndSortedLeads.length === 0 && (
        <div 
          className="text-center py-8 text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          Nenhum lead encontrado com os filtros aplicados.
        </div>
      )}
    </Card>
  );
};
