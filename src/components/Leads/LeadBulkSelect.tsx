import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lead } from "@/hooks/useLeads";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { STATUS_OPTIONS } from "./types";

interface LeadBulkSelectProps {
  selectedLeads: Lead[];
  clearSelection: () => void;
  onLeadsChange?: () => void;
}

export const LeadBulkSelect = ({ 
  selectedLeads, 
  clearSelection, 
  onLeadsChange 
}: LeadBulkSelectProps) => {
  const bulkUpdateStatus = async (newStatus: string) => {
    if (selectedLeads.length === 0) {
      toast.error("Selecione pelo menos um lead");
      return;
    }

    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .in('id', selectedLeads.map(l => l.id));

      if (error) throw error;
      
      toast.success(`${selectedLeads.length} leads atualizados com sucesso!`);
      clearSelection();
      onLeadsChange?.();
    } catch (error) {
      toast.error("Erro ao atualizar leads");
      console.error(error);
    }
  };

  if (selectedLeads.length === 0) return null;

  return (
    <div className="flex gap-2 items-center">
      <span className="text-sm text-muted-foreground">
        {selectedLeads.length} selecionados
      </span>
      <Select onValueChange={bulkUpdateStatus}>
        <SelectTrigger 
          className="w-[160px]" 
          aria-label="Alterar status dos leads selecionados"
        >
          <SelectValue placeholder="Alterar status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
