import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Lead } from "@/hooks/useLeads";
import { updateLeadStatus } from "@/hooks/useLeads";
import { useToast } from "@/hooks/use-toast";
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

export const BulkActionsPanel = ({ selectedLeads, onClearSelection }: BulkActionsPanelProps) => {
  const [action, setAction] = useState<string>("");
  const [newStatus, setNewStatus] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { toast } = useToast();
  const updateStatus = updateLeadStatus();

  const handleBulkAction = async () => {
    if (!action || selectedLeads.length === 0) return;

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
          
          for (const lead of selectedLeads) {
            await updateStatus.mutateAsync({ id: lead.id, status: newStatus });
          }
          
          toast({
            title: "Sucesso",
            description: `${selectedLeads.length} leads atualizados para "${newStatus}"`,
          });
          break;
          
        case 'export':
          const csvContent = generateCSV(selectedLeads);
          downloadCSV(csvContent, 'leads-selecionados.csv');
          
          toast({
            title: "Exportação concluída",
            description: `${selectedLeads.length} leads exportados com sucesso`,
          });
          break;
          
        case 'archive':
          // Implement archive logic
          toast({
            title: "Arquivamento simulado",
            description: `${selectedLeads.length} leads seriam arquivados`,
          });
          break;
          
        default:
          toast({
            title: "Ação não implementada",
            description: "Esta ação ainda está em desenvolvimento",
          });
      }
      
      onClearSelection();
      setAction("");
      setNewStatus("");
      setNotes("");
      
    } catch (error) {
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

  if (selectedLeads.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6 text-center">
          <CheckSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">
            Selecione leads para executar ações em lote
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Ações em Lote
          <Badge variant="secondary">{selectedLeads.length} selecionados</Badge>
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

        {(action === 'send-email' || action === 'schedule-call') && (
          <div>
            <label className="text-sm font-medium mb-2 block">
              {action === 'send-email' ? 'Mensagem' : 'Observações'}
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={action === 'send-email' ? 
                'Digite a mensagem que será enviada...' : 
                'Adicione observações sobre o agendamento...'
              }
              rows={3}
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
            onClick={onClearSelection}
          >
            Limpar Seleção
          </Button>
        </div>

        {/* Selected Leads Summary */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Leads Selecionados</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {selectedLeads.slice(0, 5).map((lead) => (
              <div key={lead.id} className="flex items-center justify-between text-xs">
                <span className="truncate">{lead.name} - {lead.business}</span>
                <Badge variant="outline" className="text-xs">
                  Score: {lead.score}
                </Badge>
              </div>
            ))}
            {selectedLeads.length > 5 && (
              <div className="text-xs text-muted-foreground">
                ... e mais {selectedLeads.length - 5} leads
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};