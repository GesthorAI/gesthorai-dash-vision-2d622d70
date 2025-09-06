import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useAuth } from '@/hooks/useAuth';

interface AIUsage {
  daily: {
    tokens_used: number;
    requests_made: number;
    cost_incurred: number;
  };
  monthly: {
    tokens_used: number;
    requests_made: number;
    cost_incurred: number;
  };
}

interface AIUsageQuota {
  id: string;
  user_id: string;
  organization_id: string;
  period_start: string;
  period_end: string;
  tokens_used: number;
  requests_made: number;
  tokens_limit: number;
  requests_limit: number;
  cost_incurred: number;
}

export const useAIUsage = () => {
  const { user } = useAuth();
  const { currentOrganizationId } = useOrganizationContext();

  return useQuery({
    queryKey: ['ai-usage', user?.id, currentOrganizationId],
    queryFn: async (): Promise<AIUsage> => {
      if (!user?.id || !currentOrganizationId) {
        throw new Error('User or organization not found');
      }

      const { data, error } = await supabase.rpc('get_current_ai_usage', {
        p_user_id: user.id,
        p_organization_id: currentOrganizationId
      });

      if (error) throw error;
      return (data as unknown) as AIUsage;
    },
    enabled: !!(user?.id && currentOrganizationId),
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};

export const useAIQuotas = () => {
  const { user } = useAuth();
  const { currentOrganizationId } = useOrganizationContext();

  return useQuery({
    queryKey: ['ai-quotas', user?.id, currentOrganizationId],
    queryFn: async (): Promise<AIUsageQuota[]> => {
      if (!user?.id || !currentOrganizationId) {
        throw new Error('User or organization not found');
      }

      const { data, error } = await supabase
        .from('ai_usage_quotas')
        .select('*')
        .eq('user_id', user.id)
        .eq('organization_id', currentOrganizationId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!(user?.id && currentOrganizationId),
  });
};

export const useUpdateAIUsage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentOrganizationId } = useOrganizationContext();

  return useMutation({
    mutationFn: async ({
      tokens_used,
      requests_made = 1,
      cost_estimate = 0
    }: {
      tokens_used: number;
      requests_made?: number;
      cost_estimate?: number;
    }) => {
      if (!user?.id || !currentOrganizationId) {
        throw new Error('User or organization not found');
      }

      // Get or create today's quota
      const today = new Date().toISOString().split('T')[0];
      
      const { data: existingQuota, error: fetchError } = await supabase
        .from('ai_usage_quotas')
        .select('*')
        .eq('user_id', user.id)
        .eq('organization_id', currentOrganizationId)
        .gte('period_start', today)
        .lt('period_start', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingQuota) {
        // Update existing quota
        const { error: updateError } = await supabase
          .from('ai_usage_quotas')
          .update({
            tokens_used: existingQuota.tokens_used + tokens_used,
            requests_made: existingQuota.requests_made + requests_made,
            cost_incurred: Number(existingQuota.cost_incurred) + cost_estimate,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingQuota.id);

        if (updateError) throw updateError;
      } else {
        // Create new quota for today
        const { error: insertError } = await supabase
          .from('ai_usage_quotas')
          .insert({
            user_id: user.id,
            organization_id: currentOrganizationId,
            tokens_used,
            requests_made,
            cost_incurred: cost_estimate,
            period_start: today,
            period_end: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          });

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-usage', user?.id, currentOrganizationId] });
      queryClient.invalidateQueries({ queryKey: ['ai-quotas', user?.id, currentOrganizationId] });
    },
  });
};

export const useAIPerformanceMetrics = () => {
  const { user } = useAuth();
  const { currentOrganizationId } = useOrganizationContext();

  return useQuery({
    queryKey: ['ai-performance', user?.id, currentOrganizationId],
    queryFn: async () => {
      if (!user?.id || !currentOrganizationId) {
        throw new Error('User or organization not found');
      }

      const { data, error } = await supabase
        .from('ai_performance_metrics')
        .select('*')
        .eq('user_id', user.id)
        .eq('organization_id', currentOrganizationId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    enabled: !!(user?.id && currentOrganizationId),
  });
};

export const useLogAIPerformance = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentOrganizationId } = useOrganizationContext();

  return useMutation({
    mutationFn: async ({
      feature,
      execution_time_ms,
      tokens_used,
      cost_estimate,
      success = true,
      error_type,
      model_used,
      input_size,
      output_size
    }: {
      feature: string;
      execution_time_ms: number;
      tokens_used?: number;
      cost_estimate?: number;
      success?: boolean;
      error_type?: string;
      model_used?: string;
      input_size?: number;
      output_size?: number;
    }) => {
      if (!user?.id || !currentOrganizationId) {
        throw new Error('User or organization not found');
      }

      const { error } = await supabase
        .from('ai_performance_metrics')
        .insert({
          user_id: user.id,
          organization_id: currentOrganizationId,
          feature,
          execution_time_ms,
          tokens_used,
          cost_estimate,
          success,
          error_type,
          model_used,
          input_size,
          output_size
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-performance', user?.id, currentOrganizationId] });
    },
  });
};