import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useOrganizationContext } from "@/contexts/OrganizationContext";

export interface EnrichRequest {
  leads: Array<{
    id: string;
    name: string;
    business: string;
    phone?: string;
    email?: string;
    city?: string;
    niche?: string;
  }>;
  enrichment_fields?: string[];
}

export interface EnrichResponse {
  success: boolean;
  enriched_leads: Array<{
    lead_id: string;
    enriched_data: {
      niche?: string;
      business_size?: string;
      potential_value?: string;
      contact_preference?: string;
      urgency?: string;
      ideal_time?: string;
      confidence_score: number;
    };
    rationale: string;
  }>;
  total_enriched: number;
  enrichment_fields: string[];
  execution_time_ms: number;
}

export const useAIEnrich = () => {
  const { user } = useAuth();
  const { currentOrganizationId } = useOrganizationContext();
  
  return useMutation({
    mutationFn: async (request: EnrichRequest): Promise<EnrichResponse> => {
      if (!user || !currentOrganizationId) {
        throw new Error("User not authenticated or organization not selected");
      }
      
      const { data, error } = await supabase.functions.invoke("ai-enrich", {
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