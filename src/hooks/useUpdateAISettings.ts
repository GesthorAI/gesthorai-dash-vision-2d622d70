import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useOrganizationContext } from "@/contexts/OrganizationContext";

export interface AISettingsUpdate {
  feature_flags?: {
    followup_ai?: boolean;
    lead_scoring_ai?: boolean;
    auto_dedupe?: boolean;
    semantic_search?: boolean;
    auto_reply?: boolean;
    model?: string;
    temperature?: number;
    max_tokens?: number;
  };
  limits?: {
    daily_tokens?: number;
    weekly_tokens?: number;
    max_concurrent_requests?: number;
  };
}

export const useUpdateAISettings = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentOrganizationId } = useOrganizationContext();

  return useMutation({
    mutationFn: async (settings: AISettingsUpdate) => {
      if (!user || !currentOrganizationId) throw new Error("User not authenticated or no organization");

      // Try to update existing settings first
      const { data, error } = await supabase
        .from("ai_settings")
        .update(settings)
        .eq("organization_id", currentOrganizationId)
        .select()
        .single();

      if (error && error.code === 'PGRST116') {
        // No existing settings, create new ones
        const { data: newData, error: insertError } = await supabase
          .from("ai_settings")
          .insert({
            ...settings,
            user_id: user.id,
            organization_id: currentOrganizationId
          })
          .select()
          .single();

        if (insertError) throw insertError;
        return newData;
      }

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-settings", currentOrganizationId] });
    },
  });
};

export const useAISecretStatus = () => {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase.functions.invoke("ai-secret-status");

      if (error) throw error;
      return data;
    },
  });
};

export const useAISmoketest = () => {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase.functions.invoke("ai-smoketest");

      if (error) throw error;
      return data;
    },
  });
};