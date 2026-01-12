import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MaintenanceResult {
  task: string;
  success: boolean;
  duration_ms: number;
  error?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const results: MaintenanceResult[] = [];

  try {
    console.log("[db-maintenance] Starting scheduled maintenance...");

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Task 1: Refresh materialized view mv_lead_stats_by_org
    const mvStart = Date.now();
    try {
      const { error: mvError } = await supabaseAdmin.rpc(
        "refresh_lead_stats_view"
      );

      if (mvError) {
        console.error("[db-maintenance] MV refresh error:", mvError);
        results.push({
          task: "refresh_mv_lead_stats_by_org",
          success: false,
          duration_ms: Date.now() - mvStart,
          error: mvError.message,
        });
      } else {
        console.log("[db-maintenance] MV refreshed successfully");
        results.push({
          task: "refresh_mv_lead_stats_by_org",
          success: true,
          duration_ms: Date.now() - mvStart,
        });
      }
    } catch (err) {
      console.error("[db-maintenance] MV refresh exception:", err);
      results.push({
        task: "refresh_mv_lead_stats_by_org",
        success: false,
        duration_ms: Date.now() - mvStart,
        error: err.message,
      });
    }

    // Task 2: Run scheduled_maintenance function (ANALYZE tables)
    const analyzeStart = Date.now();
    try {
      const { error: maintError } = await supabaseAdmin.rpc(
        "scheduled_maintenance"
      );

      if (maintError) {
        console.error("[db-maintenance] Maintenance error:", maintError);
        results.push({
          task: "scheduled_maintenance",
          success: false,
          duration_ms: Date.now() - analyzeStart,
          error: maintError.message,
        });
      } else {
        console.log("[db-maintenance] Maintenance completed successfully");
        results.push({
          task: "scheduled_maintenance",
          success: true,
          duration_ms: Date.now() - analyzeStart,
        });
      }
    } catch (err) {
      console.error("[db-maintenance] Maintenance exception:", err);
      results.push({
        task: "scheduled_maintenance",
        success: false,
        duration_ms: Date.now() - analyzeStart,
        error: err.message,
      });
    }

    // Task 3: Cleanup old AI prompt logs (>90 days)
    const cleanupStart = Date.now();
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);

      const { count, error: cleanupError } = await supabaseAdmin
        .from("ai_prompt_logs")
        .delete()
        .lt("created_at", cutoffDate.toISOString())
        .select("*", { count: "exact", head: true });

      if (cleanupError) {
        console.error("[db-maintenance] Cleanup error:", cleanupError);
        results.push({
          task: "cleanup_old_ai_logs",
          success: false,
          duration_ms: Date.now() - cleanupStart,
          error: cleanupError.message,
        });
      } else {
        console.log(`[db-maintenance] Cleaned up ${count || 0} old AI logs`);
        results.push({
          task: "cleanup_old_ai_logs",
          success: true,
          duration_ms: Date.now() - cleanupStart,
        });
      }
    } catch (err) {
      console.error("[db-maintenance] Cleanup exception:", err);
      results.push({
        task: "cleanup_old_ai_logs",
        success: false,
        duration_ms: Date.now() - cleanupStart,
        error: err.message,
      });
    }

    // Task 4: Cleanup expired embeddings cache
    const cacheCleanupStart = Date.now();
    try {
      const { count, error: cacheError } = await supabaseAdmin
        .from("ai_embeddings_cache")
        .delete()
        .lt("expires_at", new Date().toISOString())
        .select("*", { count: "exact", head: true });

      if (cacheError) {
        console.error("[db-maintenance] Cache cleanup error:", cacheError);
        results.push({
          task: "cleanup_expired_cache",
          success: false,
          duration_ms: Date.now() - cacheCleanupStart,
          error: cacheError.message,
        });
      } else {
        console.log(
          `[db-maintenance] Cleaned up ${count || 0} expired cache entries`
        );
        results.push({
          task: "cleanup_expired_cache",
          success: true,
          duration_ms: Date.now() - cacheCleanupStart,
        });
      }
    } catch (err) {
      console.error("[db-maintenance] Cache cleanup exception:", err);
      results.push({
        task: "cleanup_expired_cache",
        success: false,
        duration_ms: Date.now() - cacheCleanupStart,
        error: err.message,
      });
    }

    // Log maintenance execution to audit_logs
    try {
      await supabaseAdmin.from("audit_logs").insert({
        table_name: "system",
        action: "scheduled_maintenance",
        new_data: {
          results,
          total_duration_ms: Date.now() - startTime,
          executed_at: new Date().toISOString(),
        },
      });
    } catch (logErr) {
      console.error("[db-maintenance] Failed to log audit:", logErr);
    }

    const totalDuration = Date.now() - startTime;
    const allSuccessful = results.every((r) => r.success);

    console.log(
      `[db-maintenance] Completed in ${totalDuration}ms. All successful: ${allSuccessful}`
    );

    return new Response(
      JSON.stringify({
        success: allSuccessful,
        results,
        total_duration_ms: totalDuration,
        executed_at: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: allSuccessful ? 200 : 207,
      }
    );
  } catch (error) {
    console.error("[db-maintenance] Fatal error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        total_duration_ms: Date.now() - startTime,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
