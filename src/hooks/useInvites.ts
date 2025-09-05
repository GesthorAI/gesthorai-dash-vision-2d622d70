import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface OrganizationInvite {
  id: string;
  email: string;
  role: string;
  invited_at: string;
  expires_at: string;
  accepted_at: string | null;
  profiles?: {
    full_name: string;
  } | null;
}

export const useInvites = (organizationId: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pending invites for the organization
  const {
    data: invites,
    isLoading,
    error
  } = useQuery({
    queryKey: ['organization-invites', organizationId],
    queryFn: async () => {
      if (!user || !organizationId) return [];

      const { data, error } = await supabase
        .from('organization_invites')
        .select(`
          id,
          email,
          role,
          invited_at,
          expires_at,
          accepted_at,
          invited_by,
          profiles!invited_by (full_name)
        `)
        .eq('organization_id', organizationId)
        .order('invited_at', { ascending: false });

      if (error) {
        console.error('Error fetching invites:', error);
        throw error;
      }

      // Get profiles separately to avoid type issues
      const invitesWithProfiles = await Promise.all(
        (data || []).map(async (invite) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', invite.invited_by)
            .single();

          return { ...invite, profiles: profileData };
        })
      );

      return invitesWithProfiles;
    },
    enabled: !!user && !!organizationId,
  });

  // Send invite mutation
  const sendInviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: 'admin' | 'member' }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase.functions.invoke('send-invite', {
        body: {
          organizationId,
          email,
          role,
        },
      });

      if (error) {
        console.error('Error sending invite:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Convite enviado!',
        description: 'O convite foi enviado por email com sucesso.',
      });
      
      // Invalidate and refetch invites
      queryClient.invalidateQueries({ queryKey: ['organization-invites', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['organization-members', organizationId] });
    },
    onError: (error: any) => {
      console.error('Mutation error:', error);
      
      let errorMessage = 'Erro ao enviar convite';
      
      if (error.message?.includes('already a member')) {
        errorMessage = 'Este usuário já é membro da organização';
      } else if (error.message?.includes('Forbidden')) {
        errorMessage = 'Você não tem permissão para enviar convites';
      } else if (error.message?.includes('Missing required fields')) {
        errorMessage = 'Dados obrigatórios não preenchidos';
      }

      toast({
        title: 'Erro ao enviar convite',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  // Cancel invite mutation
  const cancelInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from('organization_invites')
        .delete()
        .eq('id', inviteId);

      if (error) {
        console.error('Error canceling invite:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Convite cancelado',
        description: 'O convite foi cancelado com sucesso.',
      });
      
      // Invalidate and refetch invites
      queryClient.invalidateQueries({ queryKey: ['organization-invites', organizationId] });
    },
    onError: (error) => {
      console.error('Error canceling invite:', error);
      toast({
        title: 'Erro ao cancelar convite',
        description: 'Não foi possível cancelar o convite.',
        variant: 'destructive',
      });
    },
  });

  // Resend invite mutation
  const resendInviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: 'admin' | 'member' }) => {
      // This will reuse existing token if there's a pending invite
      return sendInviteMutation.mutateAsync({ email, role });
    },
  });

  return {
    invites: invites || [],
    isLoading,
    error,
    sendInvite: sendInviteMutation.mutate,
    isInviting: sendInviteMutation.isPending,
    cancelInvite: cancelInviteMutation.mutate,
    isCanceling: cancelInviteMutation.isPending,
    resendInvite: resendInviteMutation.mutate,
    isResending: resendInviteMutation.isPending,
  };
};