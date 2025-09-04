import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useOrganizationContext } from "@/contexts/OrganizationContext";

export interface AutoReplySettings {
  id?: string;
  is_active: boolean;
  business_hours_start: string;
  business_hours_end: string;
  business_days: number[];
  auto_reply_delay_minutes: number;
  max_replies_per_lead: number;
  persona_id?: string;
  custom_prompt?: string;
}

const DEFAULT_SETTINGS: AutoReplySettings = {
  is_active: false,
  business_hours_start: '09:00:00',
  business_hours_end: '18:00:00',
  business_days: [1, 2, 3, 4, 5], // Mon-Fri
  auto_reply_delay_minutes: 5,
  max_replies_per_lead: 3,
};

export const useAutoReplySettings = () => {
  const { user } = useAuth();
  const { currentOrganizationId } = useOrganizationContext();
  
  return useQuery({
    queryKey: ["auto-reply-settings", currentOrganizationId],
    queryFn: async () => {
      if (!user || !currentOrganizationId) {
        throw new Error("User not authenticated or organization not selected");
      }
      
      const { data, error } = await supabase
        .from("auto_reply_settings")
        .select("*")
        .eq("organization_id", currentOrganizationId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data || DEFAULT_SETTINGS;
    },
    enabled: !!user && !!currentOrganizationId,
  });
};

export const useUpdateAutoReplySettings = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentOrganizationId } = useOrganizationContext();
  
  return useMutation({
    mutationFn: async (settings: AutoReplySettings) => {
      if (!user || !currentOrganizationId) {
        throw new Error("User not authenticated or organization not selected");
      }
      
      const settingsData = {
        user_id: user.id,
        organization_id: currentOrganizationId,
        ...settings,
      };
      
      // Try to update existing settings first
      const { data: existingSettings } = await supabase
        .from("auto_reply_settings")
        .select("id")
        .eq("organization_id", currentOrganizationId)
        .single();
      
      if (existingSettings) {
        const { data, error } = await supabase
          .from("auto_reply_settings")
          .update(settingsData)
          .eq("id", existingSettings.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("auto_reply_settings")
          .insert(settingsData)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-reply-settings", currentOrganizationId] });
    },
  });
};