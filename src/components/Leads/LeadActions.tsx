import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquare, Edit, Trash2 } from "lucide-react";
import { Lead } from "@/hooks/useLeads";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LeadActionsProps {
  lead: Lead;
  onLeadsChange?: () => void;
}

export const LeadActions = ({ lead, onLeadsChange }: LeadActionsProps) => {
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [newNote, setNewNote] = useState('');

  const updateLead = async (leadId: string, data: Partial<Lead>) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update(data)
        .eq('id', leadId);

      if (error) throw error;
      
      toast.success("Lead atualizado com sucesso!");
      setEditingLead(null);
      onLeadsChange?.();
    } catch (error) {
      toast.error("Erro ao atualizar lead");
      console.error(error);
    }
  };

  const deleteLead = async (leadId: string) => {
    if (!confirm("Tem certeza que deseja excluir este lead?")) return;
    
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;
      
      toast.success("Lead excluído com sucesso!");
      onLeadsChange?.();
    } catch (error) {
      toast.error("Erro ao excluir lead");
      console.error(error);
    }
  };

  return (
    <div className="flex gap-1">
      {/* Notes Dialog */}
      <Dialog>
        <DialogTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm"
            aria-label={`Ver notas de ${lead.name}`}
            className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Ver notas</span>
          </Button>
        </DialogTrigger>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Notas - {lead.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="note-textarea">Adicionar nota</Label>
              <Textarea 
                id="note-textarea"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Digite uma nota sobre este lead..."
              />
              <Button 
                onClick={() => {
                  // TODO: Implement note saving
                  setNewNote('');
                  toast.success("Nota adicionada!");
                }}
                className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Adicionar Nota
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Edit Dialog */}
      <Dialog open={editingLead?.id === lead.id} onOpenChange={(open) => !open && setEditingLead(null)}>
        <DialogTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setEditingLead(lead)}
            aria-label={`Editar ${lead.name}`}
            className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Edit className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Editar lead</span>
          </Button>
        </DialogTrigger>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Editar Lead</DialogTitle>
          </DialogHeader>
          {editingLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nome</Label>
                  <Input 
                    id="edit-name"
                    value={editingLead.name}
                    onChange={(e) => setEditingLead({...editingLead, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-business">Empresa</Label>
                  <Input 
                    id="edit-business"
                    value={editingLead.business}
                    onChange={(e) => setEditingLead({...editingLead, business: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Telefone</Label>
                  <Input 
                    id="edit-phone"
                    value={editingLead.phone || ''}
                    onChange={(e) => setEditingLead({...editingLead, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input 
                    id="edit-email"
                    value={editingLead.email || ''}
                    onChange={(e) => setEditingLead({...editingLead, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-city">Cidade</Label>
                  <Input 
                    id="edit-city"
                    value={editingLead.city}
                    onChange={(e) => setEditingLead({...editingLead, city: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-niche">Nicho</Label>
                  <Input 
                    id="edit-niche"
                    value={editingLead.niche || ''}
                    onChange={(e) => setEditingLead({...editingLead, niche: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={() => updateLead(editingLead.id, editingLead)}
                  className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  Salvar
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setEditingLead(null)}
                  className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Button */}
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => deleteLead(lead.id)}
        className="text-destructive hover:text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={`Excluir ${lead.name}`}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Excluir lead</span>
      </Button>
    </div>
  );
};
