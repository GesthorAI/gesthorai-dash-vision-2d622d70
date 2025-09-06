import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  useAdvancedAISettings, 
  useUpdateAdvancedAISettings,
  useEmbeddingsCache,
  useClearEmbeddingsCache 
} from '@/hooks/useAdvancedAISettings';
import { 
  Settings, 
  Zap, 
  DollarSign, 
  Database, 
  Trash2,
  Save,
  AlertCircle,
  HardDrive
} from 'lucide-react';

const AVAILABLE_MODELS = [
  { value: 'gpt-5-2025-08-07', label: 'GPT-5 (Flagship)' },
  { value: 'gpt-5-mini-2025-08-07', label: 'GPT-5 Mini (Fast)' },
  { value: 'gpt-5-nano-2025-08-07', label: 'GPT-5 Nano (Fastest)' },
  { value: 'gpt-4.1-2025-04-14', label: 'GPT-4.1 (Reliable)' },
  { value: 'gpt-4.1-mini-2025-04-14', label: 'GPT-4.1 Mini (Vision)' },
  { value: 'o3-2025-04-16', label: 'O3 (Reasoning)' },
  { value: 'o4-mini-2025-04-16', label: 'O4 Mini (Fast Reasoning)' }
];

const EMBEDDING_MODELS = [
  { value: 'text-embedding-3-small', label: 'Text Embedding 3 Small' },
  { value: 'text-embedding-3-large', label: 'Text Embedding 3 Large' },
  { value: 'text-embedding-ada-002', label: 'Text Embedding Ada 002' }
];

export const AdvancedAISettingsPanel = () => {
  const { data: settings, isLoading } = useAdvancedAISettings();
  const { data: cacheStats } = useEmbeddingsCache();
  const updateSettings = useUpdateAdvancedAISettings();
  const clearCache = useClearEmbeddingsCache();

  const [formData, setFormData] = useState({
    model_preferences: {
      default_model: settings?.model_preferences?.default_model || 'gpt-5-mini-2025-08-07',
      fallback_model: settings?.model_preferences?.fallback_model || 'gpt-4.1-mini-2025-04-14',
      embedding_model: settings?.model_preferences?.embedding_model || 'text-embedding-3-small'
    },
    performance_settings: {
      max_concurrent_requests: settings?.performance_settings?.max_concurrent_requests || 5,
      timeout_seconds: settings?.performance_settings?.timeout_seconds || 30,
      retry_attempts: settings?.performance_settings?.retry_attempts || 3,
      cache_embeddings: settings?.performance_settings?.cache_embeddings ?? true
    },
    cost_controls: {
      daily_cost_limit: settings?.cost_controls?.daily_cost_limit || 10.0,
      monthly_cost_limit: settings?.cost_controls?.monthly_cost_limit || 100.0,
      auto_disable_on_limit: settings?.cost_controls?.auto_disable_on_limit ?? true,
      cost_alerts: settings?.cost_controls?.cost_alerts ?? true
    }
  });

  // Update form when settings load
  React.useEffect(() => {
    if (settings) {
      setFormData({
        model_preferences: {
          default_model: settings.model_preferences?.default_model || 'gpt-5-mini-2025-08-07',
          fallback_model: settings.model_preferences?.fallback_model || 'gpt-4.1-mini-2025-04-14',
          embedding_model: settings.model_preferences?.embedding_model || 'text-embedding-3-small'
        },
        performance_settings: {
          max_concurrent_requests: settings.performance_settings?.max_concurrent_requests || 5,
          timeout_seconds: settings.performance_settings?.timeout_seconds || 30,
          retry_attempts: settings.performance_settings?.retry_attempts || 3,
          cache_embeddings: settings.performance_settings?.cache_embeddings ?? true
        },
        cost_controls: {
          daily_cost_limit: settings.cost_controls?.daily_cost_limit || 10.0,
          monthly_cost_limit: settings.cost_controls?.monthly_cost_limit || 100.0,
          auto_disable_on_limit: settings.cost_controls?.auto_disable_on_limit ?? true,
          cost_alerts: settings.cost_controls?.cost_alerts ?? true
        }
      });
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate(formData);
  };

  const handleClearCache = (options?: { contentType?: string }) => {
    clearCache.mutate(options);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Configurações Avançadas de IA</CardTitle>
          <CardDescription>Carregando configurações...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Preferências de Modelo
          </CardTitle>
          <CardDescription>
            Configure os modelos de IA utilizados para cada funcionalidade
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Modelo Padrão</Label>
              <Select
                value={formData.model_preferences.default_model}
                onValueChange={(value) => setFormData({
                  ...formData,
                  model_preferences: {
                    ...formData.model_preferences,
                    default_model: value
                  }
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
              <Label>Modelo de Fallback</Label>
              <Select
                value={formData.model_preferences.fallback_model}
                onValueChange={(value) => setFormData({
                  ...formData,
                  model_preferences: {
                    ...formData.model_preferences,
                    fallback_model: value
                  }
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
              <Label>Modelo de Embeddings</Label>
              <Select
                value={formData.model_preferences.embedding_model}
                onValueChange={(value) => setFormData({
                  ...formData,
                  model_preferences: {
                    ...formData.model_preferences,
                    embedding_model: value
                  }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMBEDDING_MODELS.map(model => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Performance e Limites
          </CardTitle>
          <CardDescription>
            Configure limites de performance e comportamento do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Requisições Simultâneas</Label>
              <Input
                type="number"
                min="1"
                max="20"
                value={formData.performance_settings.max_concurrent_requests}
                onChange={(e) => setFormData({
                  ...formData,
                  performance_settings: {
                    ...formData.performance_settings,
                    max_concurrent_requests: Number(e.target.value)
                  }
                })}
              />
            </div>

            <div className="space-y-2">
              <Label>Timeout (segundos)</Label>
              <Input
                type="number"
                min="10"
                max="300"
                value={formData.performance_settings.timeout_seconds}
                onChange={(e) => setFormData({
                  ...formData,
                  performance_settings: {
                    ...formData.performance_settings,
                    timeout_seconds: Number(e.target.value)
                  }
                })}
              />
            </div>

            <div className="space-y-2">
              <Label>Tentativas de Retry</Label>
              <Input
                type="number"
                min="0"
                max="5"
                value={formData.performance_settings.retry_attempts}
                onChange={(e) => setFormData({
                  ...formData,
                  performance_settings: {
                    ...formData.performance_settings,
                    retry_attempts: Number(e.target.value)
                  }
                })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.performance_settings.cache_embeddings}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  performance_settings: {
                    ...formData.performance_settings,
                    cache_embeddings: checked
                  }
                })}
              />
              <Label>Habilitar Cache de Embeddings</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Controle de Custos
          </CardTitle>
          <CardDescription>
            Configure limites de custo e alertas para evitar gastos excessivos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Limite Diário ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.cost_controls.daily_cost_limit}
                onChange={(e) => setFormData({
                  ...formData,
                  cost_controls: {
                    ...formData.cost_controls,
                    daily_cost_limit: Number(e.target.value)
                  }
                })}
              />
            </div>

            <div className="space-y-2">
              <Label>Limite Mensal ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.cost_controls.monthly_cost_limit}
                onChange={(e) => setFormData({
                  ...formData,
                  cost_controls: {
                    ...formData.cost_controls,
                    monthly_cost_limit: Number(e.target.value)
                  }
                })}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.cost_controls.auto_disable_on_limit}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  cost_controls: {
                    ...formData.cost_controls,
                    auto_disable_on_limit: checked
                  }
                })}
              />
              <Label>Desabilitar IA automaticamente ao atingir limite</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.cost_controls.cost_alerts}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  cost_controls: {
                    ...formData.cost_controls,
                    cost_alerts: checked
                  }
                })}
              />
              <Label>Receber alertas de custo</Label>
            </div>
          </div>

          {formData.cost_controls.auto_disable_on_limit && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Com esta opção habilitada, todas as funcionalidades de IA serão 
                automaticamente desabilitadas quando o limite de custo for atingido.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {cacheStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Cache de Embeddings
            </CardTitle>
            <CardDescription>
              Gerencie o cache de embeddings para melhorar a performance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{cacheStats.totalCached}</div>
                <div className="text-sm text-muted-foreground">Entradas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{cacheStats.totalAccesses}</div>
                <div className="text-sm text-muted-foreground">Acessos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{cacheStats.averageAccess.toFixed(1)}</div>
                <div className="text-sm text-muted-foreground">Média</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {Object.keys(cacheStats.contentTypeStats).length}
                </div>
                <div className="text-sm text-muted-foreground">Tipos</div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipos de Conteúdo em Cache</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(cacheStats.contentTypeStats).map(([type, count]) => (
                  <Badge key={type} variant="outline">
                    {type}: {count}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleClearCache()}
                disabled={clearCache.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar Expirados
              </Button>
              
              {Object.keys(cacheStats.contentTypeStats).map((type) => (
                <Button
                  key={type}
                  variant="outline"
                  size="sm"
                  onClick={() => handleClearCache({ contentType: type })}
                  disabled={clearCache.isPending}
                >
                  <HardDrive className="h-4 w-4 mr-2" />
                  Limpar {type}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={updateSettings.isPending}
          className="min-w-32"
        >
          <Save className="h-4 w-4 mr-2" />
          {updateSettings.isPending ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  );
};