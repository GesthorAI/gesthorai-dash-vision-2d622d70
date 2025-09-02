
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useEvolutionApiKeys() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: keys, isLoading } = useQuery({
    queryKey: ['evolution-api-keys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_api_keys')
        .select('*')
        .in('provider', ['evolution_api', 'serpapi']);

      if (error) throw error;
      return data || [];
    },
  });

  const hasEvolutionKey = keys?.some(key => key.provider === 'evolution_api');
  const hasSerpApiKey = keys?.some(key => key.provider === 'serpapi');

  const saveKeyMutation = useMutation({
    mutationFn: async ({ provider, keyValue }: { provider: string; keyValue: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Criar um IV aleatório para criptografia
      const iv = crypto.getRandomValues(new Uint8Array(16));
      const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Para este exemplo, vamos armazenar a chave como está (em produção você criptografaria)
      const keyCipher = btoa(keyValue);

      const { data, error } = await supabase
        .from('ai_api_keys')
        .upsert({
          user_id: user.id,
          provider,
          key_cipher: keyCipher,
          iv: ivHex,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evolution-api-keys'] });
      toast({
        title: "Chave salva",
        description: `A chave ${variables.provider === 'evolution_api' ? 'Evolution API' : 'SerpAPI'} foi salva com sucesso.`,
      });
    },
    onError: (error) => {
      console.error('Erro ao salvar chave:', error);
      toast({
        title: "Erro ao salvar chave",
        description: "Não foi possível salvar a chave. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  return {
    keys,
    isLoading,
    hasEvolutionKey,
    hasSerpApiKey,
    saveKey: saveKeyMutation.mutate,
    isSaving: saveKeyMutation.isPending,
  };
}
