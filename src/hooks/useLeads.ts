import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  created_at: string;
  updated_at: string;
}

export const useLeads = () => {
  return useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Lead[];
    }
  });
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