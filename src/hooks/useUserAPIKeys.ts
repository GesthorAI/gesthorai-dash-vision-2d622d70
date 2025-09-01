
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface UserAPIKeyStatus {
  hasUserOpenAIKey: boolean;
  hasSystemOpenAIKey: boolean;
  hasAnyOpenAIKey: boolean;
  userKeyInfo?: {
    created_at: string;
    updated_at: string;
  };
  priority: 'user' | 'system' | 'none';
  message: string;
}

export const useUserAPIKeyStatus = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-api-key-status", user?.id],
    queryFn: async (): Promise<UserAPIKeyStatus> => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase.functions.invoke("ai-user-key-status");

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useSaveUserAPIKey = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ apiKey, provider = 'openai' }: { apiKey: string; provider?: string }) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase.functions.invoke("ai-user-key-save", {
        body: { apiKey, provider }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-api-key-status", user?.id] });
    },
  });
};

export const useRemoveUserAPIKey = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ provider = 'openai' }: { provider?: string } = {}) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase.functions.invoke("ai-user-key-remove", {
        body: { provider }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-api-key-status", user?.id] });
    },
  });
};
