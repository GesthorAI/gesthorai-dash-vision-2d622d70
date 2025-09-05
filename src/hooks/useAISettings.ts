import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useOrganizationContext } from "@/contexts/OrganizationContext";

export interface AISettings {
  id: string;
  user_id: string;
  organization_id: string;
  feature_flags: {
    followup_ai?: boolean;
    lead_scoring_ai?: boolean;
    auto_dedupe?: boolean;
    semantic_search?: boolean;
    auto_reply?: boolean;
    model?: string;
    temperature?: number;
    max_tokens?: number;
  };
  limits: {
    daily_tokens?: number;
    weekly_tokens?: number;
    max_concurrent_requests?: number;
  };
  created_at: string;
  updated_at: string;
}

export const useAISettings = () => {
  const { user } = useAuth();
  const { currentOrganizationId } = useOrganizationContext();

  return useQuery({
    queryKey: ["ai-settings", currentOrganizationId],
    queryFn: async () => {
      if (!user || !currentOrganizationId) throw new Error("User not authenticated or no organization");

      const { data, error } = await supabase
        .from("ai_settings")
        .select("*")
        .eq("organization_id", currentOrganizationId)
        .single();

      if (error) {
        // If no settings exist, return default settings
        if (error.code === 'PGRST116') {
          return {
            feature_flags: {
              followup_ai: true,
              lead_scoring_ai: true,
              auto_dedupe: false,
              semantic_search: false,
              auto_reply: false,
              model: 'gpt-5-mini-2025-08-07',
              max_tokens: 220
            },
            limits: {
              daily_tokens: 50000,
              weekly_tokens: 300000,
              max_concurrent_requests: 5
            }
          } as Partial<AISettings>;
        }
        throw error;
      }
      return data as AISettings;
    },
    enabled: !!user && !!currentOrganizationId,
  });
};