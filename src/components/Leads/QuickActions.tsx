import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lead } from "@/hooks/useLeads";
import { 
  Phone, 
  Mail, 
  MessageSquare, 
  Calendar, 
  Star, 
  UserCheck, 
  UserX,
  Clock,
  CheckCircle,
  XCircle,
  Send
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QuickActionsProps {
  lead: Lead;
  onLeadUpdate?: () => void;
  compact?: boolean;
}

interface ContactTemplate {
  id: string;
  name: string;
  type: 'phone' | 'email' | 'whatsapp';
  subject?: string;
  message: string;
}

const CONTACT_TEMPLATES: ContactTemplate[] = [
  {
    id: "intro_call",
    name: "Chamada de Apresentação",
    type: "phone",
    message: "Olá {name}, sou da {company}. Vi que você tem interesse em nossos serviços. Podemos conversar sobre como podemos ajudar seu negócio?"
  },
  {
    id: "follow_up_email",
    name: "E-mail Follow-up",
    type: "email",
    subject: "Proposta personalizada para {business}",
    message: "Olá {name},\n\nEspero que esteja bem. Gostaria de apresentar uma proposta personalizada para {business}.\n\nPodemos agendar uma conversa esta semana?\n\nAtenciosamente"
  },
  {
    id: "whatsapp_intro",
    name: "WhatsApp Introdução",
    type: "whatsapp",
    message: "Oi {name}! 👋\n\nVi seu interesse em nossos serviços. Tenho uma proposta que pode ser perfeita para {business}.\n\nTem alguns minutos para conversar?"
  }
];

const QUALIFICATION_QUESTIONS = [
  "Qual o orçamento aproximado para este tipo de solução?",
  "Qual a urgência para implementar esta solução?",
  "Quem é o decisor final nesta compra?",
  "Já utilizaram alguma solução similar anteriormente?",
  "Qual o principal desafio que estão enfrentando?"
];

export const QuickActions = ({ lead, onLeadUpdate, compact = false }: QuickActionsProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState<ContactTemplate | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [qualificationNotes, setQualificationNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const updateLeadStatus = async (newStatus: string, notes?: string) => {
    setIsProcessing(true);
    try {
      const updateData: any = { status: newStatus };
      if (notes) {
        // In a real app, you'd have a notes table
        updateData.notes = notes;
      }

      const { error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', lead.id);

      if (error) throw error;
      
      toast.success(`Lead marcado como ${newStatus}`);
      onLeadUpdate?.();
    } catch (error) {
      toast.error("Erro ao atualizar lead");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const scheduleFollowUp = async (days: number) => {
    setIsProcessing(true);
    try {
      // In a real app, you'd create a follow-up task
      await updateLeadStatus("agendado", `Follow-up agendado para ${days} dias`);
      toast.success(`Follow-up agendado para ${days} dias`);
    } catch (error) {
      toast.error("Erro ao agendar follow-up");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTemplate = (template: ContactTemplate) => {
    return template.message
      .replace(/{name}/g, lead.name || 'Cliente')
      .replace(/{business}/g, lead.business || 'sua empresa')
      .replace(/{company}/g, 'nossa empresa');
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'novo': 'bg-blue-500',
      'contatado': 'bg-yellow-500',
      'qualificado': 'bg-green-500',
      'agendado': 'bg-purple-500',
      'convertido': 'bg-emerald-600',
      'perdido': 'bg-red-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  if (compact) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className="text-xs">
            <div className={`w-2 h-2 rounded-full mr-1 ${getStatusColor(lead.status)}`} />
            {lead.status}
          </Badge>
          {lead.score && (
            <Badge variant={lead.score >= 7 ? "default" : "secondary"} className="text-xs">
              <Star className="w-3 h-3 mr-1" />
              {lead.score}
            </Badge>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => updateLeadStatus("contatado")}
            disabled={isProcessing}
          >
            <Phone className="w-3 h-3 mr-1" />
            Contactar
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => updateLeadStatus("qualificado")}
            disabled={isProcessing}
          >
            <UserCheck className="w-3 h-3 mr-1" />
            Qualificar
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => scheduleFollowUp(3)}
            disabled={isProcessing}
          >
            <Clock className="w-3 h-3 mr-1" />
            Follow-up
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => updateLeadStatus("perdido")}
            disabled={isProcessing}
          >
            <XCircle className="w-3 h-3 mr-1" />
            Descartar
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Ações Rápidas</h3>
      
      {/* Status atual */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm text-muted-foreground">Status atual:</span>
        <Badge variant="outline">
          <div className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(lead.status)}`} />
          {lead.status}
        </Badge>
        {lead.score && (
          <Badge variant={lead.score >= 7 ? "default" : "secondary"}>
            <Star className="w-4 h-4 mr-1" />
            Score: {lead.score}
          </Badge>
        )}
      </div>

      {/* Ações de contato */}
      <div className="space-y-4 mb-6">
        <h4 className="font-medium text-sm">Contato</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {lead.phone && (
            <Button variant="outline" className="justify-start">
              <Phone className="w-4 h-4 mr-2" />
              Ligar
            </Button>
          )}
          {lead.email && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="justify-start">
                  <Mail className="w-4 h-4 mr-2" />
                  E-mail
                </Button>
              </DialogTrigger>
               <DialogContent aria-describedby={undefined}>
                <DialogHeader>
                  <DialogTitle>Enviar E-mail</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Template</Label>
                    <Select onValueChange={(templateId) => {
                      const template = CONTACT_TEMPLATES.find(t => t.id === templateId);
                      if (template) {
                        setSelectedTemplate(template);
                        setCustomMessage(formatTemplate(template));
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Escolha um template" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTACT_TEMPLATES.filter(t => t.type === 'email').map(template => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedTemplate?.subject && (
                    <div className="space-y-2">
                      <Label>Assunto</Label>
                      <Input 
                        value={selectedTemplate.subject.replace(/{business}/g, lead.business)}
                        readOnly
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label>Mensagem</Label>
                    <Textarea 
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      rows={6}
                    />
                  </div>
                  
                  <Button onClick={() => {
                    updateLeadStatus("contatado", "E-mail enviado");
                    toast.success("E-mail enviado!");
                  }}>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar E-mail
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {lead.phone && (
            <Button variant="outline" className="justify-start">
              <MessageSquare className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
          )}
        </div>
      </div>

      {/* Ações de qualificação */}
      <div className="space-y-4 mb-6">
        <h4 className="font-medium text-sm">Qualificação</h4>
        <div className="grid grid-cols-2 gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="justify-start">
                <UserCheck className="w-4 h-4 mr-2" />
                Qualificar
              </Button>
            </DialogTrigger>
            <DialogContent aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>Qualificar Lead</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Perguntas de Qualificação</Label>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {QUALIFICATION_QUESTIONS.map((question, index) => (
                      <p key={index}>• {question}</p>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Notas de Qualificação</Label>
                  <Textarea 
                    value={qualificationNotes}
                    onChange={(e) => setQualificationNotes(e.target.value)}
                    placeholder="Adicione suas notas sobre a qualificação deste lead..."
                    rows={4}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={() => {
                    updateLeadStatus("qualificado", qualificationNotes);
                    setQualificationNotes("");
                  }}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Qualificado
                  </Button>
                  <Button variant="outline" onClick={() => {
                    updateLeadStatus("perdido", qualificationNotes);
                    setQualificationNotes("");
                  }}>
                    <XCircle className="w-4 h-4 mr-2" />
                    Não Qualificado
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" className="justify-start" onClick={() => scheduleFollowUp(7)}>
            <Calendar className="w-4 h-4 mr-2" />
            Agendar
          </Button>
        </div>
      </div>

      {/* Follow-up rápido */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm">Follow-up</h4>
        <div className="grid grid-cols-3 gap-2">
          <Button size="sm" variant="outline" onClick={() => scheduleFollowUp(1)}>
            <Clock className="w-3 h-3 mr-1" />
            1 dia
          </Button>
          <Button size="sm" variant="outline" onClick={() => scheduleFollowUp(3)}>
            <Clock className="w-3 h-3 mr-1" />
            3 dias
          </Button>
          <Button size="sm" variant="outline" onClick={() => scheduleFollowUp(7)}>
            <Clock className="w-3 h-3 mr-1" />
            1 semana
          </Button>
        </div>
      </div>
    </Card>
  );
};