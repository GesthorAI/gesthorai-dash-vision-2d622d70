import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useOrganizationContext } from "@/contexts/OrganizationContext";

export interface AnalyticsRequest {
  analysis_type: 'leads_overview' | 'performance_trends' | 'conversion_insights' | 'ai_usage';
  date_range?: {
    start_date: string;
    end_date: string;
  };
  filters?: {
    status?: string[];
    niche?: string[];
    city?: string[];
    source?: string[];
  };
}

export interface AnalyticsInsight {
  title: string;
  description: string;
  impact: 'alto' | 'medio' | 'baixo';
  category: 'qualidade' | 'performance' | 'conversao' | 'custo';
  recommendation: string;
  data_supporting: string;
}

export interface AnalyticsResponse {
  success: boolean;
  analysis_type: string;
  insights: AnalyticsInsight[];
  key_metrics: Record<string, any>;
  recommendations: string[];
  trends: string[];
  date_range: {
    start_date: string;
    end_date: string;
  };
  data_points_analyzed: number;
  execution_time_ms: number;
}

export const useAIAnalytics = () => {
  const { user } = useAuth();
  const { currentOrganizationId } = useOrganizationContext();
  
  return useMutation({
    mutationFn: async (request: AnalyticsRequest): Promise<AnalyticsResponse> => {
      if (!user || !currentOrganizationId) {
        throw new Error("User not authenticated or organization not selected");
      }
      
      const { data, error } = await supabase.functions.invoke("ai-analytics", {
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