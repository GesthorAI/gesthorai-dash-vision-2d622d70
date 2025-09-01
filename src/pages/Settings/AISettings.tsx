import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Brain, 
  Key, 
  TestTube, 
  Settings, 
  Zap, 
  BarChart, 
  Plus, 
  Edit, 
  Trash2,
  ExternalLink,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Save,
  AlertTriangle
} from "lucide-react";
import { useAISettings } from "@/hooks/useAIPersonas";
import { useUpdateAISettings, useAISecretStatus, useAISmoketest } from "@/hooks/useUpdateAISettings";
import { useAIPersonas, useCreatePersona, useUpdatePersona, AIPersona } from "@/hooks/useAIPersonas";
import { useUserAPIKeyStatus, useSaveUserAPIKey, useRemoveUserAPIKey } from "@/hooks/useUserAPIKeys";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";

const AVAILABLE_MODELS = [
  { value: "gpt-5-2025-08-07", label: "GPT-5 (Mais Avançado)" },
  { value: "gpt-5-mini-2025-08-07", label: "GPT-5 Mini (Rápido)" },
  { value: "gpt-4.1-2025-04-14", label: "GPT-4.1 (Confiável)" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini (Econômico)" },
];

const TONE_OPTIONS = [
  { value: "professional", label: "Profissional" },
  { value: "friendly", label: "Amigável" },
  { value: "technical", label: "Técnico" },
  { value: "casual", label: "Casual" },
];

export const AISettings = () => {
  const { toast } = useToast();
  const [isPersonaDialogOpen, setIsPersonaDialogOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<AIPersona | null>(null);
  const [secretStatus, setSecretStatus] = useState<any>(null);
  const [smoketestResult, setSmoketestResult] = useState<any>(null);
  const [userApiKey, setUserApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  // Queries
  const { data: aiSettings, isLoading: settingsLoading } = useAISettings();
  const { data: personas = [], isLoading: personasLoading } = useAIPersonas();
  const { data: keyStatus, isLoading: keyStatusLoading } = useUserAPIKeyStatus();
  
  // Mutations
  const updateSettings = useUpdateAISettings();
  const checkSecretStatus = useAISecretStatus();
  const runSmoketest = useAISmoketest();
  const createPersona = useCreatePersona();
  const updatePersona = useUpdatePersona();
  const saveUserAPIKey = useSaveUserAPIKey();
  const removeUserAPIKey = useRemoveUserAPIKey();

  const handleCheckSecretStatus = async () => {
    try {
      const result = await checkSecretStatus.mutateAsync();
      setSecretStatus(result);
      toast({
        title: "Status verificado",
        description: result.message,
      });
    } catch (error) {
      toast({
        title: "Erro ao verificar status",
        description: "Não foi possível verificar o status da chave API",
        variant: "destructive",
      });
    }
  };

  const handleSmoketest = async () => {
    try {
      const result = await runSmoketest.mutateAsync();
      setSmoketestResult(result);
      toast({
        title: result.success ? "Teste bem-sucedido" : "Teste falhou",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Erro no teste",
        description: "Não foi possível testar a conexão",
        variant: "destructive",
      });
    }
  };

  const handleSaveUserAPIKey = async () => {
    if (!userApiKey.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira uma chave API válida",
        variant: "destructive",
      });
      return;
    }

    try {
      await saveUserAPIKey.mutateAsync({ apiKey: userApiKey });
      setUserApiKey("");
      toast({
        title: "Chave salva",
        description: "Sua chave OpenAI foi salva com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar chave",
        description: error.message || "Não foi possível salvar a chave API",
        variant: "destructive",
      });
    }
  };

  const handleRemoveUserAPIKey = async () => {
    try {
      await removeUserAPIKey.mutateAsync();
      toast({
        title: "Chave removida",
        description: "Sua chave OpenAI foi removida com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao remover chave",
        description: error.message || "Não foi possível remover a chave API",
        variant: "destructive",
      });
    }
  };

  const handleUpdateSettings = async (updates: any) => {
    try {
      await updateSettings.mutateAsync(updates);
      toast({
        title: "Configurações salvas",
        description: "As configurações de IA foram atualizadas com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações",
        variant: "destructive",
      });
    }
  };

  const handleSavePersona = async (personaData: any) => {
    try {
      if (editingPersona) {
        await updatePersona.mutateAsync({ id: editingPersona.id, ...personaData });
        toast({
          title: "Persona atualizada",
          description: "A persona foi atualizada com sucesso",
        });
      } else {
        await createPersona.mutateAsync(personaData);
        toast({
          title: "Persona criada",
          description: "Nova persona criada com sucesso",
        });
      }
      setIsPersonaDialogOpen(false);
      setEditingPersona(null);
    } catch (error) {
      toast({
        title: "Erro ao salvar persona",
        description: "Não foi possível salvar a persona",
        variant: "destructive",
      });
    }
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const featureFlags = aiSettings?.feature_flags as any;
  const limits = aiSettings?.limits as any;
  
  const currentModel = featureFlags?.model || "gpt-4o-mini";
  const currentTemperature = featureFlags?.temperature || 0.7;
  const currentMaxTokens = featureFlags?.max_tokens || 1000;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-brand-primary to-brand-primary-light rounded-lg">
          <Brain className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações de IA</h1>
          <p className="text-muted-foreground">Gerencie as configurações e personas de inteligência artificial</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* API Key Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Gerenciar Chave API
            </CardTitle>
            <CardDescription>
              Configure sua chave OpenAI pessoal para uso personalizado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {keyStatusLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status Atual:</span>
                  {keyStatus?.hasAnyOpenAIKey ? (
                    <Badge variant="default" className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      {keyStatus.priority === 'user' ? 'Chave Pessoal' : 'Chave do Sistema'}
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <XCircle className="h-3 w-3" />
                      Não Configurado
                    </Badge>
                  )}
                </div>

                {keyStatus?.message && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{keyStatus.message}</AlertDescription>
                  </Alert>
                )}

                {keyStatus?.hasUserOpenAIKey && keyStatus.userKeyInfo && (
                  <div className="text-xs text-muted-foreground">
                    Última atualização: {new Date(keyStatus.userKeyInfo.updated_at).toLocaleString('pt-BR')}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="user-api-key">Sua Chave OpenAI</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="user-api-key"
                          type={showApiKey ? "text" : "password"}
                          value={userApiKey}
                          onChange={(e) => setUserApiKey(e.target.value)}
                          placeholder="sk-..."
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-2"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <Button
                        onClick={handleSaveUserAPIKey}
                        disabled={saveUserAPIKey.isPending || !userApiKey.trim()}
                        size="sm"
                      >
                        {saveUserAPIKey.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Sua chave será criptografada e armazenada com segurança
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {keyStatus?.hasUserOpenAIKey && (
                      <Button
                        onClick={handleRemoveUserAPIKey}
                        disabled={removeUserAPIKey.isPending}
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                      >
                        {removeUserAPIKey.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        Remover Chave
                      </Button>
                    )}
                    
                    <Button 
                      onClick={() => window.open('https://platform.openai.com/api-keys', '_blank')}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Obter Chave OpenAI
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Provider & API Key Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Teste de Conexão
            </CardTitle>
            <CardDescription>
              Verifique o status e teste a conexão com a API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status da Chave:</span>
              {secretStatus ? (
                <Badge variant={secretStatus.hasOpenAIKey ? "default" : "destructive"}>
                  {secretStatus.hasOpenAIKey ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : (
                    <XCircle className="h-3 w-3 mr-1" />
                  )}
                  {secretStatus.status === 'configured' ? 'Configurada' : 'Não configurada'}
                </Badge>
              ) : (
                <Badge variant="outline">Não verificado</Badge>
              )}
            </div>

            {smoketestResult && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Último Teste:</span>
                <Badge variant={smoketestResult.success ? "default" : "destructive"}>
                  {smoketestResult.success ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      OK ({smoketestResult.latency}ms)
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 mr-1" />
                      Falhou
                    </>
                  )}
                </Badge>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={handleCheckSecretStatus}
                disabled={checkSecretStatus.isPending}
                variant="outline"
                className="flex-1"
              >
                {checkSecretStatus.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Key className="h-4 w-4 mr-2" />
                )}
                Verificar Status
              </Button>
              
              <Button 
                onClick={handleSmoketest}
                disabled={runSmoketest.isPending || (!keyStatus?.hasAnyOpenAIKey && !secretStatus?.hasOpenAIKey)}
                variant="outline"
                className="flex-1"
              >
                {runSmoketest.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <TestTube className="h-4 w-4 mr-2" />
                )}
                Testar Conexão
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Model & Parameters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Modelo e Parâmetros
            </CardTitle>
            <CardDescription>
              Configurações do modelo de IA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Modelo de IA</Label>
              <Select 
                value={currentModel} 
                onValueChange={(value) => handleUpdateSettings({
                  feature_flags: { ...featureFlags, model: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_MODELS.map(model => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Temperatura: {currentTemperature}</Label>
              <Slider
                value={[currentTemperature]}
                onValueChange={(values) => handleUpdateSettings({
                  feature_flags: { ...featureFlags, temperature: values[0] }
                })}
                min={0}
                max={2}
                step={0.1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                0 = mais conservador, 2 = mais criativo
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-tokens">Máximo de Tokens</Label>
              <Input
                id="max-tokens"
                type="number"
                value={currentMaxTokens}
                onChange={(e) => handleUpdateSettings({
                  feature_flags: { ...featureFlags, max_tokens: parseInt(e.target.value) }
                })}
                min={100}
                max={4000}
              />
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Funcionalidades
            </CardTitle>
            <CardDescription>
              Ativar ou desativar recursos de IA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'followup_ai', label: 'IA para Follow-ups', description: 'Geração automática de mensagens' },
              { key: 'lead_scoring_ai', label: 'Score de Leads com IA', description: 'Análise inteligente de qualidade' },
              { key: 'auto_dedupe', label: 'Deduplicação Automática', description: 'Remoção automática de duplicatas' },
              { key: 'semantic_search', label: 'Busca Semântica', description: 'Busca inteligente por contexto' },
              { key: 'auto_reply', label: 'Respostas Automáticas', description: 'Respostas automáticas a leads' },
            ].map((feature) => (
              <div key={feature.key} className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{feature.label}</Label>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </div>
                <Switch
                  checked={featureFlags?.[feature.key] || false}
                  onCheckedChange={(checked) => handleUpdateSettings({
                    feature_flags: { ...featureFlags, [feature.key]: checked }
                  })}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Usage Limits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              Limites de Uso
            </CardTitle>
            <CardDescription>
              Controle de consumo de tokens
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="daily-tokens">Tokens Diários</Label>
              <Input
                id="daily-tokens"
                type="number"
                value={limits?.daily_tokens || 50000}
                onChange={(e) => handleUpdateSettings({
                  limits: { ...limits, daily_tokens: parseInt(e.target.value) }
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weekly-tokens">Tokens Semanais</Label>
              <Input
                id="weekly-tokens"
                type="number"
                value={limits?.weekly_tokens || 300000}
                onChange={(e) => handleUpdateSettings({
                  limits: { ...limits, weekly_tokens: parseInt(e.target.value) }
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="concurrent-requests">Requisições Simultâneas</Label>
              <Input
                id="concurrent-requests"
                type="number"
                value={limits?.max_concurrent_requests || 5}
                onChange={(e) => handleUpdateSettings({
                  limits: { ...limits, max_concurrent_requests: parseInt(e.target.value) }
                })}
                min={1}
                max={20}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Personas Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Personas de IA
              </CardTitle>
              <CardDescription>
                Gerencie diferentes personalidades para suas interações de IA
              </CardDescription>
            </div>
            
            <Dialog open={isPersonaDialogOpen} onOpenChange={setIsPersonaDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingPersona(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Persona
                </Button>
              </DialogTrigger>
              <PersonaDialog
                persona={editingPersona}
                onSave={handleSavePersona}
                onCancel={() => {
                  setIsPersonaDialogOpen(false);
                  setEditingPersona(null);
                }}
              />
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {personasLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {personas.map((persona) => (
                <Card key={persona.id} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold">{persona.name}</h4>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingPersona(persona);
                            setIsPersonaDialogOpen(true);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {persona.description && (
                      <p className="text-sm text-muted-foreground mb-2">{persona.description}</p>
                    )}
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{TONE_OPTIONS.find(t => t.value === persona.tone)?.label}</Badge>
                      {persona.is_active && (
                        <Badge variant="default">Ativo</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Persona Dialog Component
interface PersonaDialogProps {
  persona: AIPersona | null;
  onSave: (data: any) => void;
  onCancel: () => void;
}

const PersonaDialog = ({ persona, onSave, onCancel }: PersonaDialogProps) => {
  const [formData, setFormData] = useState({
    name: persona?.name || "",
    description: persona?.description || "",
    tone: persona?.tone || "professional",
    guidelines: persona?.guidelines || "",
    language: persona?.language || "pt-BR",
    is_active: persona?.is_active ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <DialogContent aria-describedby={undefined} className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>
          {persona ? "Editar Persona" : "Nova Persona"}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tone">Tom</Label>
            <Select value={formData.tone} onValueChange={(value) => setFormData({ ...formData, tone: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Input
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="guidelines">Diretrizes</Label>
          <Textarea
            id="guidelines"
            value={formData.guidelines}
            onChange={(e) => setFormData({ ...formData, guidelines: e.target.value })}
            rows={4}
            placeholder="Instruções específicas para esta persona..."
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
          <Label>Persona ativa</Label>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">
            Salvar
          </Button>
        </div>
      </form>
    </DialogContent>
  );
};
