import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Mail, MapPin, Building } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Lead } from "@/hooks/useLeads";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AIScoreIndicator } from "./AIScoreIndicator";
import { LeadActions } from "./LeadActions";
import { STATUS_OPTIONS, ScoredLead, getStatusOption } from "./types";

interface LeadRowProps {
  lead: ScoredLead;
  isSelected: boolean;
  onSelect: (lead: Lead, checked: boolean) => void;
  showActions: boolean;
  onLeadsChange?: () => void;
}

export const LeadRow = ({ 
  lead, 
  isSelected, 
  onSelect, 
  showActions, 
  onLeadsChange 
}: LeadRowProps) => {
  const statusOption = getStatusOption(lead.status);

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', leadId);

      if (error) throw error;
      
      toast.success("Status do lead atualizado com sucesso!");
      onLeadsChange?.();
    } catch (error) {
      toast.error("Erro ao atualizar status do lead");
      console.error(error);
    }
  };

  return (
    <TableRow className="transition-colors motion-reduce:transition-none hover:bg-muted/50">
      <TableCell>
        <Checkbox 
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(lead, checked as boolean)}
          aria-label={`Selecionar ${lead.name}`}
        />
      </TableCell>
      
      <TableCell>
        <AIScoreIndicator
          score={lead.score}
          scoreSource={(lead.scoreSource as 'ai' | 'heuristic') || 'heuristic'}
          aiRationale={lead.aiRationale}
          aiConfidence={lead.aiConfidence}
          aiModel={lead.aiModel}
          aiScoredAt={lead.aiScoredAt}
        />
      </TableCell>
      
      <TableCell>
        <div>
          <p className="font-medium">{lead.name}</p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Building className="h-3 w-3" aria-hidden="true" />
            {lead.business}
          </p>
        </div>
      </TableCell>
      
      <TableCell>
        <div className="space-y-1">
          {lead.phone && (
            <p className="text-sm flex items-center gap-1">
              <Phone className="h-3 w-3" aria-hidden="true" />
              <span className="sr-only">Telefone:</span>
              {lead.phone}
            </p>
          )}
          {lead.email && (
            <p className="text-sm flex items-center gap-1">
              <Mail className="h-3 w-3" aria-hidden="true" />
              <span className="sr-only">Email:</span>
              {lead.email}
            </p>
          )}
        </div>
      </TableCell>
      
      <TableCell>
        <p className="text-sm flex items-center gap-1">
          <MapPin className="h-3 w-3" aria-hidden="true" />
          <span className="sr-only">Cidade:</span>
          {lead.city}
        </p>
        {lead.niche && (
          <p className="text-xs text-muted-foreground">{lead.niche}</p>
        )}
      </TableCell>
      
      <TableCell>
        <Select 
          value={lead.status || undefined} 
          onValueChange={(value) => updateLeadStatus(lead.id, value)}
        >
          <SelectTrigger 
            className="w-[120px]"
            aria-label={`Status atual: ${statusOption?.label || lead.status}`}
          >
            <SelectValue>
              <div className="flex items-center gap-2">
                <div 
                  className={`w-2 h-2 rounded-full ${statusOption?.colorClass || 'bg-muted'}`} 
                  aria-hidden="true"
                />
                {statusOption?.label || lead.status}
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  <div 
                    className={`w-2 h-2 rounded-full ${option.colorClass}`} 
                    aria-hidden="true"
                  />
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      
      <TableCell>
        <p className="text-sm">
          {format(new Date(lead.created_at), 'dd/MM/yyyy', { locale: ptBR })}
        </p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(lead.created_at), 'HH:mm')}
        </p>
      </TableCell>
      
      {showActions && (
        <TableCell>
          <LeadActions lead={lead} onLeadsChange={onLeadsChange} />
        </TableCell>
      )}
    </TableRow>
  );
};
