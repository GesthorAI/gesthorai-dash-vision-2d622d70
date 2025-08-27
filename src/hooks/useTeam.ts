import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface TeamMember {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  capacity: number;
  specialties: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateTeamMemberData {
  name: string;
  email: string;
  role: string;
  capacity?: number;
  specialties?: string[];
}

export const useTeamMembers = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as TeamMember[];
    },
    enabled: !!user
  });
};

export const useCreateTeamMember = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateTeamMemberData) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data: result, error } = await supabase
        .from('team_members')
        .insert({
          user_id: user.id,
          name: data.name,
          email: data.email,
          role: data.role,
          capacity: data.capacity || 50,
          specialties: data.specialties || []
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    }
  });
};

export const useUpdateTeamMember = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TeamMember> }) => {
      const { data: result, error } = await supabase
        .from('team_members')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    }
  });
};