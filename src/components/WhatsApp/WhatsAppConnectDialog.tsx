import React, { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { useToast } from "@/hooks/use-toast"
import { supabase } from '@/integrations/supabase/client';
import QRCode from "react-qr-code";

interface WhatsAppConnectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onInstanceConnected: () => void;
}

export function WhatsAppConnectDialog({ isOpen, onClose, onInstanceConnected }: WhatsAppConnectDialogProps) {
  const [instanceName, setInstanceName] = useState<string>('gesthorai');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('disconnected');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showQrCode, setShowQrCode] = useState<boolean>(false);
  const [instanceExists, setInstanceExists] = useState<boolean>(false);
  const { toast } = useToast()

  // Função para chamar a Evolution API
  const callEvolutionAPI = async (action: string, instanceName?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('evolution-instance', {
        body: { action, instanceName }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error calling Evolution API:', error);
      throw error;
    }
  };

  const checkInstanceStatus = async () => {
    setIsLoading(true);
    try {
      const response = await callEvolutionAPI('status', instanceName);

      if (response.success) {
        setStatus(response.status);
        setInstanceExists(true);
        if (response.status === 'CONNECTED') {
          onInstanceConnected();
        }
      } else {
        setStatus('disconnected');
        setInstanceExists(false);
        console.log('Instance does not exist or is disconnected.');
      }
    } catch (error) {
      console.error('Failed to check instance status:', error);
      toast({
        title: "Erro ao verificar o status da instância",
        description: "Por favor, verifique sua conexão com a Evolution API.",
        variant: "destructive",
      })
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const response = await callEvolutionAPI('connect', instanceName);

      if (response.success) {
        toast({
          title: "Instância criada com sucesso!",
          description: "Aguarde enquanto o QR Code é gerado.",
        })
        setStatus('connecting');
        setInstanceExists(true);
        setShowQrCode(true);
        fetchQrCode();
      } else {
        toast({
          title: "Erro ao criar instância",
          description: response.error || "Falha ao criar a instância. Verifique as configurações da Evolution API.",
          variant: "destructive",
        })
        console.error('Failed to connect:', response.error);
        setStatus('error');
        setInstanceExists(false);
      }
    } catch (error) {
      toast({
        title: "Erro ao conectar",
        description: "Houve um erro ao tentar conectar. Verifique sua conexão com a Evolution API.",
        variant: "destructive",
      })
      console.error('Failed to connect:', error);
      setStatus('error');
      setInstanceExists(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchQrCode();
      toast({
        title: "QR Code atualizado",
        description: "Use um novo QR Code para conectar sua instância.",
      })
    } catch (error) {
      toast({
        title: "Erro ao atualizar o QR Code",
        description: "Houve um erro ao tentar atualizar o QR Code. Verifique sua conexão com a Evolution API.",
        variant: "destructive",
      })
      console.error('Failed to refresh QR code:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchQrCode = async () => {
    try {
      const response = await callEvolutionAPI('qr', instanceName);

      if (response.success) {
        setQrCode(response.qr);
        setStatus('qr-code');
      } else {
        toast({
          title: "Erro ao obter QR Code",
          description: response.error || "Falha ao obter o QR Code. Verifique as configurações da Evolution API.",
          variant: "destructive",
        })
        console.error('Failed to fetch QR code:', response.error);
        setStatus('error');
        setQrCode(null);
      }
    } catch (error) {
      toast({
        title: "Erro ao obter QR Code",
        description: "Houve um erro ao tentar obter o QR Code. Verifique sua conexão com a Evolution API.",
        variant: "destructive",
      })
      console.error('Failed to fetch QR code:', error);
      setStatus('error');
      setQrCode(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkInstanceStatus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (status === 'CONNECTED') {
      onInstanceConnected();
      onClose();
    }
  }, [status, onInstanceConnected, onClose]);

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Conectar ao WhatsApp</AlertDialogTitle>
          <AlertDialogDescription>
            Para conectar sua conta do WhatsApp, siga as instruções abaixo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nome da Instância
            </Label>
            <Input
              type="text"
              id="name"
              value={instanceName}
              onChange={(e) => setInstanceName(e.target.value)}
              className="col-span-3"
            />
          </div>

          {isLoading ? (
            <div className="text-center">Verificando status...</div>
          ) : (
            <>
              {status === 'disconnected' && !instanceExists && (
                <div className="text-center">
                  <p>A instância não existe ou está desconectada.</p>
                  <Button onClick={handleConnect} disabled={isConnecting}>
                    {isConnecting ? 'Conectando...' : 'Criar Instância'}
                  </Button>
                </div>
              )}

              {status === 'disconnected' && instanceExists && (
                <div className="text-center">
                  <p>A instância existe, mas está desconectada.</p>
                  <Button onClick={handleRefresh} disabled={isRefreshing}>
                    {isRefreshing ? 'Atualizar QR Code...' : 'Mostrar QR Code'}
                  </Button>
                </div>
              )}

              {status === 'connecting' && (
                <div className="text-center">Conectando...</div>
              )}

              {status === 'qr-code' && qrCode && (
                <div className="text-center">
                  <p>Escaneie o QR Code abaixo com seu celular:</p>
                  <QRCode value={qrCode} size={256} />
                  <Button onClick={handleRefresh} disabled={isRefreshing} className="mt-4">
                    {isRefreshing ? 'Atualizando...' : 'Atualizar QR Code'}
                  </Button>
                </div>
              )}

              {status === 'CONNECTED' && (
                <div className="text-center">
                  <p>WhatsApp conectado com sucesso!</p>
                </div>
              )}

              {status === 'error' && (
                <div className="text-center">
                  <p>Erro ao conectar. Verifique as configurações da Evolution API.</p>
                </div>
              )}
            </>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
