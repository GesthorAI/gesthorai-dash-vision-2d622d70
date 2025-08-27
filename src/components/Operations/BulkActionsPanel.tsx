import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lead, updateLeadStatus, useBulkArchiveLeads } from "@/hooks/useLeads";
import { useCreateTask } from "@/hooks/useTasks";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LeadsTableWithData } from "./LeadsTableWithData";
import { useSelection } from "@/hooks/useSelection";
import { batchProcessor } from "@/utils/batchProcessor";
import { BulkOperationProgress } from "./LoadingStates";
import { 
  CheckSquare, 
  Users, 
  Mail, 
  Phone, 
  Tag, 
  MessageSquare,
  Calendar,
  Archive,
  Download,
  Upload
} from "lucide-react";

interface BulkActionsPanelProps {
  selectedLeads: Lead[];
  onClearSelection: () => void;
}

export const BulkActionsPanel = ({ selectedLeads: propSelectedLeads, onClearSelection }: BulkActionsPanelProps) => {
  const [action, setAction] = useState<string>("");
  const [newStatus, setNewStatus] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{
    operation: string;
    current: number;
    total: number;
  } | null>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const updateStatus = updateLeadStatus();
  const createTask = useCreateTask();
  const bulkArchive = useBulkArchiveLeads();
  
  // Use global selection store
  const { selectedLeads, clearSelection } = useSelection();
  
  // Use prop leads if provided, otherwise use global selection
  const activeSelectedLeads = propSelectedLeads && propSelectedLeads.length > 0 ? propSelectedLeads : selectedLeads;
  const handleClearSelection = onClearSelection || clearSelection;

  const handleBulkAction = async () => {
    if (!action || activeSelectedLeads.length === 0) return;
    if (!user) return;

    setIsProcessing(true);
    
    try {
      switch (action) {
        case 'update-status':
          if (!newStatus) {
            toast({
              title: "Erro",
              description: "Selecione um status para atualizar",
              variant: "destructive"
            });
            return;
          }
          
          setBulkProgress({
            operation: `Atualizando status para ${newStatus}`,
            current: 0,
            total: activeSelectedLeads.length
          });

          await batchProcessor(
            activeSelectedLeads,
            async (lead) => {
              await updateStatus.mutateAsync({ id: lead.id, status: newStatus });
            },
            {
              batchSize: 10,
              onProgress: (current, total) => {
                setBulkProgress(prev => prev ? { ...prev, current } : null);
              }
            }
          );
          
          toast({
            title: "Sucesso",
            description: `${activeSelectedLeads.length} leads atualizados para "${newStatus}"`,
          });
          break;
          
        case 'schedule-call':
          if (!dueDate) {
            toast({
              title: "Erro",
              description: "Selecione uma data para agendamento",
              variant: "destructive"
            });
            return;
          }
          
          setBulkProgress({
            operation: "Agendando ligações",
            current: 0,
            total: activeSelectedLeads.length
          });

          let successCount = 0;
          await batchProcessor(
            activeSelectedLeads,
            async (lead) => {
              await createTask.mutateAsync({
                title: `Ligação para ${lead.name}`,
                description: `Contatar ${lead.name} da empresa ${lead.business}${notes ? `\n\nObservações: ${notes}` : ''}`,
                due_date: new Date(dueDate).toISOString(),
                type: 'call',
                priority: 'media',
                lead_id: lead.id
              });
              successCount++;
            },
            {
              batchSize: 5,
              onProgress: (current, total) => {
                setBulkProgress(prev => prev ? { ...prev, current } : null);
              }
            }
          );
          
          toast({
            title: "Agendamento concluído",
            description: `${successCount} ligações agendadas com sucesso`,
          });
          break;
          
        case 'send-email':
          if (!notes) {
            toast({
              title: "Erro",
              description: "Digite uma mensagem para enviar",
              variant: "destructive"
            });
            return;
          }
          
          let emailSuccessCount = 0;
          for (const lead of activeSelectedLeads) {
            try {
              if (!lead.email) continue;
              
              const { error } = await supabase
                .from('communications')
                .insert({
                  user_id: user.id,
                  lead_id: lead.id,
                  type: 'email',
                  channel: 'email',
                  status: 'queued',
                  message: notes,
                  metadata: {
                    to: lead.email,
                    subject: `Contato - ${lead.business}`,
                    sent_via: 'bulk_action'
                  }
                });
              
              if (!error) emailSuccessCount++;
            } catch (error) {
              console.error('Error logging email for lead:', lead.id, error);
            }
          }
          
          toast({
            title: "Emails registrados",
            description: `${emailSuccessCount} emails registrados para envio. A entrega real pode ser configurada posteriormente.`,
          });
          break;
          
        case 'export':
          const csvContent = generateCSV(activeSelectedLeads);
          downloadCSV(csvContent, 'leads-selecionados.csv');
          
          toast({
            title: "Exportação concluída",
            description: `${activeSelectedLeads.length} leads exportados com sucesso`,
          });
          break;
          
        case 'archive':
          await bulkArchive.mutateAsync({ 
            ids: activeSelectedLeads.map(l => l.id), 
            archive: true 
          });
          
          toast({
            title: "Arquivamento concluído",
            description: `${activeSelectedLeads.length} leads arquivados com sucesso`,
          });
          break;
          
        case 'unarchive':
          await bulkArchive.mutateAsync({ 
            ids: activeSelectedLeads.map(l => l.id), 
            archive: false 
          });
          
          toast({
            title: "Desarquivamento concluído",
            description: `${activeSelectedLeads.length} leads desarquivados com sucesso`,
          });
          break;
          
        default:
          toast({
            title: "Ação não implementada",
            description: "Esta ação ainda está em desenvolvimento",
          });
      }
      
      handleClearSelection();
      setAction("");
      setNewStatus("");
      setNotes("");
      setDueDate("");
      setBulkProgress(null);
      
    } catch (error) {
      setBulkProgress(null);
      toast({
        title: "Erro na operação",
        description: "Ocorreu um erro ao executar a ação em lote",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const generateCSV = (leads: Lead[]) => {
    const headers = ['Nome', 'Empresa', 'Cidade', 'Telefone', 'Email', 'Status', 'Score', 'Nicho', 'Data de Criação'];
    const rows = leads.map(lead => [
      lead.name,
      lead.business,
      lead.city,
      lead.phone || '',
      lead.email || '',
      lead.status,
      lead.score,
      lead.niche || '',
      new Date(lead.created_at).toLocaleDateString('pt-BR')
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (activeSelectedLeads.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center">
            <CheckSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              Selecione leads na tabela abaixo para executar ações em lote
            </p>
          </CardContent>
        </Card>
        
        {/* Embedded LeadsTable for selection */}
        <LeadsTableWithData />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bulkProgress && (
        <BulkOperationProgress
          current={bulkProgress.current}
          total={bulkProgress.total}
          operation={bulkProgress.operation}
        />
      )}
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Ações em Lote
            <Badge variant="secondary">{activeSelectedLeads.length} selecionados</Badge>
          </CardTitle>
        </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Ação</label>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar ação..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="update-status">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Atualizar Status
                </div>
              </SelectItem>
              <SelectItem value="send-email">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Enviar Email
                </div>
              </SelectItem>
              <SelectItem value="schedule-call">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Agendar Ligação  
                </div>
              </SelectItem>
              <SelectItem value="export">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Exportar CSV
                </div>
              </SelectItem>
              <SelectItem value="archive">
                <div className="flex items-center gap-2">
                  <Archive className="h-4 w-4" />
                  Arquivar
                </div>
              </SelectItem>
              <SelectItem value="unarchive">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Desarquivar
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {action === 'update-status' && (
          <div>
            <label className="text-sm font-medium mb-2 block">Novo Status</label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="novo">Novo</SelectItem>
                <SelectItem value="contatado">Contatado</SelectItem>
                <SelectItem value="interessado">Interessado</SelectItem>
                <SelectItem value="agendado">Agendado</SelectItem>
                <SelectItem value="convertido">Convertido</SelectItem>
                <SelectItem value="descartado">Descartado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {action === 'schedule-call' && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Data e Hora</Label>
              <Input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Observações</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Adicione observações sobre o agendamento..."
                rows={3}
                className="mt-2"
              />
            </div>
          </div>
        )}
        
        {action === 'send-email' && (
          <div>
            <Label className="text-sm font-medium">Mensagem</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Digite a mensagem que será enviada..."
              rows={4}
              className="mt-2"
            />
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button 
            onClick={handleBulkAction}
            disabled={!action || isProcessing}
            className="flex-1"
          >
            {isProcessing ? 'Processando...' : 'Executar Ação'}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleClearSelection}
          >
            Limpar Seleção
          </Button>
        </div>

        {/* Selected Leads Summary */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Leads Selecionados</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {activeSelectedLeads.slice(0, 5).map((lead) => (
              <div key={lead.id} className="flex items-center justify-between text-xs">
                <span className="truncate">{lead.name} - {lead.business}</span>
                <Badge variant="outline" className="text-xs">
                  Score: {lead.score}
                </Badge>
              </div>
            ))}
            {activeSelectedLeads.length > 5 && (
              <div className="text-xs text-muted-foreground">
                ... e mais {activeSelectedLeads.length - 5} leads
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
    </div>
  );
};