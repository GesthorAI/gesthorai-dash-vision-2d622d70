import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { useWhatsAppInstances } from '@/hooks/useWhatsAppInstances';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

interface WhatsAppInstanceSelectorProps {
  selectedInstance?: string;
  onInstanceChange: (instanceName: string | undefined) => void;
}

export const WhatsAppInstanceSelector: React.FC<WhatsAppInstanceSelectorProps> = ({
  selectedInstance,
  onInstanceChange
}) => {
  const { currentOrganizationId } = useOrganizationContext();
  const { data: instances, isLoading, refetch } = useWhatsAppInstances();

  // Filter instances for current organization
  const organizationInstances = instances?.filter(instance => 
    (instance as any).organization_id === currentOrganizationId
  ) || [];

  const getStatusIcon = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case 'open':
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'connecting':
      case 'qrcode':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case 'open':
      case 'connected':
        return <Badge variant="default" className="text-xs">Conectado</Badge>;
      case 'connecting':
        return <Badge variant="secondary" className="text-xs">Conectando</Badge>;
      case 'qrcode':
        return <Badge variant="secondary" className="text-xs">QR Code</Badge>;
      default:
        return <Badge variant="destructive" className="text-xs">Desconectado</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Instância WhatsApp
        </CardTitle>
        <CardDescription>
          Selecione a instância WhatsApp para envio das mensagens
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Carregando instâncias...</span>
          </div>
        ) : organizationInstances.length === 0 ? (
          <div className="text-center p-6 bg-muted/50 rounded-lg">
            <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              Nenhuma instância WhatsApp encontrada para esta organização
            </p>
            <p className="text-xs text-muted-foreground">
              Configure uma instância WhatsApp na aba Organização primeiro
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="instance-select">Instância Selecionada</Label>
              <div className="flex gap-2">
                <Select value={selectedInstance || ""} onValueChange={onInstanceChange}>
                  <SelectTrigger id="instance-select">
                    <SelectValue placeholder="Selecionar instância..." />
                  </SelectTrigger>
                  <SelectContent>
                    {organizationInstances.map((instance) => (
                      <SelectItem key={instance.id} value={instance.name}>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(instance.last_status)}
                          <span>{instance.name}</span>
                          {instance.profile_name && (
                            <span className="text-xs text-muted-foreground">
                              ({instance.profile_name})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => refetch()}
                  title="Atualizar lista"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Instance details */}
            {organizationInstances.map((instance) => (
              <div 
                key={instance.id} 
                className={`p-3 border rounded-lg ${
                  selectedInstance === instance.name ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(instance.last_status)}
                    <span className="font-medium">{instance.name}</span>
                  </div>
                  {getStatusBadge(instance.last_status)}
                </div>
                
                {instance.profile_name && (
                  <p className="text-sm text-muted-foreground mb-1">
                    <strong>Perfil:</strong> {instance.profile_name}
                  </p>
                )}
                
                {instance.number && (
                  <p className="text-sm text-muted-foreground mb-1">
                    <strong>Número:</strong> {instance.number}
                  </p>
                )}
                
                <p className="text-xs text-muted-foreground">
                  Criada em: {new Date(instance.created_at).toLocaleString('pt-BR')}
                </p>

                {instance.last_status?.toLowerCase() === 'qrcode' && (
                  <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs">
                    <AlertTriangle className="h-3 w-3 inline mr-1" />
                    Esta instância precisa escanear o QR Code para conectar
                  </div>
                )}

                {!['open', 'connected', 'connecting'].includes(instance.last_status?.toLowerCase() || '') && (
                  <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs">
                    <XCircle className="h-3 w-3 inline mr-1" />
                    Esta instância não está conectada e não pode enviar mensagens
                  </div>
                )}
              </div>
            ))}

            {selectedInstance && (
              <p className="text-xs text-muted-foreground">
                * A instância selecionada será salva para próximos envios
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};