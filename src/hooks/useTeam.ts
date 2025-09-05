import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  capacity: number;
  specialties: string[];
  created_at: string;
  updated_at: string;
  user_id: string;
  organization_id: string;
}

interface OrganizationMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

export const useTeam = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { currentOrganizationId, organizations } = useOrganizationContext();
  const queryClient = useQueryClient();

  const organizationId = currentOrganizationId;
  const currentOrganization = organizations.find(org => org.id === currentOrganizationId);

  // Fetch organization members (real users)
  const {
    data: members,
    isLoading: isLoadingMembers,
    error: membersError
  } = useQuery({
    queryKey: ['organization-members', organizationId],
    queryFn: async () => {
      if (!user || !organizationId) return [];

      // Get members and their profiles separately to avoid relation issues
      const { data: memberData, error } = await supabase
        .from('organization_members')
        .select('id, user_id, role, joined_at')
        .eq('organization_id', organizationId)
        .order('joined_at', { ascending: false });

      if (error) {
        console.error('Error fetching organization members:', error);
        throw error;
      }

      // Get profiles for each member
      const membersWithProfiles = await Promise.all(
        (memberData || []).map(async (member) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('id', member.user_id)
            .single();

          return { ...member, profiles: profileData };
        })
      );

      return membersWithProfiles as OrganizationMember[];
    },
    enabled: !!user && !!organizationId,
  });

  // Fetch team members (for lead assignments)
  const {
    data: teamMembers,
    isLoading: isLoadingTeamMembers,
    error: teamMembersError
  } = useQuery({
    queryKey: ['team-members', organizationId],
    queryFn: async () => {
      if (!user || !organizationId) return [];

      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching team members:', error);
        throw error;
      }

      return data as TeamMember[];
    },
    enabled: !!user && !!organizationId,
  });

  // Remove organization member
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Membro removido',
        description: 'O membro foi removido da organização com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['organization-members', organizationId] });
    },
    onError: (error) => {
      console.error('Error removing member:', error);
      toast({
        title: 'Erro ao remover membro',
        description: 'Não foi possível remover o membro da organização.',
        variant: 'destructive',
      });
    },
  });

  // Update member role
  const updateMemberRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      const { error } = await supabase
        .from('organization_members')
        .update({ role })
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Função atualizada',
        description: 'A função do membro foi atualizada com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['organization-members', organizationId] });
    },
    onError: (error) => {
      console.error('Error updating member role:', error);
      toast({
        title: 'Erro ao atualizar função',
        description: 'Não foi possível atualizar a função do membro.',
        variant: 'destructive',
      });
    },
  });

  // Add team member (for lead assignments)
  const addTeamMemberMutation = useMutation({
    mutationFn: async (memberData: Omit<TeamMember, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'organization_id'>) => {
      if (!user || !organizationId) throw new Error('Missing user or organization');

      const { data, error } = await supabase
        .from('team_members')
        .insert({
          ...memberData,
          user_id: user.id,
          organization_id: organizationId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Membro adicionado',
        description: 'O membro da equipe foi adicionado com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['team-members', organizationId] });
    },
    onError: (error) => {
      console.error('Error adding team member:', error);
      toast({
        title: 'Erro ao adicionar membro',
        description: 'Não foi possível adicionar o membro da equipe.',
        variant: 'destructive',
      });
    },
  });

  const updateTeamMemberMutation = useMutation({
    mutationFn: async ({ id, ...memberData }: Partial<TeamMember> & { id: string }) => {
      const { data, error } = await supabase
        .from('team_members')
        .update(memberData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Membro atualizado',
        description: 'As informações do membro foram atualizadas com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['team-members', organizationId] });
    },
    onError: (error) => {
      console.error('Error updating team member:', error);
      toast({
        title: 'Erro ao atualizar membro',
        description: 'Não foi possível atualizar as informações do membro.',
        variant: 'destructive',
      });
    },
  });

  const deleteTeamMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Membro removido',
        description: 'O membro da equipe foi removido com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['team-members', organizationId] });
    },
    onError: (error) => {
      console.error('Error deleting team member:', error);
      toast({
        title: 'Erro ao remover membro',
        description: 'Não foi possível remover o membro da equipe.',
        variant: 'destructive',
      });
    },
  });

  return {
    // Organization members (real users)
    members: members || [],
    isLoadingMembers,
    membersError,
    removeMember: removeMemberMutation.mutate,
    isRemovingMember: removeMemberMutation.isPending,
    updateMemberRole: updateMemberRoleMutation.mutate,
    isUpdatingMemberRole: updateMemberRoleMutation.isPending,

    // Team members (for lead assignments)
    teamMembers: teamMembers || [],
    isLoadingTeamMembers,
    teamMembersError,
    addTeamMember: addTeamMemberMutation.mutate,
    isAddingTeamMember: addTeamMemberMutation.isPending,
    updateTeamMember: updateTeamMemberMutation.mutate,
    isUpdatingTeamMember: updateTeamMemberMutation.isPending,
    deleteTeamMember: deleteTeamMemberMutation.mutate,
    isDeletingTeamMember: deleteTeamMemberMutation.isPending,
  };
};

// Legacy exports for compatibility
export const useTeamMembers = () => {
  const { teamMembers, isLoadingTeamMembers } = useTeam();
  return { data: teamMembers, isLoading: isLoadingTeamMembers };
};

export const useCreateTeamMember = () => {
  const { addTeamMember } = useTeam();
  return { mutate: addTeamMember };
};

export const useUpdateTeamMember = () => {
  const { updateTeamMember } = useTeam();
  return { mutate: updateTeamMember };
};