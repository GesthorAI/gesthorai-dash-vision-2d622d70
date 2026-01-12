import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { useToast } from "./use-toast";

export interface LeadStats {
  organization_id: string;
  total_leads: number;
  new_leads: number;
  qualified_leads: number;
  converted_leads: number;
  lost_leads: number;
  whatsapp_leads: number;
  active_leads: number;
  avg_score: number;
  max_score: number;
  min_score: number;
  last_lead_at: string | null;
  first_lead_at: string | null;
  leads_last_7_days: number;
  leads_last_30_days: number;
  refreshed_at: string;
}

export interface DatabaseMaintenanceResult {
  task: string;
  success: boolean;
  duration_ms: number;
  error?: string;
}

export interface MaintenanceResponse {
  success: boolean;
  results: DatabaseMaintenanceResult[];
  total_duration_ms: number;
  executed_at: string;
}

interface AuditLogEntry {
  id: string;
  action: string;
  table_name: string;
  timestamp: string | null;
  record_id: string | null;
  user_id: string | null;
}

interface UnusedIndex {
  table_name: string;
  index_name: string;
  times_used: number;
  index_size: string;
}

/**
 * Hook para consumir estatísticas de leads da view materializada
 * mv_lead_stats_by_org (com fallback para cálculo manual)
 */
export const useLeadStats = () => {
  const { currentOrganizationId } = useOrganizationContext();

  return useQuery({
    queryKey: ["lead-stats", currentOrganizationId],
    queryFn: async (): Promise<LeadStats | null> => {
      if (!currentOrganizationId) return null;

      // Tenta buscar da view materializada usando RPC para evitar erros de tipo
      try {
        const { data, error } = await supabase.rpc("get_lead_stats_for_org" as any, {
          p_organization_id: currentOrganizationId,
        });

        if (!error && data) {
          return data as LeadStats;
        }
      } catch {
        // View/função pode não existir, usa fallback
      }

      // Fallback: calcula manualmente
      console.info(
        "[useLeadStats] View materializada não disponível, calculando manualmente..."
      );
      return calculateStatsManually(currentOrganizationId);
    },
    enabled: !!currentOrganizationId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 10 * 60 * 1000, // Refetch a cada 10 minutos
  });
};

/**
 * Hook para executar refresh manual da view materializada
 */
export const useRefreshLeadStats = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      // Tenta chamar a função de refresh
      const { error } = await supabase.rpc("refresh_lead_stats_view" as any);
      if (error) {
        // Se a função não existir, apenas invalida o cache local
        if (error.message.includes("does not exist")) {
          console.info(
            "[useRefreshLeadStats] Função não existe, apenas invalidando cache"
          );
          return;
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-stats"] });
      toast({
        title: "Estatísticas atualizadas",
        description: "Cache de estatísticas foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      console.error("[useRefreshLeadStats] Error:", error);
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Não foi possível atualizar as estatísticas.",
        variant: "destructive",
      });
    },
  });
};

/**
 * Hook para executar manutenção do banco de dados
 */
export const useDatabaseMaintenance = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (): Promise<MaintenanceResponse> => {
      const { data, error } = await supabase.functions.invoke("db-maintenance", {
        body: { manual: true },
      });

      if (error) throw error;
      return data as MaintenanceResponse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["lead-stats"] });
      queryClient.invalidateQueries({ queryKey: ["db-performance"] });

      const failedTasks = data.results.filter((r) => !r.success);
      if (failedTasks.length > 0) {
        toast({
          title: "Manutenção parcialmente concluída",
          description: `${data.results.length - failedTasks.length}/${data.results.length} tarefas executadas com sucesso.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Manutenção concluída",
          description: `Todas as ${data.results.length} tarefas foram executadas em ${data.total_duration_ms}ms.`,
        });
      }
    },
    onError: (error: Error) => {
      console.error("[useDatabaseMaintenance] Error:", error);
      toast({
        title: "Erro na manutenção",
        description: error.message || "Não foi possível executar a manutenção.",
        variant: "destructive",
      });
    },
  });
};

/**
 * Hook para buscar índices não utilizados
 */
export const useUnusedIndexes = () => {
  return useQuery({
    queryKey: ["db-unused-indexes"],
    queryFn: async (): Promise<UnusedIndex[]> => {
      try {
        const { data, error } = await supabase.rpc("get_unused_indexes" as any);
        if (error) {
          // Função pode não existir ainda
          if (error.message.includes("does not exist")) {
            return [];
          }
          throw error;
        }
        return (data || []) as UnusedIndex[];
      } catch {
        return [];
      }
    },
    staleTime: 30 * 60 * 1000, // 30 minutos
  });
};

/**
 * Hook para buscar histórico de manutenções
 * Nota: Usa a tabela audit_logs com os campos disponíveis
 */
export const useMaintenanceHistory = (limit = 10) => {
  return useQuery({
    queryKey: ["db-maintenance-history", limit],
    queryFn: async (): Promise<AuditLogEntry[]> => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, table_name, timestamp, record_id, user_id")
        .eq("table_name", "system")
        .eq("action", "scheduled_maintenance")
        .order("timestamp", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("[useMaintenanceHistory] Error:", error);
        return [];
      }

      return (data || []) as AuditLogEntry[];
    },
    staleTime: 5 * 60 * 1000,
  });
};

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

async function calculateStatsManually(
  organizationId: string
): Promise<LeadStats> {
  const { data: leads, error } = await supabase
    .from("leads")
    .select("status, score, whatsapp_verified, archived_at, created_at")
    .eq("organization_id", organizationId);

  if (error) {
    console.error("[calculateStatsManually] Error:", error);
    return getEmptyStats(organizationId);
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const scores = leads?.filter((l) => l.score != null).map((l) => l.score!) || [];

  return {
    organization_id: organizationId,
    total_leads: leads?.length || 0,
    new_leads: leads?.filter((l) => l.status === "novo").length || 0,
    qualified_leads: leads?.filter((l) => l.status === "qualificado").length || 0,
    converted_leads: leads?.filter((l) => l.status === "convertido").length || 0,
    lost_leads: leads?.filter((l) => l.status === "perdido").length || 0,
    whatsapp_leads: leads?.filter((l) => l.whatsapp_verified).length || 0,
    active_leads: leads?.filter((l) => !l.archived_at).length || 0,
    avg_score:
      scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) /
          100
        : 0,
    max_score: scores.length > 0 ? Math.max(...scores) : 0,
    min_score: scores.length > 0 ? Math.min(...scores) : 0,
    last_lead_at:
      leads && leads.length > 0
        ? leads.sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0].created_at
        : null,
    first_lead_at:
      leads && leads.length > 0
        ? leads.sort(
            (a, b) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )[0].created_at
        : null,
    leads_last_7_days:
      leads?.filter((l) => new Date(l.created_at) > sevenDaysAgo).length || 0,
    leads_last_30_days:
      leads?.filter((l) => new Date(l.created_at) > thirtyDaysAgo).length || 0,
    refreshed_at: now.toISOString(),
  };
}

function getEmptyStats(organizationId: string): LeadStats {
  return {
    organization_id: organizationId,
    total_leads: 0,
    new_leads: 0,
    qualified_leads: 0,
    converted_leads: 0,
    lost_leads: 0,
    whatsapp_leads: 0,
    active_leads: 0,
    avg_score: 0,
    max_score: 0,
    min_score: 0,
    last_lead_at: null,
    first_lead_at: null,
    leads_last_7_days: 0,
    leads_last_30_days: 0,
    refreshed_at: new Date().toISOString(),
  };
}
