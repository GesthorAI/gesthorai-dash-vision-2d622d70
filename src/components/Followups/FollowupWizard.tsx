import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ArrowRight, Play, Sparkles, Users, Filter, MessageSquare, Send, Loader2 } from 'lucide-react';
import { useLeads } from '@/hooks/useLeads';
import { useMessageTemplates, useCreateFollowupRun, usePrepareFollowupRun, useSendFollowupMessages, useDispatchToN8n } from '@/hooks/useFollowups';
import { useAIPersonas, useAISettings, useCreateDefaultPersonas } from '@/hooks/useAIPersonas';
import { useAIFollowup } from '@/hooks/useAIFollowup';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

interface FollowupFilters {
  niche?: string;
  city?: string;
  status?: string;
  minScore?: number;
  maxDaysOld?: number;
  excludeContacted?: boolean;
}

interface PersonaConfig {
  name: string;
  systemPrompt: string;
  useJinaAI: boolean;
  messageDelay: number;
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
  const [selectedPersona, setSelectedPersona] = useState<string>('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [aiGeneratedMessages, setAiGeneratedMessages] = useState<Array<{
    message: string;
    confidence: number;
    selected?: boolean;
  }>>([]);
  const [personaConfig, setPersonaConfig] = useState<PersonaConfig>({
    name: '',
    systemPrompt: '',
    useJinaAI: false,
    messageDelay: 3
  });

  const { data: leads } = useLeads(filters);
  const { data: templates } = useMessageTemplates();
  const createRun = useCreateFollowupRun();
  const prepareRun = usePrepareFollowupRun();
  const sendMessages = useSendFollowupMessages();
  const dispatchToN8n = useDispatchToN8n();
  const { data: personas = [] } = useAIPersonas();
  const { data: aiSettings } = useAISettings();
  const { currentOrganizationId, organizations } = useOrganizationContext();
  const generateAIFollowup = useAIFollowup();
  const createDefaultPersonas = useCreateDefaultPersonas();

  // Create default personas if none exist
  React.useEffect(() => {
    if (personas.length === 0) {
      createDefaultPersonas.mutate();
    }
  }, [personas.length]);

  // Update personaConfig when selectedPersona changes
  React.useEffect(() => {
    if (selectedPersona && personas.length > 0) {
      const selectedPersonaData = personas.find(p => p.id === selectedPersona);
      if (selectedPersonaData) {
        setPersonaConfig({
          name: selectedPersonaData.name,
          systemPrompt: selectedPersonaData.guidelines || selectedPersonaData.description || `Você é ${selectedPersonaData.name}, com tom ${selectedPersonaData.tone}. ${selectedPersonaData.guidelines || ''}`,
          useJinaAI: false,
          messageDelay: 3
        });
        // Clear previous AI messages when persona changes
        setAiGeneratedMessages([]);
      }
    }
  }, [selectedPersona, personas]);

  // Auto-select first persona if none selected and personas are available
  React.useEffect(() => {
    if (!selectedPersona && personas.length > 0) {
      setSelectedPersona(personas[0].id);
    }
  }, [selectedPersona, personas]);

  // Type-safe feature flags access
  const getFeatureFlag = (flag: string): boolean => {
    return aiSettings?.feature_flags && 
           typeof aiSettings.feature_flags === 'object' && 
           aiSettings.feature_flags !== null &&
           (aiSettings.feature_flags as any)[flag] === true;
  };

  const filteredLeadsCount = leads?.length || 0;

  const handleNextStep = () => {
    const maxStep = useAI ? 5 : 4;
    if (currentStep < maxStep) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGenerateAI = async () => {
    if (!leads?.length) {
      toast.error("Nenhum lead encontrado para gerar mensagens");
      return;
    }

    try {
      const sampleLead = leads[0];
      
      const result = await generateAIFollowup.mutateAsync({
        lead: {
          name: sampleLead.name,
          business: sampleLead.business,
          niche: sampleLead.niche || undefined,
          city: sampleLead.city,
          phone: sampleLead.phone || undefined,
          email: sampleLead.email || undefined,
        },
        persona_id: selectedPersona || undefined,
        template_id: selectedTemplateId || undefined,
        custom_instructions: customInstructions || undefined,
        variations_count: 3,
      });

      setAiGeneratedMessages(result.variations.map((v, i) => ({
        ...v,
        selected: i === 0
      })));

      toast.success(`${result.variations.length} variações geradas com IA`);
    } catch (error) {
      console.error('Error generating AI messages:', error);
      toast.error("Erro ao gerar mensagens com IA");
    }
  };

  const handleCreateRun = async () => {
    if (!runName || !selectedTemplateId) return;

    try {
      const result = await createRun.mutateAsync({
        name: runName,
        filters,
        template_id: selectedTemplateId,
        status: 'preparing',
        organization_id: currentOrganizationId
      });
      
      setCurrentRunId(result.id);
      
      // Auto-trigger preparation after creating the run
      try {
        console.log('Auto-triggering preparation for run:', result.id);
        await prepareRun.mutateAsync({
          runId: result.id,
          filters,
          templateId: selectedTemplateId,
          generateWithAI: useAI,
          personaConfig: useAI ? personaConfig : undefined
        });
        
        toast.success('Campanha criada e preparada com sucesso!');
        handleNextStep();
      } catch (prepareError) {
        console.error('Error auto-preparing run:', prepareError);
        toast.error(`Campanha criada mas erro na preparação: ${prepareError.message || 'Unknown error'}`);
        handleNextStep(); // Still proceed to next step to allow manual preparation
      }
    } catch (error) {
      console.error('Error creating run:', error);
      toast.error('Erro ao criar campanha');
    }
  };

  const handlePrepareRun = async () => {
    if (!currentRunId) {
      console.error('No current run ID available');
      return;
    }

    console.log('Starting preparation with:', {
      runId: currentRunId,
      filters,
      templateId: selectedTemplateId,
      generateWithAI: useAI,
      useN8n,
      organizationId: currentOrganizationId
    });

    if (useN8n) {
      handleNextStep();
    } else {
      try {
        const result = await prepareRun.mutateAsync({
          runId: currentRunId,
          filters,
          templateId: selectedTemplateId,
          generateWithAI: useAI,
          personaConfig: useAI ? personaConfig : undefined
        });
        console.log('Preparation result:', result);
        handleNextStep();
      } catch (error) {
        console.error('Error preparing run:', error);
        toast.error(`Erro na preparação: ${error.message || 'Unknown error'}`);
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
          filters,
          personaConfig
        });
      } else {
        // Get the stored instance name from localStorage
        const storedInstanceName = localStorage.getItem('lastUsedWhatsAppInstance');
        
        await sendMessages.mutateAsync({
          runId: currentRunId,
          batchSize: 10,
          delayMs: personaConfig.messageDelay * 1000,
          instanceName: storedInstanceName || undefined,
          organizationId: currentOrganizationId
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
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="font-medium">Leads encontrados: </span>
                      <Badge variant="secondary">{filteredLeadsCount}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Organização: {organizations.find(org => org.id === currentOrganizationId)?.name || 'Carregando...'}
                    </div>
                    {filteredLeadsCount === 0 && (
                      <p className="text-sm text-destructive">
                        Nenhum lead encontrado com os filtros atuais. Ajuste os filtros para encontrar leads.
                      </p>
                    )}
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
                    disabled={useN8n || !getFeatureFlag('followup_ai')}
                    onCheckedChange={(checked) => setUseAI(!!checked)}
                  />
                  <Label htmlFor="useAI" className={`flex items-center gap-2 ${!getFeatureFlag('followup_ai') ? 'text-muted-foreground' : ''}`}>
                    <Sparkles className="h-4 w-4" />
                    Usar IA para gerar mensagens personalizadas
                    {!getFeatureFlag('followup_ai') && (
                      <span className="text-xs">(Desabilitado)</span>
                    )}
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
        return useAI ? renderAIConfigStep() : renderReviewStep();
      
      case 4:
        return useAI ? renderReviewStep() : renderExecutionStep();
        
      case 5:
        return renderExecutionStep();

      default:
        return null;
    }
  };

  const renderAIConfigStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-primary">
        <Sparkles className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Configuração da IA</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="aiPersonaConfig">Persona de IA</Label>
          <Select value={selectedPersona} onValueChange={setSelectedPersona}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar persona..." />
            </SelectTrigger>
            <SelectContent>
              {personas.map((persona) => (
                <SelectItem key={persona.id} value={persona.id}>
                  {persona.name} - {persona.tone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedPersona && (
            <p className="text-sm text-muted-foreground mt-1">
              {personas.find(p => p.id === selectedPersona)?.description}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="customInstructionsConfig">Instruções Personalizadas</Label>
          <Textarea
            id="customInstructionsConfig"
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="Ex: Mencionar uma promoção especial, focar em economia de custos, usar tom mais urgente..."
            className="min-h-[100px]"
          />
        </div>

        <div className="bg-muted p-4 rounded-md">
          <h4 className="font-medium mb-2">Gerar Prévia</h4>
          <Button
            onClick={handleGenerateAI}
            disabled={generateAIFollowup.isPending || !leads?.length}
            className="w-full"
          >
            {generateAIFollowup.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando mensagens...
              </>
            ) : (
              'Gerar 3 Variações com IA'
            )}
          </Button>
        </div>

        {aiGeneratedMessages.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Variações Geradas - Selecione uma:</h4>
            {aiGeneratedMessages.map((msg, index) => (
              <div
                key={index}
                className={`p-3 border rounded-md cursor-pointer transition-colors ${
                  msg.selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                }`}
                onClick={() => {
                  setAiGeneratedMessages(prev => 
                    prev.map((m, i) => ({ ...m, selected: i === index }))
                  );
                }}
              >
                <div className="flex items-start justify-between">
                  <p className="text-sm flex-1">{msg.message}</p>
                  <div className="ml-2 text-xs text-muted-foreground">
                    Confiança: {Math.round(msg.confidence * 100)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-primary">
        <Play className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Revisão</h3>
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

          {useAI && aiGeneratedMessages.some(m => m.selected) && (
            <div>
              <Label className="font-medium">Mensagem selecionada:</Label>
              <div className="mt-2 p-3 bg-muted rounded-md">
                <p className="text-sm">
                  {aiGeneratedMessages.find(m => m.selected)?.message}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderExecutionStep = () => (
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
                  <li>• Intervalo de {personaConfig.messageDelay} segundos entre mensagens</li>
                  <li>• Monitoramento automático de falhas</li>
                  {useAI && <li>• Mensagens personalizadas com IA</li>}
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

  const isNextDisabled = () => {
    switch (currentStep) {
      case 1:
        return !runName || filteredLeadsCount === 0;
      case 2:
        return !selectedTemplateId;
      case 3:
        if (useAI) {
          return !aiGeneratedMessages.some(m => m.selected);
        }
        return false;
      default:
        return false;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return "Filtros";
      case 2:
        return "Template";
      case 3:
        return useAI ? "IA" : "Revisão";
      case 4:
        return useAI ? "Revisão" : "Envio";
      case 5:
        return "Envio";
      default:
        return `Passo ${currentStep}`;
    }
  };

  const maxSteps = useAI ? 5 : 4;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Novo Follow-up WhatsApp</CardTitle>
        <CardDescription>
          Crie e envie follow-ups personalizados para seus leads
        </CardDescription>
        
        <div className="flex items-center space-x-2 mb-6">
          {Array.from({ length: maxSteps }, (_, i) => i + 1).map((step) => (
            <div
              key={step}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step <= currentStep
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step}
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {renderStepContent()}

        <div className="flex justify-between pt-6 border-t mt-6">
          <Button
            variant="outline"
            onClick={currentStep === 1 ? onClose : handlePrevStep}
          >
            {currentStep === 1 ? "Cancelar" : "Voltar"}
          </Button>
          
          {(() => {
            const reviewStep = useAI ? 4 : 3;
            const executionStep = useAI ? 5 : 4;
            
            if (currentStep < reviewStep) {
              return (
                <Button onClick={handleNextStep} disabled={isNextDisabled()}>
                  Próximo
                </Button>
              );
            } else if (currentStep === reviewStep && !currentRunId) {
              return (
                <Button
                  onClick={handleCreateRun}
                  disabled={createRun.isPending}
                >
                  {createRun.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    "Criar Campanha"
                  )}
                </Button>
              );
            } else if (currentStep === executionStep && currentRunId) {
              return (
                <Button
                  onClick={handlePrepareRun}
                  disabled={prepareRun.isPending}
                >
                  {prepareRun.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Preparando...
                    </>
                  ) : (
                    "Preparar Mensagens"
                  )}
                </Button>
              );
            } else {
              return (
                <Button
                  onClick={handleSendMessages}
                  disabled={sendMessages.isPending}
                >
                  {sendMessages.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar Mensagens"
                  )}
                </Button>
              );
            }
          })()}
        </div>
      </CardContent>
    </Card>
  );
};