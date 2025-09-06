import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useOrganizationContext } from "@/contexts/OrganizationContext";

export interface DedupeRequest {
  leads: Array<{
    id: string;
    name: string;
    business: string;
    phone?: string;
    email?: string;
    city?: string;
    niche?: string;
  }>;
  similarity_threshold?: number;
}

export interface DedupeResponse {
  success: boolean;
  duplicate_groups: Array<{
    master_id: string;
    duplicates: string[];
    similarity_score: number;
    match_criteria: string[];
    rationale: string;
  }>;
  total_duplicates_found: number;
  total_groups: number;
  similarity_threshold: number;
  execution_time_ms: number;
}

export const useAIDedupe = () => {
  const { user } = useAuth();
  const { currentOrganizationId } = useOrganizationContext();
  
  return useMutation({
    mutationFn: async (request: DedupeRequest): Promise<DedupeResponse> => {
      if (!user || !currentOrganizationId) {
        throw new Error("User not authenticated or organization not selected");
      }
      
      const { data, error } = await supabase.functions.invoke("ai-dedupe", {
        body: {
          ...request,
          user_id: user.id,
          organization_id: currentOrganizationId,
        },
      });
      
      if (error) throw error;
      return data;
    },
  });
};