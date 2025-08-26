import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lead } from "@/hooks/useLeads";
import { useLeadScoring } from "@/hooks/useLeadScoring";
import { Star, Phone, Mail, MapPin, Building, MessageSquare, Edit, Trash2, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LeadsTableProps {
  leads: Lead[];
  onLeadsChange?: () => void;
  showActions?: boolean;
}

interface LeadNote {
  id: string;
  leadId: string;
  note: string;
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: "novo", label: "Novo", color: "bg-blue-500" },
  { value: "contatado", label: "Contatado", color: "bg-yellow-500" },
  { value: "qualificado", label: "Qualificado", color: "bg-green-500" },
  { value: "agendado", label: "Agendado", color: "bg-purple-500" },
  { value: "convertido", label: "Convertido", color: "bg-emerald-600" },
  { value: "perdido", label: "Perdido", color: "bg-red-500" }
];

export const LeadsTable = ({ leads, onLeadsChange, showActions = true }: LeadsTableProps) => {
  const { scoredLeads } = useLeadScoring(leads);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'score' | 'created_at' | 'name'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [scoreFilter, setScoreFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leadNotes, setLeadNotes] = useState<LeadNote[]>([]);
  const [newNote, setNewNote] = useState('');

  // Filter and sort leads
  const filteredAndSortedLeads = scoredLeads
    .filter(lead => {
      if (scoreFilter === 'all') return true;
      if (scoreFilter === 'high') return lead.score >= 7;
      if (scoreFilter === 'medium') return lead.score >= 4 && lead.score < 7;
      if (scoreFilter === 'low') return lead.score < 4;
      return true;
    })
    .filter(lead => statusFilter === 'all' || lead.status === statusFilter)
    .sort((a, b) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];
      
      if (sortBy === 'created_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (sortBy === 'name') {
        aValue = a.name?.toLowerCase() || '';
        bValue = b.name?.toLowerCase() || '';
      }
      
      const modifier = sortOrder === 'asc' ? 1 : -1;
      return aValue > bValue ? modifier : aValue < bValue ? -modifier : 0;
    });

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

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-yellow-600"; 
    if (score >= 4) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 8) return { variant: "default" as const, label: "Excelente" };
    if (score >= 6) return { variant: "secondary" as const, label: "Bom" };
    if (score >= 4) return { variant: "outline" as const, label: "Médio" };
    return { variant: "destructive" as const, label: "Baixo" };
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(filteredAndSortedLeads.map(lead => lead.id));
    } else {
      setSelectedLeads([]);
    }
  };

  const handleSelectLead = (leadId: string, checked: boolean) => {
    if (checked) {
      setSelectedLeads(prev => [...prev, leadId]);
    } else {
      setSelectedLeads(prev => prev.filter(id => id !== leadId));
    }
  };

  const bulkUpdateStatus = async (newStatus: string) => {
    if (selectedLeads.length === 0) {
      toast.error("Selecione pelo menos um lead");
      return;
    }

    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .in('id', selectedLeads);

      if (error) throw error;
      
      toast.success(`${selectedLeads.length} leads atualizados com sucesso!`);
      setSelectedLeads([]);
      onLeadsChange?.();
    } catch (error) {
      toast.error("Erro ao atualizar leads");
      console.error(error);
    }
  };

  return (
    <Card className="p-6">
      {/* Header with filters and bulk actions */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-4">Lista de Leads</h3>
          
          <div className="flex flex-wrap gap-2">
            <Select value={scoreFilter} onValueChange={setScoreFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
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
              <SelectTrigger className="w-[140px]">
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

            <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
              <SelectTrigger className="w-[140px]">
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
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
          </div>
        </div>

        {selectedLeads.length > 0 && (
          <div className="flex gap-2">
            <span className="text-sm text-muted-foreground self-center">
              {selectedLeads.length} selecionados
            </span>
            <Select onValueChange={bulkUpdateStatus}>
              <SelectTrigger className="w-[160px]">
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
        )}
      </div>

      {/* Leads Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox 
                  checked={selectedLeads.length === filteredAndSortedLeads.length && filteredAndSortedLeads.length > 0}
                  onCheckedChange={handleSelectAll}
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
            {filteredAndSortedLeads.map((lead) => {
              const scoreBadge = getScoreBadge(lead.score);
              const statusOption = STATUS_OPTIONS.find(opt => opt.value === lead.status);
              
              return (
                <TableRow key={lead.id}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedLeads.includes(lead.id)}
                      onCheckedChange={(checked) => handleSelectLead(lead.id, checked as boolean)}
                    />
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Star className={`h-4 w-4 ${getScoreColor(lead.score)}`} />
                      <span className={`font-semibold ${getScoreColor(lead.score)}`}>
                        {lead.score}
                      </span>
                      <Badge variant={scoreBadge.variant} className="text-xs">
                        {scoreBadge.label}
                      </Badge>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div>
                      <p className="font-medium">{lead.name}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {lead.business}
                      </p>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1">
                      {lead.phone && (
                        <p className="text-sm flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </p>
                      )}
                      {lead.email && (
                        <p className="text-sm flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {lead.email}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <p className="text-sm flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {lead.city}
                    </p>
                    {lead.niche && (
                      <p className="text-xs text-muted-foreground">{lead.niche}</p>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <Select value={lead.status} onValueChange={(value) => updateLeadStatus(lead.id, value)}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${statusOption?.color || 'bg-gray-500'}`} />
                            {statusOption?.label || lead.status}
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${option.color}`} />
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
                      <div className="flex gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Notas - {lead.name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label>Adicionar nota</Label>
                                <Textarea 
                                  value={newNote}
                                  onChange={(e) => setNewNote(e.target.value)}
                                  placeholder="Digite uma nota sobre este lead..."
                                />
                                <Button onClick={() => {
                                  // TODO: Implement note saving
                                  setNewNote('');
                                  toast.success("Nota adicionada!");
                                }}>
                                  Adicionar Nota
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        <Dialog open={editingLead?.id === lead.id} onOpenChange={(open) => !open && setEditingLead(null)}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setEditingLead(lead)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Editar Lead</DialogTitle>
                            </DialogHeader>
                            {editingLead && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Nome</Label>
                                    <Input 
                                      value={editingLead.name}
                                      onChange={(e) => setEditingLead({...editingLead, name: e.target.value})}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Empresa</Label>
                                    <Input 
                                      value={editingLead.business}
                                      onChange={(e) => setEditingLead({...editingLead, business: e.target.value})}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Telefone</Label>
                                    <Input 
                                      value={editingLead.phone || ''}
                                      onChange={(e) => setEditingLead({...editingLead, phone: e.target.value})}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input 
                                      value={editingLead.email || ''}
                                      onChange={(e) => setEditingLead({...editingLead, email: e.target.value})}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Cidade</Label>
                                    <Input 
                                      value={editingLead.city}
                                      onChange={(e) => setEditingLead({...editingLead, city: e.target.value})}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Nicho</Label>
                                    <Input 
                                      value={editingLead.niche || ''}
                                      onChange={(e) => setEditingLead({...editingLead, niche: e.target.value})}
                                    />
                                  </div>
                                </div>
                                <div className="flex gap-2 pt-4">
                                  <Button onClick={() => updateLead(editingLead.id, editingLead)}>
                                    Salvar
                                  </Button>
                                  <Button variant="outline" onClick={() => setEditingLead(null)}>
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => deleteLead(lead.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {filteredAndSortedLeads.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum lead encontrado com os filtros aplicados.
        </div>
      )}
    </Card>
  );
};