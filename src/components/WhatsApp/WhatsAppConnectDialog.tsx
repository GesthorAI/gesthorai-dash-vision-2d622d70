
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useWhatsAppInstances, useEvolutionAPI } from "@/hooks/useWhatsAppInstances";
import { Loader2, Smartphone, RefreshCw, QrCode, CheckCircle, XCircle, Wifi, WifiOff, Plus, Trash2 } from "lucide-react";

export const WhatsAppConnectDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [instanceName, setInstanceName] = useState('');
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  
  const { toast } = useToast();
  const { data: instances = [], isLoading: instancesLoading } = useWhatsAppInstances();
  const evolutionAPI = useEvolutionAPI();

  // Load last used instance name from localStorage
  useEffect(() => {
    const lastInstanceName = localStorage.getItem('lastWhatsAppInstanceName');
    if (lastInstanceName) {
      setInstanceName(lastInstanceName);
    }
  }, []);

  // Validate instance name
  const isValidInstanceName = (name: string) => {
    return /^[a-zA-Z0-9_-]{3,50}$/.test(name);
  };

  const callEvolutionAPI = async (action: string, targetInstanceName?: string) => {
    try {
      const result = await evolutionAPI.mutateAsync({ 
        action, 
        instanceName: targetInstanceName || instanceName 
      });
      return result;
    } catch (error: any) {
      throw new Error(error.message || 'Erro na API Evolution');
    }
  };

  const checkInstanceStatus = async (targetInstanceName?: string) => {
    try {
      const result = await callEvolutionAPI('status', targetInstanceName);
      if (result.success) {
        const status = result.status || 'disconnected';
        if (status === 'open') {
          setQrCode(null);
          setPolling(false);
        }
        return status;
      }
    } catch (error) {
      console.error('Error checking status:', error);
    }
    return 'disconnected';
  };

  const createInstance = async () => {
    if (!instanceName || !isValidInstanceName(instanceName)) {
      toast({
        title: "Nome inválido",
        description: "Use 3-50 caracteres alfanuméricos, _ ou -",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await callEvolutionAPI('create');
      
      if (result.success) {
        localStorage.setItem('lastWhatsAppInstanceName', instanceName);
        toast({
          title: "Instância criada",
          description: "Instância WhatsApp criada com sucesso!",
        });
        await connectInstance();
      } else {
        setError(result.error || 'Erro ao criar instância');
      }
    } catch (error: any) {
      setError(error.message || 'Erro ao criar instância');
      toast({
        title: "Erro",
        description: error.message || 'Erro ao criar instância',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const connectInstance = async (targetInstanceName?: string) => {
    const nameToUse = targetInstanceName || instanceName;
    if (!nameToUse) return;

    setLoading(true);
    setError(null);
    
    try {
      const result = await callEvolutionAPI('connect', nameToUse);
      
      if (result.success && result.qrcode) {
        setQrCode(result.qrcode);
        setPolling(true);
        toast({
          title: "QR Code gerado",
          description: "Escaneie o código QR com seu WhatsApp",
        });
      } else {
        setError(result.error || 'Erro ao gerar QR Code');
      }
    } catch (error: any) {
      setError(error.message || 'Erro ao conectar instância');
      toast({
        title: "Erro",
        description: error.message || 'Erro ao conectar instância',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const disconnectInstance = async (targetInstanceName?: string) => {
    const nameToUse = targetInstanceName || instanceName;
    if (!nameToUse) return;

    setLoading(true);
    setError(null);
    
    try {
      const result = await callEvolutionAPI('disconnect', nameToUse);
      
      if (result.success) {
        setQrCode(null);
        setPolling(false);
        toast({
          title: "Desconectado",
          description: "Instância desconectada com sucesso",
        });
      } else {
        setError(result.error || 'Erro ao desconectar');
      }
    } catch (error: any) {
      setError(error.message || 'Erro ao desconectar instância');
      toast({
        title: "Erro",
        description: error.message || 'Erro ao desconectar instância',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshQrCode = async () => {
    if (!instanceName) return;

    setLoading(true);
    setError(null);
    
    try {
      const result = await callEvolutionAPI('qrcode');
      
      if (result.success && result.qrcode) {
        setQrCode(result.qrcode);
      } else {
        setError(result.error || 'Erro ao atualizar QR Code');
      }
    } catch (error: any) {
      setError(error.message || 'Erro ao atualizar QR Code');
    } finally {
      setLoading(false);
    }
  };

  // Poll for status changes when QR is displayed
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (polling && qrCode && instanceName) {
      interval = setInterval(() => checkInstanceStatus(), 3000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [polling, qrCode, instanceName]);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Conectado</Badge>;
      case 'connecting':
      case 'qr_generated':
        return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Conectando</Badge>;
      case 'qrReadSuccess':
        return <Badge variant="secondary"><Wifi className="w-3 h-3 mr-1" />QR Lido</Badge>;
      default:
        return <Badge variant="outline"><WifiOff className="w-3 h-3 mr-1" />Desconectado</Badge>;
    }
  };

  const selectedInstance = instances.find(i => i.id === selectedInstanceId);
  const currentInstanceName = selectedInstance?.name || instanceName;
  const currentStatus = selectedInstance?.last_status || 'disconnected';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Smartphone className="w-4 h-4 mr-2" />
          WhatsApp
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Gerenciar WhatsApp
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instance Selection */}
          <div className="space-y-2">
            <Label htmlFor="instance-select">Instância</Label>
            <div className="flex gap-2">
              <Select
                value={selectedInstanceId}
                onValueChange={(value) => {
                  if (value === 'new') {
                    setIsCreatingNew(true);
                    setSelectedInstanceId('');
                    setInstanceName('');
                  } else {
                    setIsCreatingNew(false);
                    setSelectedInstanceId(value);
                    const selected = instances.find(i => i.id === value);
                    if (selected) {
                      setInstanceName(selected.name);
                    }
                  }
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione ou crie uma instância" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Nova Instância
                    </div>
                  </SelectItem>
                  {instances.map((instance) => (
                    <SelectItem key={instance.id} value={instance.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{instance.name}</span>
                        {getStatusBadge(instance.last_status)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Instance Name Input (for new instances or editing) */}
          {(isCreatingNew || !selectedInstanceId) && (
            <div className="space-y-2">
              <Label htmlFor="instance-name">Nome da Instância *</Label>
              <Input
                id="instance-name"
                placeholder="ex: vendas-principal"
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                className={!isValidInstanceName(instanceName) && instanceName ? 'border-red-500' : ''}
              />
              <p className="text-xs text-muted-foreground">
                3-50 caracteres alfanuméricos, _ ou -
              </p>
            </div>
          )}

          {/* Current Instance Status */}
          {currentInstanceName && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Instância: {currentInstanceName}</span>
                  {getStatusBadge(currentStatus)}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {currentStatus === 'open' ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      WhatsApp conectado e pronto para enviar mensagens!
                    </p>
                    {selectedInstance?.number && (
                      <p className="text-xs text-muted-foreground">
                        Número: {selectedInstance.number}
                      </p>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => disconnectInstance()}
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                      Desconectar
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {qrCode ? (
                      <div className="space-y-3">
                        <div className="flex justify-center">
                          <img 
                            src={qrCode} 
                            alt="QR Code WhatsApp" 
                            className="w-48 h-48 border rounded-lg"
                          />
                        </div>
                        <p className="text-xs text-center text-muted-foreground">
                          Abra o WhatsApp → Mais opções → Aparelhos conectados → Conectar um aparelho
                        </p>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={refreshQrCode}
                            disabled={loading}
                            className="flex-1"
                          >
                            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                            Atualizar QR
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Configure sua instância WhatsApp para envio de mensagens automáticas.
                        </p>
                        <div className="flex gap-2">
                          {selectedInstance ? (
                            <Button 
                              onClick={() => connectInstance()}
                              disabled={loading}
                              size="sm"
                              className="flex-1"
                            >
                              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <QrCode className="w-4 h-4 mr-2" />}
                              Gerar QR Code
                            </Button>
                          ) : (
                            <Button 
                              onClick={createInstance}
                              disabled={loading || !instanceName || !isValidInstanceName(instanceName)}
                              size="sm"
                              className="flex-1"
                            >
                              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                              Criar & Conectar
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
