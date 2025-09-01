import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface AIFollowupRequest {
  lead: {
    name: string;
    business: string;
    niche?: string;
    city?: string;
    phone?: string;
    email?: string;
  };
  persona_id?: string;
  template_id?: string;
  custom_instructions?: string;
  variations_count?: number;
}

export interface AIFollowupResponse {
  variations: Array<{
    message: string;
    subject?: string;
    confidence: number;
  }>;
  persona_used: string;
  tokens_used: number;
  model: string;
}

export const useAIFollowup = () => {
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (request: AIFollowupRequest): Promise<AIFollowupResponse> => {
      if (!user) throw new Error("User not authenticated");
      
      const { data, error } = await supabase.functions.invoke("ai-followup-generate", {
        body: {
          ...request,
          user_id: user.id,
        },
      });
      
      if (error) throw error;
      return data;
    },
  });
};

export const useAIFollowupBatch = () => {
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (request: {
      run_id: string;
      persona_id?: string;
      custom_instructions?: string;
    }) => {
      if (!user) throw new Error("User not authenticated");
      
      const { data, error } = await supabase.functions.invoke("ai-followup-batch", {
        body: {
          ...request,
          user_id: user.id,
        },
      });
      
      if (error) throw error;
      return data;
    },
  });
};