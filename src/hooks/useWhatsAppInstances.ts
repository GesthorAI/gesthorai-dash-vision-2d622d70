
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface WhatsAppInstance {
  id: string;
  user_id: string;
  name: string;
  last_status: string | null;
  evolution_instance_id: string | null;
  number: string | null;
  owner_jid: string | null;
  profile_name: string | null;
  metadata: any;
  shared_with_users: string[];
  created_at: string;
  updated_at: string;
}

export interface EvolutionResponse {
  success: boolean;
  data?: any;
  error?: string;
  qrcode?: string;
  status?: string;
  instances?: WhatsAppInstance[];
}

export const useWhatsAppInstances = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['whatsapp-instances'],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as WhatsAppInstance[];
    },
    enabled: !!user
  });
};

export const useEvolutionAPI = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ action, instanceName, organizationId }: { 
      action: string; 
      instanceName?: string; 
      organizationId?: string; 
    }) => {
      const { data, error } = await supabase.functions.invoke('evolution-instance', {
        body: { action, instanceName, organizationId }
      });

      if (error) throw error;
      return data as EvolutionResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
    }
  });
};
