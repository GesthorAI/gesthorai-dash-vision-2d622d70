import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface AssignmentRule {
  id: string;
  user_id: string;
  organization_id: string;
  name: string;
  criteria: {
    scoreRange: [number, number];
    sources: string[];
    niches: string[];
    cities: string[];
  };
  assign_to: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useAssignmentRules = () => {
  const { user } = useAuth();
  const { currentOrganizationId } = useOrganizationContext();
  
  return useQuery({
    queryKey: ['assignment-rules', currentOrganizationId],
    queryFn: async () => {
      if (!user || !currentOrganizationId) throw new Error('User not authenticated or organization not selected');
      
      const { data, error } = await supabase
        .from('assignment_rules')
        .select('*')
        .eq('organization_id', currentOrganizationId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AssignmentRule[];
    },
    enabled: !!user && !!currentOrganizationId
  });
};

export const useCreateAssignmentRule = () => {
  const { user } = useAuth();
  const { currentOrganizationId } = useOrganizationContext();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Omit<AssignmentRule, 'id' | 'user_id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
      if (!user || !currentOrganizationId) throw new Error('User not authenticated or organization not selected');
      
      const { data: result, error } = await supabase
        .from('assignment_rules')
        .insert({
          user_id: user.id,
          organization_id: currentOrganizationId,
          ...data
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment-rules'] });
    }
  });
};

export const useUpdateAssignmentRule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AssignmentRule> }) => {
      const { data: result, error } = await supabase
        .from('assignment_rules')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment-rules'] });
    }
  });
};

export const useDeleteAssignmentRule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('assignment_rules')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment-rules'] });
    }
  });
};