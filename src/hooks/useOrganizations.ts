import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, any>;
  plan: string;
  max_users: number;
  max_leads: number;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  invited_by: string | null;
  organization?: Organization;
}

export const useOrganizations = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          *,
          organization:organizations(*)
        `)
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data.map(member => member.organization) as Organization[];
    },
    enabled: !!user
  });
};

export const useCurrentOrganization = (organizationId?: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['organization', organizationId],
    queryFn: async () => {
      if (!user || !organizationId) return null;
      
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();
      
      if (error) throw error;
      return data as Organization;
    },
    enabled: !!user && !!organizationId
  });
};

export const useOrganizationMembers = (organizationId?: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['organization-members', organizationId],
    queryFn: async () => {
      if (!user || !organizationId) return [];
      
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          *,
          user:profiles(*)
        `)
        .eq('organization_id', organizationId);
      
      if (error) throw error;
      return data as OrganizationMember[];
    },
    enabled: !!user && !!organizationId
  });
};

export const useCreateOrganization = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { name: string; slug: string }): Promise<Organization> => {
      if (!user) throw new Error('User not authenticated');
      
      // Use RPC function to create organization with admin access
      const { data: result, error } = await supabase
        .rpc('create_organization_with_admin', {
          org_name: data.name,
          org_slug: data.slug
        });
        
      if (error) throw error;
      return result as unknown as Organization;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    }
  });
};

export const useUpdateOrganization = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Organization> }) => {
      const { data: result, error } = await supabase
        .from('organizations')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    }
  });
};

export const useInviteMember = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ organizationId, email, role = 'member' }: { 
      organizationId: string; 
      email: string; 
      role?: string;
    }) => {
      if (!user) throw new Error('User not authenticated');
      
      // Por enquanto, apenas simular o convite
      // Em produção, você enviaria um email de convite
      console.log('Convite enviado para:', email, 'para organização:', organizationId);
      
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['organization-members', variables.organizationId] 
      });
    }
  });
};