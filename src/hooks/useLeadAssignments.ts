import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface LeadAssignment {
  id: string;
  lead_id: string;
  team_member_id: string;
  assigned_by: string;
  assigned_at: string;
  created_at: string;
}

export interface CreateAssignmentData {
  lead_id: string;
  team_member_id: string;
}

export const useLeadAssignments = (leadId?: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['lead-assignments', leadId],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      
      let query = supabase
        .from('lead_assignments')
        .select(`
          *,
          team_members(name, email, role),
          leads(name, business)
        `);
      
      if (leadId) {
        query = query.eq('lead_id', leadId);
      }
      
      const { data, error } = await query.order('assigned_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });
};

export const useCreateAssignment = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateAssignmentData) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data: result, error } = await supabase
        .from('lead_assignments')
        .insert({
          lead_id: data.lead_id,
          team_member_id: data.team_member_id,
          assigned_by: user.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    }
  });
};

export const useBulkAssignLeads = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ leadIds, teamMemberId }: { leadIds: string[]; teamMemberId: string }) => {
      if (!user) throw new Error('User not authenticated');
      
      // First update the leads table
      const { error: leadsError } = await supabase
        .from('leads')
        .update({ assigned_to: teamMemberId })
        .in('id', leadIds);
      
      if (leadsError) throw leadsError;
      
      // Then create assignment records
      const assignments = leadIds.map(leadId => ({
        lead_id: leadId,
        team_member_id: teamMemberId,
        assigned_by: user.id
      }));
      
      const { data, error } = await supabase
        .from('lead_assignments')
        .insert(assignments)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    }
  });
};