import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useToast } from '@/components/ui/use-toast';

interface ModelPreferences {
  default_model: string;
  fallback_model: string;
  embedding_model: string;
}

interface PerformanceSettings {
  max_concurrent_requests: number;
  timeout_seconds: number;
  retry_attempts: number;
  cache_embeddings: boolean;
}

interface CostControls {
  daily_cost_limit: number;
  monthly_cost_limit: number;
  auto_disable_on_limit: boolean;
  cost_alerts: boolean;
}

interface AdvancedAISettings {
  model_preferences: ModelPreferences;
  performance_settings: PerformanceSettings;
  cost_controls: CostControls;
}

export const useAdvancedAISettings = () => {
  const { currentOrganizationId } = useOrganizationContext();

  return useQuery({
    queryKey: ['advanced-ai-settings', currentOrganizationId],
    queryFn: async (): Promise<AdvancedAISettings | null> => {
      if (!currentOrganizationId) return null;

      const { data, error } = await supabase
        .from('ai_settings')
        .select('model_preferences, performance_settings, cost_controls')
        .eq('organization_id', currentOrganizationId)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) return null;

      return {
        model_preferences: (data.model_preferences as unknown) as ModelPreferences,
        performance_settings: (data.performance_settings as unknown) as PerformanceSettings,
        cost_controls: (data.cost_controls as unknown) as CostControls
      };
    },
    enabled: !!currentOrganizationId,
  });
};

export const useUpdateAdvancedAISettings = () => {
  const queryClient = useQueryClient();
  const { currentOrganizationId } = useOrganizationContext();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (settings: Partial<AdvancedAISettings>) => {
      if (!currentOrganizationId) {
        throw new Error('Organization not found');
      }

      const updateData: any = {};
      
      if (settings.model_preferences) {
        updateData.model_preferences = settings.model_preferences;
      }
      
      if (settings.performance_settings) {
        updateData.performance_settings = settings.performance_settings;
      }
      
      if (settings.cost_controls) {
        updateData.cost_controls = settings.cost_controls;
      }

      const { error } = await supabase
        .from('ai_settings')
        .update(updateData)
        .eq('organization_id', currentOrganizationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['advanced-ai-settings', currentOrganizationId] 
      });
      toast({
        title: "Configurações Atualizadas",
        description: "As configurações avançadas de IA foram salvas com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar as configurações de IA.",
        variant: "destructive",
      });
    },
  });
};

export const useEmbeddingsCache = () => {
  return useQuery({
    queryKey: ['embeddings-cache-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_embeddings_cache')
        .select('id, content_type, access_count, created_at, expires_at')
        .order('access_count', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Calculate cache statistics
      const totalCached = data?.length || 0;
      const totalAccesses = data?.reduce((sum, item) => sum + (item.access_count || 0), 0) || 0;
      const averageAccess = totalCached > 0 ? totalAccesses / totalCached : 0;
      
      const contentTypeStats = data?.reduce((acc, item) => {
        acc[item.content_type] = (acc[item.content_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      return {
        totalCached,
        totalAccesses,
        averageAccess,
        contentTypeStats,
        cacheEntries: data
      };
    },
  });
};

export const useClearEmbeddingsCache = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (options?: { contentType?: string; olderThan?: Date }) => {
      let query = supabase.from('ai_embeddings_cache').delete();

      if (options?.contentType) {
        query = query.eq('content_type', options.contentType);
      }

      if (options?.olderThan) {
        query = query.lt('created_at', options.olderThan.toISOString());
      }

      // If no filters, delete all expired entries
      if (!options?.contentType && !options?.olderThan) {
        query = query.lt('expires_at', new Date().toISOString());
      }

      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['embeddings-cache-stats'] });
      toast({
        title: "Cache Limpo",
        description: "O cache de embeddings foi limpo com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível limpar o cache de embeddings.",
        variant: "destructive",
      });
    },
  });
};