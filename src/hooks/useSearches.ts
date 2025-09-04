import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizationContext } from "@/contexts/OrganizationContext";

export interface Search {
  id: string;
  niche: string;
  city: string;
  status: string;
  total_leads: number;
  user_id: string;
  organization_id: string;
  webhook_id?: string;
  created_at: string;
  updated_at: string;
}

export const useSearches = () => {
  const { user } = useAuth();
  const { currentOrganizationId } = useOrganizationContext();
  
  return useQuery({
    queryKey: ["searches", currentOrganizationId],
    queryFn: async () => {
      if (!user || !currentOrganizationId) return [];
      
      const { data, error } = await supabase
        .from("searches")
        .select("*")
        .eq("organization_id", currentOrganizationId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Search[];
    },
    enabled: !!user && !!currentOrganizationId,
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
  const { currentOrganizationId } = useOrganizationContext();
  
  return useMutation({
    mutationFn: async (search: Omit<Search, "id" | "created_at" | "updated_at" | "user_id" | "organization_id">) => {
      if (!user || !currentOrganizationId) throw new Error('User must be authenticated and organization selected');
      
      const { data, error } = await supabase
        .from("searches")
        .insert({
          ...search,
          user_id: user.id,
          organization_id: currentOrganizationId,
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