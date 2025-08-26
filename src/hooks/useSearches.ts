import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Search {
  id: string;
  niche: string;
  city: string;
  status: string;
  total_leads: number;
  user_id: string;
  webhook_id?: string;
  created_at: string;
  updated_at: string;
}

export const useSearches = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["searches", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("searches")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Search[];
    },
    enabled: !!user,
  });
};

export const useRecentSearches = (limit: number = 10) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["searches", "recent", limit, user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("searches")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as Search[];
    },
    enabled: !!user,
  });
};

export const useSearchesByStatus = (status: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["searches", "status", status, user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("searches")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", status)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Search[];
    },
    enabled: !!user,
  });
};

export const useCreateSearch = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (search: Omit<Search, "id" | "created_at" | "updated_at" | "user_id">) => {
      if (!user) throw new Error('User must be authenticated');
      
      const { data, error } = await supabase
        .from("searches")
        .insert({
          ...search,
          user_id: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as Search;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["searches"] });
    }
  });
};

export const useUpdateSearchStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status, total_leads }: { id: string; status: string; total_leads?: number }) => {
      const updateData: any = { status };
      if (total_leads !== undefined) {
        updateData.total_leads = total_leads;
      }
      
      const { data, error } = await supabase
        .from("searches")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Search;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["searches"] });
    }
  });
};