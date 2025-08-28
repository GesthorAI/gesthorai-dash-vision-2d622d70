import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Smartphone, RefreshCw, QrCode, CheckCircle, XCircle, Wifi, WifiOff } from "lucide-react";

interface WhatsAppInstance {
  success: boolean;
  data?: any;
  error?: string;
  qrcode?: string;
  status?: string;
}

export const WhatsAppConnectDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [instanceStatus, setInstanceStatus] = useState<string>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const { toast } = useToast();

  const callEvolutionAPI = async (action: string, instanceName?: string): Promise<WhatsAppInstance> => {
    const { data, error } = await supabase.functions.invoke('evolution-instance', {
      body: { action, instanceName }
    });

    if (error) throw error;
    return data;
  };

  const checkInstanceStatus = async () => {
    try {
      const result = await callEvolutionAPI('status');
      if (result.success) {
        setInstanceStatus(result.status || 'disconnected');
        if (result.status === 'open') {
          setQrCode(null);
          setPolling(false);
        }
      }
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  const createInstance = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await callEvolutionAPI('create');
      
      if (result.success) {
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

  const connectInstance = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await callEvolutionAPI('connect');
      
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

  const disconnectInstance = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await callEvolutionAPI('disconnect');
      
      if (result.success) {
        setInstanceStatus('disconnected');
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
    
    if (polling && qrCode) {
      interval = setInterval(checkInstanceStatus, 3000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [polling, qrCode]);

  // Check status when dialog opens
  useEffect(() => {
    if (isOpen) {
      checkInstanceStatus();
    }
  }, [isOpen]);

  const getStatusBadge = () => {
    switch (instanceStatus) {
      case 'open':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Conectado</Badge>;
      case 'connecting':
        return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Conectando</Badge>;
      case 'qrReadSuccess':
        return <Badge variant="secondary"><Wifi className="w-3 h-3 mr-1" />QR Lido</Badge>;
      default:
        return <Badge variant="outline"><WifiOff className="w-3 h-3 mr-1" />Desconectado</Badge>;
    }
  };

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
            Conectar WhatsApp
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                Status da Instância
                {getStatusBadge()}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {instanceStatus === 'open' ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    WhatsApp conectado e pronto para enviar mensagens!
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={disconnectInstance}
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
                        <Button 
                          onClick={createInstance}
                          disabled={loading}
                          size="sm"
                          className="flex-1"
                        >
                          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <QrCode className="w-4 h-4 mr-2" />}
                          Gerar QR Code
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

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