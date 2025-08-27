import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ArrowRight, Play, Sparkles, Users, Filter, MessageSquare, Send } from 'lucide-react';
import { useLeads } from '@/hooks/useLeads';
import { useMessageTemplates, useCreateFollowupRun, usePrepareFollowupRun, useSendFollowupMessages, useDispatchToN8n } from '@/hooks/useFollowups';

interface FollowupFilters {
  niche?: string;
  city?: string;
  status?: string;
  minScore?: number;
  maxDaysOld?: number;
  excludeContacted?: boolean;
}

interface WizardProps {
  onClose?: () => void;
}

export const FollowupWizard: React.FC<WizardProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [runName, setRunName] = useState('');
  const [filters, setFilters] = useState<FollowupFilters>({});
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [useAI, setUseAI] = useState(false);
  const [useN8n, setUseN8n] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<string>('');

  const { data: leads } = useLeads(filters);
  const { data: templates } = useMessageTemplates();
  const createRun = useCreateFollowupRun();
  const prepareRun = usePrepareFollowupRun();
  const sendMessages = useSendFollowupMessages();
  const dispatchToN8n = useDispatchToN8n();

  const filteredLeadsCount = leads?.length || 0;

  const handleNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateRun = async () => {
    if (!runName || !selectedTemplateId) return;

    try {
      const result = await createRun.mutateAsync({
        name: runName,
        filters,
        template_id: selectedTemplateId,
        status: 'preparing'
      });
      
      setCurrentRunId(result.id);
      setCurrentStep(3);
    } catch (error) {
      console.error('Error creating run:', error);
    }
  };

  const handlePrepareRun = async () => {
    if (!currentRunId) return;

    if (useN8n) {
      // Skip preparation step for n8n, go directly to sending
      setCurrentStep(4);
    } else {
      try {
        await prepareRun.mutateAsync({
          runId: currentRunId,
          filters,
          templateId: selectedTemplateId,
          generateWithAI: useAI
        });
        setCurrentStep(4);
      } catch (error) {
        console.error('Error preparing run:', error);
      }
    }
  };

  const handleSendMessages = async () => {
    if (!currentRunId) return;

    try {
      if (useN8n) {
        await dispatchToN8n.mutateAsync({
          runId: currentRunId,
          templateId: selectedTemplateId,
          filters
        });
      } else {
        await sendMessages.mutateAsync({
          runId: currentRunId,
          batchSize: 10,
          delayMs: 2000
        });
      }
      
      if (onClose) onClose();
    } catch (error) {
      console.error('Error sending messages:', error);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-primary">
              <Filter className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Filtros e Configuração</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="runName">Nome do Follow-up</Label>
                <Input
                  id="runName"
                  value={runName}
                  onChange={(e) => setRunName(e.target.value)}
                  placeholder="Ex: Follow-up Dentistas SC"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="niche">Nicho</Label>
                  <Input
                    id="niche"
                    value={filters.niche || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, niche: e.target.value }))}
                    placeholder="Ex: odontologia"
                  />
                </div>
                <div>
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={filters.city || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Ex: São Paulo"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={filters.status || 'all'} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === 'all' ? undefined : value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="novo">Novo</SelectItem>
                      <SelectItem value="contatado">Contatado</SelectItem>
                      <SelectItem value="qualificado">Qualificado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="minScore">Score Mínimo</Label>
                  <Input
                    id="minScore"
                    type="number"
                    value={filters.minScore || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, minScore: parseInt(e.target.value) || undefined }))}
                    placeholder="0-10"
                  />
                </div>
                <div>
                  <Label htmlFor="maxDaysOld">Máx. Dias</Label>
                  <Input
                    id="maxDaysOld"
                    type="number"
                    value={filters.maxDaysOld || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxDaysOld: parseInt(e.target.value) || undefined }))}
                    placeholder="30"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="excludeContacted"
                  checked={filters.excludeContacted || false}
                  onCheckedChange={(checked) => setFilters(prev => ({ ...prev, excludeContacted: !!checked }))}
                />
                <Label htmlFor="excludeContacted">Excluir leads já contatados</Label>
              </div>

              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="font-medium">Leads encontrados: </span>
                    <Badge variant="secondary">{filteredLeadsCount}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-primary">
              <MessageSquare className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Escolher Template</h3>
            </div>

            <div className="space-y-4">
              {templates?.map((template) => (
                <Card 
                  key={template.id}
                  className={`cursor-pointer transition-colors ${
                    selectedTemplateId === template.id ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedTemplateId(template.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <Badge variant="outline">{template.category}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">{template.message}</p>
                    <div className="flex gap-1 flex-wrap">
                      {template.variables.map((variable) => (
                        <Badge key={variable} variant="secondary" className="text-xs">
                          {variable}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="useAI"
                    checked={useAI && !useN8n}
                    disabled={useN8n}
                    onCheckedChange={(checked) => setUseAI(!!checked)}
                  />
                  <Label htmlFor="useAI" className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Personalizar mensagens com IA
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="useN8n"
                    checked={useN8n}
                    onCheckedChange={(checked) => {
                      setUseN8n(!!checked);
                      if (checked) setUseAI(false);
                    }}
                  />
                  <Label htmlFor="useN8n" className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Enviar via n8n (workflow externo)
                  </Label>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-primary">
              <Play className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Preparação</h3>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Resumo do Follow-up</CardTitle>
                <CardDescription>Confirme os detalhes antes de preparar as mensagens</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="font-medium">Nome:</Label>
                  <p className="text-sm text-muted-foreground">{runName}</p>
                </div>
                
                <div>
                  <Label className="font-medium">Total de leads:</Label>
                  <p className="text-sm text-muted-foreground">{filteredLeadsCount}</p>
                </div>

                <div>
                  <Label className="font-medium">Template:</Label>
                  <p className="text-sm text-muted-foreground">
                    {templates?.find(t => t.id === selectedTemplateId)?.name}
                  </p>
                </div>

                <div>
                  <Label className="font-medium">Método de envio:</Label>
                  <p className="text-sm text-muted-foreground">
                    {useN8n ? 'Via n8n workflow' : useAI ? 'Direto com IA' : 'Direto simples'}
                  </p>
                </div>

                <Separator />

                <Button 
                  onClick={handlePrepareRun}
                  disabled={prepareRun.isPending}
                  className="w-full"
                >
                  {prepareRun.isPending ? 'Preparando...' : (useN8n ? 'Prosseguir para Envio' : 'Preparar Mensagens')}
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-primary">
              <Send className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Envio</h3>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Pronto para Enviar</CardTitle>
                <CardDescription>
                  {useN8n 
                    ? 'O follow-up será processado pelo seu workflow n8n'
                    : 'As mensagens foram preparadas e estão prontas para envio'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">
                    {useN8n ? 'Configuração n8n:' : 'Configuração de Envio:'}
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {useN8n ? (
                      <>
                        <li>• Processamento via workflow n8n</li>
                        <li>• Controle avançado de timing e personalização</li>
                        <li>• Rastreamento automático via webhooks</li>
                        <li>• Logs detalhados no n8n</li>
                      </>
                    ) : (
                      <>
                        <li>• Lotes de 10 mensagens</li>
                        <li>• Intervalo de 2 segundos entre mensagens</li>
                        <li>• Monitoramento automático de falhas</li>
                      </>
                    )}
                  </ul>
                </div>

                <Button 
                  onClick={handleSendMessages}
                  disabled={sendMessages.isPending || dispatchToN8n.isPending}
                  className="w-full"
                  size="lg"
                >
                  {(sendMessages.isPending || dispatchToN8n.isPending) 
                    ? (useN8n ? 'Enviando ao n8n...' : 'Enviando...')
                    : (useN8n ? 'Enviar ao n8n' : 'Iniciar Envio')
                  }
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Novo Follow-up WhatsApp</CardTitle>
        <CardDescription>
          Crie e envie follow-ups personalizados para seus leads
        </CardDescription>
        
        {/* Step indicator */}
        <div className="flex items-center justify-between pt-4">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step <= currentStep 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {step}
              </div>
              {step < 4 && (
                <div className={`w-12 h-0.5 mx-2 ${
                  step < currentStep ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Filtros</span>
          <span>Template</span>
          <span>Preparar</span>
          <span>Enviar</span>
        </div>
      </CardHeader>

      <CardContent>
        {renderStepContent()}

        <div className="flex justify-between pt-6 border-t mt-6">
          <Button 
            variant="outline" 
            onClick={currentStep === 1 ? onClose : handlePrevStep}
            disabled={createRun.isPending || prepareRun.isPending || sendMessages.isPending}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {currentStep === 1 ? 'Cancelar' : 'Voltar'}
          </Button>

          {currentStep < 2 && (
            <Button 
              onClick={handleNextStep}
              disabled={!runName || filteredLeadsCount === 0}
            >
              Próximo
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}

          {currentStep === 2 && (
            <Button 
              onClick={handleCreateRun}
              disabled={!selectedTemplateId || createRun.isPending}
            >
              {createRun.isPending ? 'Criando...' : 'Criar Follow-up'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};