import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Workflow {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  trigger_type: string;
  trigger_config: Record<string, any>;
  conditions: any[];
  actions: any[];
  created_at: string;
  updated_at: string;
}

export interface CreateWorkflowData {
  name: string;
  trigger_type: string;
  trigger_config?: Record<string, any>;
  conditions?: any[];
  actions?: any[];
  is_active?: boolean;
}

export const useWorkflows = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Workflow[];
    },
    enabled: !!user
  });
};

export const useCreateWorkflow = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateWorkflowData) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data: result, error } = await supabase
        .from('workflows')
        .insert({
          user_id: user.id,
          name: data.name,
          trigger_type: data.trigger_type,
          trigger_config: data.trigger_config || {},
          conditions: data.conditions || [],
          actions: data.actions || [],
          is_active: data.is_active || false
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    }
  });
};

export const useUpdateWorkflow = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Workflow> }) => {
      const { data: result, error } = await supabase
        .from('workflows')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    }
  });
};

export const useToggleWorkflow = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // First get current state
      const { data: workflow, error: fetchError } = await supabase
        .from('workflows')
        .select('is_active')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Toggle the state
      const { data: result, error } = await supabase
        .from('workflows')
        .update({ is_active: !workflow.is_active })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    }
  });
};