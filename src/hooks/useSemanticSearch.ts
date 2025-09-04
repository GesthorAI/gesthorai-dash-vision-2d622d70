import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useOrganizationContext } from "@/contexts/OrganizationContext";

export interface SemanticSearchRequest {
  query: string;
  limit?: number;
  similarity_threshold?: number;
}

export interface SemanticSearchResponse {
  success: boolean;
  leads: any[];
  query: string;
  total_results: number;
}

export const useSemanticSearch = () => {
  const { user } = useAuth();
  const { currentOrganizationId } = useOrganizationContext();
  
  return useMutation({
    mutationFn: async (request: SemanticSearchRequest): Promise<SemanticSearchResponse> => {
      if (!user || !currentOrganizationId) {
        throw new Error("User not authenticated or organization not selected");
      }
      
      const { data, error } = await supabase.functions.invoke("semantic-search", {
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

export const useEmbedLead = () => {
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (params: { lead_id: string; lead_data?: any }) => {
      if (!user) throw new Error("User not authenticated");
      
      const { data, error } = await supabase.functions.invoke("embed-lead", {
        body: params,
      });
      
      if (error) throw error;
      return data;
    },
  });
};