import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useOrganizationContext } from "@/contexts/OrganizationContext";

export interface ConversationSummaryRequest {
  lead_id: string;
  messages: Array<{
    id: string;
    type: 'inbound' | 'outbound' | 'auto_reply';
    message: string;
    channel: 'whatsapp' | 'email' | 'phone';
    created_at: string;
  }>;
  summary_type?: 'brief' | 'detailed' | 'action_items';
}

export interface ConversationSummaryResponse {
  success: boolean;
  summary: string;
  key_insights: string[];
  lead_sentiment: 'interessado' | 'neutro' | 'resistente' | 'perdido';
  conversation_stage: 'inicial' | 'qualificacao' | 'proposta' | 'negociacao' | 'fechamento';
  priority_score: number;
  recommended_actions: string[];
  tags: string[];
  summary_type: string;
  messages_analyzed: number;
  execution_time_ms: number;
}

export const useAIConversationSummary = () => {
  const { user } = useAuth();
  const { currentOrganizationId } = useOrganizationContext();
  
  return useMutation({
    mutationFn: async (request: ConversationSummaryRequest): Promise<ConversationSummaryResponse> => {
      if (!user || !currentOrganizationId) {
        throw new Error("User not authenticated or organization not selected");
      }
      
      const { data, error } = await supabase.functions.invoke("ai-conversation-summary", {
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