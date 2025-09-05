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
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check which default templates already exist
      const defaultTemplateNames = ['Follow-up Inicial', 'Follow-up Segunda Tentativa', 'Follow-up com Oferta'];
      
      const { data: existingTemplates } = await supabase
        .from('message_templates')
        .select('name')
        .eq('user_id', user.id)
        .in('name', defaultTemplateNames);

      const existingNames = existingTemplates?.map(t => t.name) || [];
      
      // Only create templates that don't exist
      const templatesToCreate = [
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
      ].filter(template => !existingNames.includes(template.name));

      if (templatesToCreate.length === 0) {
        // All templates already exist, just return existing ones
        const { data: allTemplates } = await supabase
          .from('message_templates')
          .select('*')
          .eq('user_id', user.id)
          .in('name', defaultTemplateNames);
        return allTemplates;
      }

      const { data, error } = await supabase
        .from('message_templates')
        .insert(templatesToCreate)
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

// Hook for updating templates
export const useUpdateTemplate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, template }: { 
      id: string; 
      template: Partial<Omit<MessageTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>> 
    }) => {
      const { data, error } = await supabase
        .from('message_templates')
        .update(template)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
      toast({
        title: 'Template atualizado',
        description: 'Template de mensagem atualizado com sucesso!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: `Falha ao atualizar template: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

// Hook for deleting templates
export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
      toast({
        title: 'Template excluído',
        description: 'Template de mensagem excluído com sucesso!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: `Falha ao excluir template: ${error.message}`,
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
    mutationFn: async (run: Omit<FollowupRun, 'id' | 'user_id' | 'organization_id' | 'created_at' | 'updated_at' | 'total_leads' | 'sent_count' | 'failed_count'> & { organization_id?: string }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (!run.organization_id) {
        throw new Error('Organization ID is required');
      }

      const { data, error } = await supabase
        .from('followup_runs')
        .insert({ ...run, user_id: user.id, organization_id: run.organization_id })
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
      personaConfig?: {
        name: string;
        systemPrompt: string;
        useJinaAI: boolean;
        messageDelay: number;
      };
      selectedAIVariation?: string;
    }) => {
      console.log('Calling followup-prepare with params:', params);
      
      // Get the current session to include authorization header
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }
      
      const { data, error } = await supabase.functions.invoke('followup-prepare', {
        body: params,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log('followup-prepare response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }
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
      interLeadDelayMs?: number;
      intraLeadDelayMs?: number;
      jitterPct?: number;
      instanceName?: string;
      organizationId?: string;
    }) => {
      // Get the current session to include authorization header
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }
      
      const { data, error } = await supabase.functions.invoke('followup-send-whatsapp', {
        body: params,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['followup-runs'] });
      
      if (data.sentCount === 0 && data.failedCount === 0) {
        toast({
          title: 'Nenhum item pendente',
          description: 'Todos os itens já foram processados.',
        });
      } else if (data.isCompleted) {
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
    onError: async (error: any) => {
      let errorMessage = error.message;
      let errorTitle = 'Erro no envio';
      
      // Parse error data - handle Supabase FunctionsHttpError
      try {
        let errorData;
        
        // If it's a FunctionsHttpError from Supabase, extract the JSON response
        if (error.context && typeof error.context.json === 'function') {
          errorData = await error.context.json();
        } else {
          // Try parsing the message as JSON
          errorData = JSON.parse(error.message);
        }
        
        if (errorData.code) {
          switch (errorData.code) {
            case 'INSTANCE_NOT_FOUND':
              errorTitle = 'WhatsApp não conectado';
              errorMessage = `Instância '${errorData.instanceName || 'desconhecida'}' não encontrada. Conecte sua instância WhatsApp primeiro.`;
              break;
            case 'INSTANCE_NOT_CONNECTED':
              errorTitle = 'WhatsApp desconectado';
              errorMessage = `Instância '${errorData.instanceName || 'desconhecida'}' não está conectada (${errorData.currentStatus}). Reconecte sua instância.`;
              break;
            case 'UNAUTHORIZED_ORG':
              errorTitle = 'Organização incorreta';
              errorMessage = 'Selecione a organização correta no topo antes de enviar mensagens.';
              break;
            case 'RUN_NOT_FOUND':
              errorTitle = 'Campanha não encontrada';
              errorMessage = 'A campanha de follow-up não foi encontrada.';
              break;
            default:
              errorMessage = errorData.error || errorData.message || error.message;
          }
        }
      } catch {
        // Handle specific error cases in plain text
        if (error.message.includes('INSTANCE_NOT_FOUND')) {
          errorTitle = 'WhatsApp não conectado';
          errorMessage = 'Instância WhatsApp não encontrada. Conecte sua instância primeiro.';
        } else if (error.message.includes('INSTANCE_NOT_CONNECTED')) {
          errorTitle = 'WhatsApp desconectado';
          errorMessage = 'Instância WhatsApp não está conectada. Reconecte sua instância.';
        } else if (error.message.includes('UNAUTHORIZED_ORG')) {
          errorTitle = 'Organização incorreta';
          errorMessage = 'Selecione a organização correta no topo antes de enviar mensagens.';
        }
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });
};

// Hook for validating template existence
export const useValidateTemplate = () => {
  return useMutation({
    mutationFn: async (templateId: string) => {
      const { data, error } = await supabase
        .from('message_templates')
        .select('id, name')
        .eq('id', templateId)
        .single();

      if (error) throw error;
      return data;
    },
  });
};

// Hook for updating followup run template
export const useUpdateFollowupRunTemplate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ runId, templateId }: { runId: string; templateId: string }) => {
      const { data, error } = await supabase
        .from('followup_runs')
        .update({ template_id: templateId })
        .eq('id', runId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followup-runs'] });
      toast({
        title: 'Template atualizado',
        description: 'Template do follow-up foi atualizado com sucesso!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: `Falha ao atualizar template: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

// Hook for dispatching to n8n
export const useDispatchToN8n = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      runId: string;
      templateId: string;
      filters: Record<string, any>;
      personaConfig?: {
        name: string;
        systemPrompt: string;
        useJinaAI: boolean;
        messageDelay: number;
      };
    }) => {
      // Get the current session to include authorization header
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }
      
      const { data, error } = await supabase.functions.invoke('n8n-followup-dispatch', {
        body: params,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['followup-runs'] });
      toast({
        title: 'Follow-up enviado ao n8n',
        description: `${data.totalLeads} leads enviados para processamento no workflow n8n.`,
      });
    },
    onError: (error: Error) => {
      const errorMessage = error.message.toLowerCase();
      
      if (errorMessage.includes('template') && errorMessage.includes('not found')) {
        toast({
          title: 'Template não encontrado',
          description: 'O template selecionado não existe mais. Selecione um novo template.',
          variant: 'destructive',
        });
      } else if (errorMessage.includes('400') || errorMessage.includes('bad request')) {
        toast({
          title: 'Dados inválidos',
          description: 'Verifique se todos os dados necessários estão preenchidos corretamente.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro no envio n8n',
          description: `Falha ao enviar para n8n: ${error.message}`,
          variant: 'destructive',
        });
      }
    },
  });
};

// Hook for deleting a followup run
export const useDeleteFollowupRun = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (runId: string) => {
      // First delete all run items
      const { error: itemsError } = await supabase
        .from('followup_run_items')
        .delete()
        .eq('run_id', runId);

      if (itemsError) throw itemsError;

      // Then delete the run itself
      const { error } = await supabase
        .from('followup_runs')
        .delete()
        .eq('id', runId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followup-runs'] });
      queryClient.invalidateQueries({ queryKey: ['followup-run-items'] });
      toast({
        title: 'Follow-up excluído',
        description: 'Follow-up foi excluído com sucesso!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: `Falha ao excluir follow-up: ${error.message}`,
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
        .select('*')
        .eq('run_id', runId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!runId,
  });
};

// Export validation - useDeleteTemplate is exported above