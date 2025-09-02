
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EvolutionSettings {
  id?: string;
  user_id: string;
  evolution_api_url: string;
  default_instance_name: string;
  created_at?: string;
  updated_at?: string;
}

export function useEvolutionSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['evolution-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evolution_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (newSettings: Omit<EvolutionSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('evolution_settings')
        .upsert({
          user_id: user.id,
          evolution_api_url: newSettings.evolution_api_url,
          default_instance_name: newSettings.default_instance_name,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evolution-settings'] });
      toast({
        title: "Configurações salvas",
        description: "As configurações da Evolution API foram salvas com sucesso.",
      });
    },
    onError: (error) => {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  return {
    settings,
    isLoading,
    saveSettings: saveMutation.mutate,
    isSaving: saveMutation.isPending,
  };
}
