import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface AILeadScore {
  id: string;
  lead_id: string;
  score: number;
  rationale: string;
  model: string;
  confidence: number;
  created_at: string;
  updated_at: string;
}

export interface AIScoreRequest {
  leads: Array<{
    id: string;
    name: string;
    business: string;
    niche?: string;
    city?: string;
    phone?: string;
    email?: string;
    status?: string;
    source?: string;
    created_at?: string;
  }>;
  batch_mode?: boolean;
}

export const useAILeadScores = (leadIds: string[]) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["ai-lead-scores", leadIds],
    queryFn: async () => {
      if (!user || leadIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("lead_scores")
        .select("*")
        .in("lead_id", leadIds)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as AILeadScore[];
    },
    enabled: !!user && leadIds.length > 0,
  });
};

export const useGenerateAIScores = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (request: AIScoreRequest) => {
      if (!user) throw new Error("User not authenticated");
      
      const { data, error } = await supabase.functions.invoke("ai-lead-score", {
        body: {
          user_id: user.id,
          ...request,
        },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate queries for the leads that were scored
      const leadIds = variables.leads.map(lead => lead.id);
      queryClient.invalidateQueries({ queryKey: ["ai-lead-scores", leadIds] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
};

export const useLeadScoreByLeadId = (leadId: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["ai-lead-score", leadId],
    queryFn: async () => {
      if (!user || !leadId) return null;
      
      const { data, error } = await supabase
        .from("lead_scores")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as AILeadScore | null;
    },
    enabled: !!user && !!leadId,
  });
};

// Hook para verificar se leads precisam de re-scoring
export const useCheckStaleScores = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["stale-scores", user?.id],
    queryFn: async () => {
      if (!user) return { stale_count: 0, total_leads: 0 };
      
      // Buscar leads sem score ou com score antigo (>7 dias)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: leadsWithoutScores, error: leadsError } = await supabase
        .from("leads")
        .select(`
          id,
          created_at,
          lead_scores!left (
            id,
            created_at
          )
        `)
        .eq("user_id", user.id)
        .or(`lead_scores.id.is.null,lead_scores.created_at.lt.${sevenDaysAgo.toISOString()}`);
      
      if (leadsError) throw leadsError;
      
      const { count: totalLeads } = await supabase
        .from("leads")
        .select("id", { count: 'exact' })
        .eq("user_id", user.id);
      
      return {
        stale_count: leadsWithoutScores?.length || 0,
        total_leads: totalLeads || 0,
        stale_leads: leadsWithoutScores || []
      };
    },
    enabled: !!user,
    refetchInterval: 5 * 60 * 1000, // Check every 5 minutes
  });
};