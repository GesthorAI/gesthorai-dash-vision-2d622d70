import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface AssignmentRule {
  id: string;
  user_id: string;
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
  
  return useQuery({
    queryKey: ['assignment-rules'],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('assignment_rules')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AssignmentRule[];
    },
    enabled: !!user
  });
};

export const useCreateAssignmentRule = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Omit<AssignmentRule, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data: result, error } = await supabase
        .from('assignment_rules')
        .insert({
          user_id: user.id,
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