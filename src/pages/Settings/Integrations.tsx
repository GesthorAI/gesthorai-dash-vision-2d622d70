
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Key, Settings, CheckCircle, AlertCircle } from 'lucide-react';
import { useEvolutionSettings } from '@/hooks/useEvolutionSettings';
import { useEvolutionApiKeys } from '@/hooks/useEvolutionApiKeys';

export default function Integrations() {
  const { settings, saveSettings, isSaving } = useEvolutionSettings();
  const { hasEvolutionKey, hasSerpApiKey, saveKey, isSaving: isSavingKey } = useEvolutionApiKeys();

  const [formData, setFormData] = useState({
    evolution_api_url: settings?.evolution_api_url || '',
    default_instance_name: settings?.default_instance_name || '',
    evolution_api_key: '',
    serpapi_key: '',
  });

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings({
      evolution_api_url: formData.evolution_api_url,
      default_instance_name: formData.default_instance_name,
    });
  };

  const handleSaveKey = (provider: string, keyValue: string) => {
    if (!keyValue.trim()) return;
    saveKey({ provider, keyValue });
    
    // Limpar o campo após salvar
    if (provider === 'evolution_api') {
      setFormData(prev => ({ ...prev, evolution_api_key: '' }));
    } else {
      setFormData(prev => ({ ...prev, serpapi_key: '' }));
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Integrações</h1>
        <p className="text-muted-foreground">
          Configure suas integrações com APIs externas
        </p>
      </div>

      {/* Evolution API Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurações Evolution API
          </CardTitle>
          <CardDescription>
            Configure a URL da sua Evolution API e o nome da instância padrão
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="evolution_api_url">URL da Evolution API</Label>
              <Input
                id="evolution_api_url"
                type="url"
                placeholder="https://sua-evolution-api.com"
                value={formData.evolution_api_url}
                onChange={(e) => setFormData(prev => ({ ...prev, evolution_api_url: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="default_instance_name">Nome da Instância Padrão</Label>
              <Input
                id="default_instance_name"
                placeholder="gesthorai"
                value={formData.default_instance_name}
                onChange={(e) => setFormData(prev => ({ ...prev, default_instance_name: e.target.value }))}
                required
              />
            </div>

            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* API Keys Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight mb-2">Chaves de API</h2>
          <p className="text-muted-foreground">
            Gerencie suas chaves de API de forma segura
          </p>
        </div>

        {/* Evolution API Key */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Evolution API Key
              {hasEvolutionKey ? (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Configurada
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Não configurada
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Chave de autenticação para a Evolution API
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="Digite sua Evolution API Key"
                value={formData.evolution_api_key}
                onChange={(e) => setFormData(prev => ({ ...prev, evolution_api_key: e.target.value }))}
              />
              <Button 
                onClick={() => handleSaveKey('evolution_api', formData.evolution_api_key)}
                disabled={!formData.evolution_api_key.trim() || isSavingKey}
              >
                {isSavingKey ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* SerpAPI Key */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              SerpAPI Key
              {hasSerpApiKey ? (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Configurada
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Não configurada
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Chave de autenticação para a SerpAPI (pesquisas no Google)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="Digite sua SerpAPI Key"
                value={formData.serpapi_key}
                onChange={(e) => setFormData(prev => ({ ...prev, serpapi_key: e.target.value }))}
              />
              <Button 
                onClick={() => handleSaveKey('serpapi', formData.serpapi_key)}
                disabled={!formData.serpapi_key.trim() || isSavingKey}
              >
                {isSavingKey ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
