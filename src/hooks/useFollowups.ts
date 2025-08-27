import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MessageTemplate {
  id: string;
  user_id: string;
  name: string;
  category: string;
  subject?: string;
  message: string;
  variables: string[];
  created_at: string;
  updated_at: string;
}

export interface FollowupRun {
  id: string;
  user_id: string;
  name: string;
  status: 'preparing' | 'prepared' | 'sending' | 'completed' | 'failed';
  filters: Record<string, any>;
  template_id?: string;
  total_leads: number;
  sent_count: number;
  failed_count: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface FollowupRunItem {
  id: string;
  run_id: string;
  lead_id: string;
  status: 'pending' | 'sent' | 'failed';
  message: string;
  error_message?: string;
  sent_at?: string;
  created_at: string;
  leads?: {
    name: string;
    business: string;
    phone: string;
  };
}

// Hook for managing message templates
export const useMessageTemplates = () => {
  return useQuery({
    queryKey: ['message-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MessageTemplate[];
    },
  });
};

// Hook for creating default templates if none exist
export const useCreateDefaultTemplates = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data: existingTemplates } = await supabase
        .from('message_templates')
        .select('id')
        .limit(1);

      if (existingTemplates && existingTemplates.length > 0) {
        return existingTemplates;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const defaultTemplates = [
        {
          user_id: user.id,
          name: 'Follow-up Inicial',
          category: 'follow_up',
          message: 'Olá {{name}}! Vi que você tem um negócio interessante em {{city}}. Gostaria de conversar sobre como podemos ajudar com {{business}}?',
          variables: ['name', 'city', 'business']
        },
        {
          user_id: user.id,
          name: 'Follow-up Segunda Tentativa',
          category: 'follow_up',
          message: 'Oi {{name}}! Tentei entrar em contato antes sobre seu negócio {{business}}. Tem alguns minutos para conversar?',
          variables: ['name', 'business']
        },
        {
          user_id: user.id,
          name: 'Follow-up com Oferta',
          category: 'follow_up',
          message: 'Olá {{name}}! Preparei uma proposta especial para {{business}} em {{city}}. Posso te mostrar como isso pode ajudar seu negócio?',
          variables: ['name', 'business', 'city']
        }
      ];

      const { data, error } = await supabase
        .from('message_templates')
        .insert(defaultTemplates)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
      toast({
        title: 'Templates criados',
        description: 'Templates padrão de follow-up foram criados com sucesso!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: `Falha ao criar templates: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

// Hook for creating/updating templates
export const useCreateTemplate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (template: Omit<MessageTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('message_templates')
        .insert({ ...template, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
      toast({
        title: 'Template criado',
        description: 'Template de mensagem criado com sucesso!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: `Falha ao criar template: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

// Hook for followup runs
export const useFollowupRuns = () => {
  return useQuery({
    queryKey: ['followup-runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('followup_runs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FollowupRun[];
    },
  });
};

// Hook for creating a followup run
export const useCreateFollowupRun = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (run: Omit<FollowupRun, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'total_leads' | 'sent_count' | 'failed_count'>) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('followup_runs')
        .insert({ ...run, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as FollowupRun;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followup-runs'] });
      toast({
        title: 'Follow-up criado',
        description: 'Follow-up foi criado e está sendo preparado...',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: `Falha ao criar follow-up: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

// Hook for preparing a followup run
export const usePrepareFollowupRun = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      runId: string;
      filters: Record<string, any>;
      templateId: string;
      generateWithAI?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke('followup-prepare', {
        body: params,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['followup-runs'] });
      toast({
        title: 'Follow-up preparado',
        description: `${data.totalLeads} mensagens foram preparadas com sucesso!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro na preparação',
        description: `Falha ao preparar follow-up: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

// Hook for sending followup messages
export const useSendFollowupMessages = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      runId: string;
      batchSize?: number;
      delayMs?: number;
    }) => {
      const { data, error } = await supabase.functions.invoke('followup-send-whatsapp', {
        body: params,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['followup-runs'] });
      
      if (data.isCompleted) {
        toast({
          title: 'Follow-up concluído',
          description: `${data.totalSent} mensagens enviadas, ${data.totalFailed} falharam.`,
        });
      } else {
        toast({
          title: 'Batch enviado',
          description: `${data.sentCount} mensagens enviadas neste lote.`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro no envio',
        description: `Falha ao enviar mensagens: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

// Hook for getting run items
export const useFollowupRunItems = (runId: string) => {
  return useQuery({
    queryKey: ['followup-run-items', runId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('followup_run_items')
        .select(`
          *,
          leads!inner(name, business, phone)
        `)
        .eq('run_id', runId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!runId,
  });
};