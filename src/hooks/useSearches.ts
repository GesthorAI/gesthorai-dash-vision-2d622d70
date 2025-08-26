import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Search {
  id: string;
  niche: string;
  city: string;
  status: string;
  total_leads: number;
  webhook_id?: string;
  created_at: string;
  updated_at: string;
}

export const useSearches = () => {
  return useQuery({
    queryKey: ["searches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("searches")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Search[];
    }
  });
};

export const useRecentSearches = (limit: number = 10) => {
  return useQuery({
    queryKey: ["searches", "recent", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("searches")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as Search[];
    }
  });
};

export const useSearchesByStatus = (status: string) => {
  return useQuery({
    queryKey: ["searches", "status", status],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("searches")
        .select("*")
        .eq("status", status)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Search[];
    }
  });
};

export const useCreateSearch = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (search: Omit<Search, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("searches")
        .insert(search)
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