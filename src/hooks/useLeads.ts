import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

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
  user_id: string;
  created_at: string;
  updated_at: string;
  whatsapp_number?: string;
  whatsapp_verified?: boolean;
  whatsapp_exists?: boolean;
  whatsapp_jid?: string;
  collected_at?: string;
  normalized_phone?: string;
  normalized_email?: string;
}

interface LeadFilters {
  niche?: string;
  city?: string;
  status?: string;
  dateRange?: number;
  searchId?: string;
  // Advanced filters
  search?: string;
  scoreMin?: number;
  scoreMax?: number;
  dateFrom?: string;
  dateTo?: string;
  cities?: string[];
  niches?: string[];
  statuses?: string[];
  sources?: string[];
  hasPhone?: boolean;
  hasEmail?: boolean;
  hasWhatsapp?: boolean;
}

export const useLeads = (filters?: LeadFilters) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["leads", filters, user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase.from("leads").select("*").eq("user_id", user.id);
      
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
      
      // Advanced filters
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,business.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }
      
      if (filters?.scoreMin !== undefined) {
        query = query.gte("score", filters.scoreMin);
      }
      
      if (filters?.scoreMax !== undefined) {
        query = query.lte("score", filters.scoreMax);
      }
      
      if (filters?.dateFrom) {
        query = query.gte("created_at", filters.dateFrom);
      }
      
      if (filters?.dateTo) {
        query = query.lte("created_at", filters.dateTo);
      }
      
      if (filters?.cities?.length) {
        query = query.in("city", filters.cities);
      }
      
      if (filters?.niches?.length) {
        query = query.in("niche", filters.niches);
      }
      
      if (filters?.statuses?.length) {
        query = query.in("status", filters.statuses);
      }
      
      if (filters?.sources?.length) {
        query = query.in("source", filters.sources);
      }
      
      if (filters?.hasPhone !== undefined) {
        if (filters.hasPhone) {
          query = query.not("phone", "is", null);
        } else {
          query = query.is("phone", null);
        }
      }
      
      if (filters?.hasEmail !== undefined) {
        if (filters.hasEmail) {
          query = query.not("email", "is", null);
        } else {
          query = query.is("email", null);
        }
      }
      
      if (filters?.hasWhatsapp !== undefined) {
        if (filters.hasWhatsapp) {
          query = query.eq("whatsapp_verified", true);
        } else {
          query = query.neq("whatsapp_verified", true);
        }
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Lead[];
    },
    enabled: !!user,
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
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["leads", "dateRange", days, user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Lead[];
    },
    enabled: !!user,
  });
};

export const useLeadsByNiche = (niche?: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["leads", "niche", niche, user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase.from("leads").select("*").eq("user_id", user.id);
      
      if (niche) {
        query = query.eq("niche", niche);
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Lead[];
    },
    enabled: !!user && (!!niche || niche === undefined)
  });
};

export const useLeadsByCity = (city?: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["leads", "city", city, user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase.from("leads").select("*").eq("user_id", user.id);
      
      if (city) {
        query = query.eq("city", city);
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Lead[];
    },
    enabled: !!user && (!!city || city === undefined)
  });
};

export const useCreateLead = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (lead: Omit<Lead, "id" | "created_at" | "updated_at" | "user_id">) => {
      if (!user) throw new Error('User must be authenticated');
      
      const leadWithUserId = {
        ...lead,
        user_id: user.id,
      };

      let result;
      
      if (lead.phone && lead.phone.trim() !== '') {
        // Try upsert by phone first (preferred)
        result = await supabase
          .from("leads")
          .upsert(leadWithUserId, { 
            onConflict: 'user_id,normalized_phone',
            ignoreDuplicates: true 
          })
          .select()
          .single();
      } else if (lead.email && lead.email.trim() !== '') {
        // Fallback to upsert by email
        result = await supabase
          .from("leads")
          .upsert(leadWithUserId, { 
            onConflict: 'user_id,normalized_email',
            ignoreDuplicates: true 
          })
          .select()
          .single();
      } else {
        // No phone or email - regular insert
        result = await supabase
          .from("leads")
          .insert(leadWithUserId)
          .select()
          .single();
      }
      
      if (result.error) throw result.error;
      return { data: result.data, isDuplicate: !result.data };
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