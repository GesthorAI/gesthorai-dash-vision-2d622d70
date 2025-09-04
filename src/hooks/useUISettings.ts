import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface UISettings {
  compactMode: boolean;
  showStats: boolean;
  showProgress: boolean;
  showHelpHints: boolean;
  showInlineActions: boolean;
  showTemplatesTab: boolean;
  pagesVisibility: {
    showOverview: boolean;
    showSearch: boolean;
    showTasks: boolean;
    showFollowups: boolean;
    showOperations: boolean;
    showOrganization: boolean;
    showAISettings: boolean;
    showFunnel: boolean;
    showQuality: boolean;
    showAnalytics: boolean;
  };
  operationsTabsVisibility: {
    showBulk: boolean;
    showAutomation: boolean;
    showTeam: boolean;
    showSettings: boolean;
  };
}

const DEFAULT_UI_SETTINGS: UISettings = {
  compactMode: false,
  showStats: true,
  showProgress: true,
  showHelpHints: true,
  showInlineActions: true,
  showTemplatesTab: true,
  pagesVisibility: {
    showOverview: true,
    showSearch: true,
    showTasks: true,
    showFollowups: true,
    showOperations: true,
    showOrganization: true,
    showAISettings: true,
    showFunnel: false,
    showQuality: false,
    showAnalytics: false,
  },
  operationsTabsVisibility: {
    showBulk: false,
    showAutomation: false,
    showTeam: true,
    showSettings: true,
  },
};

export const useUISettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query to get current UI settings
  const { data: settings = DEFAULT_UI_SETTINGS, isLoading } = useQuery({
    queryKey: ["ui-settings", user?.id],
    queryFn: async () => {
      if (!user) return DEFAULT_UI_SETTINGS;

      const { data, error } = await supabase
        .from("ai_settings")
        .select("feature_flags")
        .eq("user_id", user.id)
        .single();

      if (error || !data) return DEFAULT_UI_SETTINGS;

      // Extract UI settings from feature_flags or use defaults
      const featureFlags = data.feature_flags as any;
      const uiSettings = featureFlags?.ui_settings || {};
      return { ...DEFAULT_UI_SETTINGS, ...uiSettings };
    },
    enabled: !!user,
  });

  // Mutation to update UI settings
  const updateUISettings = useMutation({
    mutationFn: async (newSettings: Partial<UISettings>) => {
      if (!user) throw new Error("User not authenticated");

      const updatedSettings = { ...settings, ...newSettings };
      
      // Get current feature_flags first
      const { data: currentData } = await supabase
        .from("ai_settings")
        .select("feature_flags")
        .eq("user_id", user.id)
        .single();
      
      const currentFlags = (currentData?.feature_flags as any) || {};
      
      const { data, error } = await supabase
        .from("ai_settings")
        .update({
          feature_flags: {
            ...currentFlags,
            ui_settings: updatedSettings,
          },
        })
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ui-settings", user?.id] });
    },
  });

  return {
    settings,
    isLoading,
    updateSettings: (newSettings: Partial<UISettings>) => 
      updateUISettings.mutate(newSettings),
    isUpdating: updateUISettings.isPending,
  };
};