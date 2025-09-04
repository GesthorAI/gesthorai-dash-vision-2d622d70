import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizationContext } from "@/contexts/OrganizationContext";

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
  organization_id: string;
  created_at: string;
  updated_at: string;
  whatsapp_number?: string;
  whatsapp_verified?: boolean;
  whatsapp_exists?: boolean;
  whatsapp_jid?: string;
  collected_at?: string;
  normalized_phone?: string;
  normalized_email?: string;
  archived_at?: string;
  assigned_to?: string;
}

export interface LeadFilters {
  status?: string;
  niche?: string;
  city?: string;
  dateRange?: number;
  score?: { min?: number; max?: number };
  hasEmail?: boolean;
  hasPhone?: boolean;
  source?: string[];
  search?: string;
  includeArchived?: boolean;
  assignedTo?: string;
  searchId?: string;
  // New enhanced filters
  scoreMin?: number;
  scoreMax?: number;
  fromDate?: string;
  toDate?: string;
  searchTerm?: string;
  hasWhatsapp?: boolean;
  whatsappVerified?: boolean | null;
  archived?: boolean | null;
  sources?: string[];
  // Legacy support
  cities?: string[];
  niches?: string[];
  statuses?: string[];
  dateFrom?: string;
  dateTo?: string;
}

export const useLeads = (filters?: LeadFilters) => {
  const { user } = useAuth();
  const { currentOrganizationId } = useOrganizationContext();
  
  return useQuery({
    queryKey: ["leads", filters, currentOrganizationId],
    queryFn: async () => {
      if (!user || !currentOrganizationId) return [];

      let query = supabase
        .from('leads')
        .select('*')
        .eq('organization_id', currentOrganizationId);

      // Handle archived filter
      if (filters?.archived !== null && filters?.archived !== undefined) {
        if (filters.archived) {
          query = query.not('archived_at', 'is', null);
        } else {
          query = query.is('archived_at', null);
        }
      } else if (!filters?.includeArchived) {
        // By default, exclude archived leads unless explicitly requested
        query = query.is('archived_at', null);
      }

      // New enhanced filters
      if (filters?.searchTerm) {
        const term = `%${filters.searchTerm}%`;
        query = query.or(`name.ilike.${term},business.ilike.${term},phone.ilike.${term},email.ilike.${term}`);
      }

      if (filters?.fromDate) {
        query = query.gte('created_at', filters.fromDate);
      }

      if (filters?.toDate) {
        query = query.lte('created_at', filters.toDate);
      }

      if (filters?.whatsappVerified !== null && filters?.whatsappVerified !== undefined) {
        query = query.eq('whatsapp_verified', filters.whatsappVerified);
      }

      if (filters?.assignedTo) {
        if (filters.assignedTo === 'unassigned') {
          query = query.is('assigned_to', null);
        } else {
          query = query.eq('assigned_to', filters.assignedTo);
        }
      }

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.niche) {
        query = query.eq('niche', filters.niche);
      }

      if (filters?.city) {
        query = query.eq('city', filters.city);
      }

      if (filters?.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo);
      }

      if (filters?.searchId) {
        query = query.eq('search_id', filters.searchId);
      }

      if (filters?.dateRange) {
        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - filters.dateRange);
        query = query.gte('created_at', dateThreshold.toISOString());
      }

      if (filters?.score?.min !== undefined) {
        query = query.gte('score', filters.score.min);
      }

      if (filters?.score?.max !== undefined) {
        query = query.lte('score', filters.score.max);
      }

      if (filters?.hasEmail !== undefined) {
        if (filters.hasEmail) {
          query = query.not('email', 'is', null).neq('email', '');
        } else {
          query = query.or('email.is.null,email.eq.');
        }
      }

      if (filters?.hasPhone !== undefined) {
        if (filters.hasPhone) {
          query = query.not('phone', 'is', null).neq('phone', '');
        } else {
          query = query.or('phone.is.null,phone.eq.');
        }
      }

      if (filters?.source && filters.source.length > 0) {
        query = query.in('source', filters.source);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,business.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }

      // Legacy filters for backwards compatibility
      if (filters?.scoreMin !== undefined) {
        query = query.gte('score', filters.scoreMin);
      }

      if (filters?.scoreMax !== undefined) {
        query = query.lte('score', filters.scoreMax);
      }

      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      if (filters?.cities?.length) {
        query = query.in('city', filters.cities);
      }

      if (filters?.niches?.length) {
        query = query.in('niche', filters.niches);
      }

      if (filters?.statuses?.length) {
        query = query.in('status', filters.statuses);
      }

      if (filters?.sources?.length) {
        query = query.in('source', filters.sources);
      }

      if (filters?.hasWhatsapp !== undefined) {
        if (filters.hasWhatsapp) {
          query = query.eq('whatsapp_verified', true);
        } else {
          query = query.neq('whatsapp_verified', true);
        }
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      return data as Lead[];
    },
    enabled: !!user && !!currentOrganizationId
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
  const { currentOrganizationId } = useOrganizationContext();
  
  return useQuery({
    queryKey: ["leads", "dateRange", days, currentOrganizationId],
    queryFn: async () => {
      if (!user || !currentOrganizationId) return [];
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("organization_id", currentOrganizationId)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Lead[];
    },
    enabled: !!user && !!currentOrganizationId,
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
  const { currentOrganizationId } = useOrganizationContext();
  
  return useMutation({
    mutationFn: async (lead: Omit<Lead, "id" | "created_at" | "updated_at" | "user_id" | "organization_id">) => {
      if (!user || !currentOrganizationId) throw new Error('User must be authenticated and organization selected');
      
      // Normalize phone and email for duplicate detection
      const normalizePhone = (phone?: string) => {
        if (!phone) return null;
        return phone.replace(/\D/g, '');
      };

      const normalizeEmail = (email?: string) => {
        if (!email) return null;
        return email.toLowerCase().trim();
      };

      const leadWithUserId = {
        ...lead,
        user_id: user.id,
        organization_id: currentOrganizationId,
      };

      // Simple insert without complex upsert logic to avoid conflicts
      const result = await supabase
        .from("leads")
        .insert(leadWithUserId)
        .select()
        .single();
      
      if (result.error) {
        // Check if it's a duplicate error
        if (result.error.code === '23505') {
          // Duplicate key error - return existing lead
          return { data: null, isDuplicate: true };
        }
        throw result.error;
      }
      
      return { data: result.data, isDuplicate: false };
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

export const useArchiveLead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, archive }: { id: string; archive: boolean }) => {
      const { data, error } = await supabase
        .from('leads')
        .update({ archived_at: archive ? new Date().toISOString() : null })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    }
  });
};

// Bulk archive/unarchive multiple leads
export const useBulkArchiveLeads = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ ids, archive }: { ids: string[]; archive: boolean }) => {
      const { data, error } = await supabase
        .from('leads')
        .update({ archived_at: archive ? new Date().toISOString() : null })
        .in('id', ids)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    }
  });
};