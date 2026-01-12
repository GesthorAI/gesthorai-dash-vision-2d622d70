import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { subDays, format } from "date-fns";

export interface StatsSnapshot {
  snapshot_date: string;
  total_leads: number;
  new_leads: number;
  qualified_leads: number;
  converted_leads: number;
  whatsapp_leads: number;
  leads_created_today: number;
  conversions_today: number;
  qualifications_today: number;
  avg_score: number;
}

export interface TrendDataPoint {
  date: string;
  value: number;
}

export interface TrendData {
  leads: TrendDataPoint[];
  conversions: TrendDataPoint[];
  qualifications: TrendDataPoint[];
  whatsapp: TrendDataPoint[];
}

/**
 * Hook para buscar histórico de snapshots de métricas
 */
export const useLeadStatsHistory = (days = 30) => {
  const { currentOrganizationId } = useOrganizationContext();

  return useQuery({
    queryKey: ["lead-stats-history", currentOrganizationId, days],
    queryFn: async (): Promise<StatsSnapshot[]> => {
      if (!currentOrganizationId) return [];

      try {
        // Tenta buscar via RPC function
        const { data, error } = await supabase.rpc("get_lead_stats_history" as any, {
          p_organization_id: currentOrganizationId,
          p_days: days,
        });

        if (!error && data) {
          return data as StatsSnapshot[];
        }

        // Fallback: buscar diretamente da tabela (cast para unknown primeiro)
        const { data: directData, error: directError } = await supabase
          .from("lead_stats_snapshots" as any)
          .select("*")
          .eq("organization_id", currentOrganizationId)
          .gte("snapshot_date", format(subDays(new Date(), days), "yyyy-MM-dd"))
          .order("snapshot_date", { ascending: true });

        if (directError) {
          console.info("[useLeadStatsHistory] Tabela não existe, retornando vazio");
          return [];
        }

        return (directData as unknown as StatsSnapshot[]) || [];
      } catch {
        return [];
      }
    },
    enabled: !!currentOrganizationId,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
};

/**
 * Hook para obter dados formatados para gráficos de tendência
 */
export const useTrendData = (days = 14) => {
  const { data: snapshots, isLoading, error } = useLeadStatsHistory(days);

  const trendData: TrendData = {
    leads: [],
    conversions: [],
    qualifications: [],
    whatsapp: [],
  };

  if (snapshots && snapshots.length > 0) {
    snapshots.forEach((snapshot) => {
      const date = snapshot.snapshot_date;

      trendData.leads.push({
        date,
        value: snapshot.leads_created_today,
      });

      trendData.conversions.push({
        date,
        value: snapshot.conversions_today,
      });

      trendData.qualifications.push({
        date,
        value: snapshot.qualifications_today,
      });

      trendData.whatsapp.push({
        date,
        value: snapshot.whatsapp_leads,
      });
    });
  }

  return {
    data: trendData,
    hasRealData: snapshots && snapshots.length > 0,
    isLoading,
    error,
  };
};
