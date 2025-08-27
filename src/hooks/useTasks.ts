import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Task {
  id: string;
  user_id: string;
  lead_id: string | null;
  title: string;
  description: string | null;
  due_date: string;
  status: 'pendente' | 'concluida' | 'cancelada';
  priority: 'baixa' | 'media' | 'alta' | 'urgente';
  type: 'follow_up' | 'call' | 'email' | 'meeting' | 'other';
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskData {
  lead_id?: string;
  title: string;
  description?: string;
  due_date: string;
  priority?: 'baixa' | 'media' | 'alta' | 'urgente';
  type?: 'follow_up' | 'call' | 'email' | 'meeting' | 'other';
}

export const useTasks = (filters?: {
  status?: Task['status'];
  priority?: Task['priority'];
  lead_id?: string;
}) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['tasks', user?.id, filters],
    queryFn: async () => {
      if (!user?.id) return [];
      
      let query = supabase
        .from('tasks')
        .select(`
          *,
          leads(name, business)
        `)
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }
      
      if (filters?.lead_id) {
        query = query.eq('lead_id', filters.lead_id);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as (Task & { leads?: { name: string; business: string } })[];
    },
    enabled: !!user?.id,
  });
};

export const useCreateTask = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateTaskData) => {
      if (!user?.id) throw new Error('User not authenticated');

      const taskData = {
        user_id: user.id,
        title: data.title,
        description: data.description || null,
        due_date: data.due_date,
        priority: data.priority || 'media',
        type: data.type || 'follow_up',
        lead_id: data.lead_id || null,
      };

      const { data: result, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: "Tarefa criada",
        description: "A tarefa foi criada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar tarefa",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Task> & { id: string }) => {
      const updateData: any = { ...data };
      
      // If marking as completed, set completed_at
      if (data.status === 'concluida' && !data.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }
      
      // If marking as not completed, clear completed_at
      if (data.status !== 'concluida') {
        updateData.completed_at = null;
      }

      const { data: result, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: "Tarefa atualizada",
        description: "A tarefa foi atualizada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar tarefa",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: "Tarefa excluída",
        description: "A tarefa foi excluída com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir tarefa",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });
};

export const useTasksOverdue = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['tasks-overdue', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pendente')
        .lt('due_date', now)
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!user?.id,
  });
};