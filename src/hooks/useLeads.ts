import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface Lead {
  id: string;
  name: string;
  business: string;
  city: string;
  phone?: string;
  email?: string;
  status: string;
  score: number;
  source?: string;
  niche?: string;
  search_id?: string;
  created_at: string;
  updated_at: string;
}

interface LeadFilters {
  niche?: string;
  city?: string;
  status?: string;
  dateRange?: number;
  searchId?: string;
}

export const useLeads = (filters?: LeadFilters) => {
  return useQuery({
    queryKey: ["leads", filters],
    queryFn: async () => {
      let query = supabase.from("leads").select("*");
      
      if (filters?.niche) {
        query = query.eq("niche", filters.niche);
      }
      
      if (filters?.city) {
        query = query.eq("city", filters.city);
      }
      
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      
      if (filters?.searchId) {
        query = query.eq("search_id", filters.searchId);
      }
      
      if (filters?.dateRange) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - filters.dateRange);
        query = query.gte("created_at", startDate.toISOString());
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Lead[];
    }
  });
};

// Enhanced hook with realtime subscription
export const useLeadsWithRealtime = (filters?: LeadFilters) => {
  const queryClient = useQueryClient();
  const queryResult = useLeads(filters);
  
  useEffect(() => {
    const channel = supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["leads"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
  
  return queryResult;
};

export const useLeadsByDateRange = (days: number = 30) => {
  return useQuery({
    queryKey: ["leads", "dateRange", days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Lead[];
    }
  });
};

export const useLeadsByNiche = (niche?: string) => {
  return useQuery({
    queryKey: ["leads", "niche", niche],
    queryFn: async () => {
      let query = supabase.from("leads").select("*");
      
      if (niche) {
        query = query.eq("niche", niche);
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Lead[];
    },
    enabled: !!niche || niche === undefined
  });
};

export const useLeadsByCity = (city?: string) => {
  return useQuery({
    queryKey: ["leads", "city", city],
    queryFn: async () => {
      let query = supabase.from("leads").select("*");
      
      if (city) {
        query = query.eq("city", city);
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Lead[];
    },
    enabled: !!city || city === undefined
  });
};

export const useCreateLead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (lead: Omit<Lead, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("leads")
        .insert(lead)
        .select()
        .single();
      
      if (error) throw error;
      return data as Lead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    }
  });
};

export const updateLeadStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from("leads")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Lead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    }
  });
};