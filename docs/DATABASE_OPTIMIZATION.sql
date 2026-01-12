-- ============================================
-- OTIMIZAÇÃO DE BANCO DE DADOS - ProspectarAI
-- ============================================
-- Execute esta migração no Supabase SQL Editor
-- IMPORTANTE: Execute em um horário de baixo tráfego
-- ============================================

-- ============================================
-- PARTE 1: EXTENSÕES NECESSÁRIAS
-- ============================================

-- Extensão para busca por texto com similaridade
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Extensão para estatísticas de queries (opcional, para monitoramento)
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- ============================================
-- PARTE 2: ÍNDICES EM FOREIGN KEYS
-- ============================================

-- lead_scores.lead_id - Consultas frequentes de score por lead
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_scores_lead_id 
ON public.lead_scores(lead_id);

-- lead_assignments.lead_id - Consultas de atribuição
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_assignments_lead_id 
ON public.lead_assignments(lead_id);

-- followup_run_items.lead_id - Consultas de histórico
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_followup_run_items_lead_id 
ON public.followup_run_items(lead_id);

-- followup_run_items(run_id, status) - Listar itens de uma run
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_followup_run_items_run_status 
ON public.followup_run_items(run_id, status);

-- ai_prompt_logs.lead_id - Histórico de IA por lead
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_prompt_logs_lead_id 
ON public.ai_prompt_logs(lead_id) 
WHERE lead_id IS NOT NULL;

-- tasks.lead_id - Tarefas por lead
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_lead_id 
ON public.tasks(lead_id) 
WHERE lead_id IS NOT NULL;

-- workflows.organization_id - Workflows por org
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_org_active 
ON public.workflows(organization_id, is_active);

-- whatsapp_instances.organization_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_instances_org 
ON public.whatsapp_instances(organization_id);

-- message_templates(organization_id, category)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_templates_org_category 
ON public.message_templates(organization_id, category);

-- ============================================
-- PARTE 3: ÍNDICES PARCIAIS PARA QUERIES FREQUENTES
-- ============================================

-- Leads novos por organização (status mais consultado)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_new_by_org 
ON public.leads(organization_id, created_at DESC) 
WHERE status = 'novo';

-- Leads com WhatsApp verificado (para campanhas)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_whatsapp_verified 
ON public.leads(organization_id, phone) 
WHERE whatsapp_verified = true;

-- Leads não arquivados (consulta padrão)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_active 
ON public.leads(organization_id, created_at DESC) 
WHERE archived_at IS NULL;

-- Tasks pendentes por organização
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_pending 
ON public.tasks(organization_id, due_date) 
WHERE status = 'pending';

-- Followup runs ativas
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_followup_runs_active 
ON public.followup_runs(organization_id, created_at DESC) 
WHERE status IN ('pending', 'running');

-- Convites pendentes (não aceitos e não expirados)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invites_pending 
ON public.organization_invites(email, organization_id) 
WHERE accepted_at IS NULL;

-- Sessões de usuário ativas
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_active 
ON public.user_sessions(user_id, last_activity DESC) 
WHERE is_active = true;

-- ============================================
-- PARTE 4: ÍNDICES TRIGRAM PARA BUSCA DE TEXTO
-- ============================================

-- Busca por nome de lead (case insensitive, substring)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_name_trgm 
ON public.leads USING gin(name gin_trgm_ops);

-- Busca por nome do negócio
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_business_trgm 
ON public.leads USING gin(business gin_trgm_ops);

-- ============================================
-- PARTE 5: ÍNDICES PARA OTIMIZAÇÃO DE RLS/RPC
-- ============================================

-- Índice para lookup de membership (otimiza is_org_member, is_org_admin)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_org_members_lookup 
ON public.organization_members(organization_id, user_id, role);

-- Índice para verificação de quotas AI
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_quotas_check 
ON public.ai_usage_quotas(user_id, organization_id, period_start DESC);

-- ============================================
-- PARTE 6: ÍNDICES PARA MANUTENÇÃO/CLEANUP
-- ============================================

-- AI logs antigos para cleanup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_prompt_logs_cleanup 
ON public.ai_prompt_logs(created_at) 
WHERE created_at < now() - interval '90 days';

-- Cache de embeddings por hash
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_embeddings_cache_lookup 
ON public.ai_embeddings_cache(content_hash, model);

-- Cache expirado
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_embeddings_cache_expiry 
ON public.ai_embeddings_cache(expires_at) 
WHERE expires_at IS NOT NULL;

-- Audit logs para análise
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_action_time 
ON public.audit_logs(action, timestamp DESC);

-- ============================================
-- PARTE 7: VIEW MATERIALIZADA DE ESTATÍSTICAS
-- ============================================

-- Drop se existir para recriar
DROP MATERIALIZED VIEW IF EXISTS mv_lead_stats_by_org;

-- View materializada para estatísticas de leads por organização
CREATE MATERIALIZED VIEW mv_lead_stats_by_org AS
SELECT 
  organization_id,
  COUNT(*) as total_leads,
  COUNT(*) FILTER (WHERE status = 'novo') as new_leads,
  COUNT(*) FILTER (WHERE status = 'qualificado') as qualified_leads,
  COUNT(*) FILTER (WHERE status = 'convertido') as converted_leads,
  COUNT(*) FILTER (WHERE status = 'perdido') as lost_leads,
  COUNT(*) FILTER (WHERE whatsapp_verified = true) as whatsapp_leads,
  COUNT(*) FILTER (WHERE archived_at IS NULL) as active_leads,
  COALESCE(AVG(score), 0)::numeric(5,2) as avg_score,
  COALESCE(MAX(score), 0) as max_score,
  COALESCE(MIN(score) FILTER (WHERE score > 0), 0) as min_score,
  MAX(created_at) as last_lead_at,
  MIN(created_at) as first_lead_at,
  COUNT(*) FILTER (WHERE created_at > now() - interval '7 days') as leads_last_7_days,
  COUNT(*) FILTER (WHERE created_at > now() - interval '30 days') as leads_last_30_days,
  now() as refreshed_at
FROM public.leads
GROUP BY organization_id;

-- Índice único para refresh concorrente
CREATE UNIQUE INDEX idx_mv_lead_stats_org 
ON mv_lead_stats_by_org(organization_id);

-- Comentário descritivo
COMMENT ON MATERIALIZED VIEW mv_lead_stats_by_org IS 
'Estatísticas agregadas de leads por organização. Refresh via edge function db-maintenance.';

-- ============================================
-- PARTE 8: FUNÇÃO DE REFRESH DA VIEW
-- ============================================

-- Função para refresh da view materializada (chamada pelo edge function)
CREATE OR REPLACE FUNCTION public.refresh_lead_stats_view()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Refresh concorrente permite leitura durante o refresh
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_lead_stats_by_org;
  
  RAISE NOTICE 'mv_lead_stats_by_org refreshed at %', now();
END;
$$;

-- Comentário
COMMENT ON FUNCTION public.refresh_lead_stats_view() IS 
'Refresh concorrente da view materializada de estatísticas de leads.';

-- ============================================
-- PARTE 9: FUNÇÃO DE MANUTENÇÃO PROGRAMADA
-- ============================================

-- Função de manutenção completa
CREATE OR REPLACE FUNCTION public.scheduled_maintenance()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  start_time timestamp;
  end_time timestamp;
BEGIN
  start_time := clock_timestamp();
  
  RAISE NOTICE 'Starting scheduled maintenance at %', start_time;
  
  -- 1. Atualizar estatísticas das tabelas principais
  RAISE NOTICE 'Analyzing critical tables...';
  ANALYZE public.leads;
  ANALYZE public.organization_members;
  ANALYZE public.ai_prompt_logs;
  ANALYZE public.communications;
  ANALYZE public.tasks;
  ANALYZE public.followup_runs;
  ANALYZE public.followup_run_items;
  ANALYZE public.searches;
  
  -- 2. Atualizar estatísticas de tabelas secundárias
  RAISE NOTICE 'Analyzing secondary tables...';
  ANALYZE public.lead_scores;
  ANALYZE public.lead_assignments;
  ANALYZE public.workflows;
  ANALYZE public.message_templates;
  ANALYZE public.audit_logs;
  
  end_time := clock_timestamp();
  
  RAISE NOTICE 'Scheduled maintenance completed at %. Duration: %', 
    end_time, 
    end_time - start_time;
END;
$$;

-- Comentário
COMMENT ON FUNCTION public.scheduled_maintenance() IS 
'Executa manutenção programada: ANALYZE em tabelas críticas. Chamada pelo edge function db-maintenance.';

-- ============================================
-- PARTE 10: CONFIGURAÇÃO DE AUTOVACUUM
-- ============================================

-- Configurar autovacuum mais agressivo para tabelas de alto volume
ALTER TABLE public.leads SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

ALTER TABLE public.ai_prompt_logs SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

ALTER TABLE public.audit_logs SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

ALTER TABLE public.communications SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

-- ============================================
-- PARTE 11: FUNÇÃO UTILITÁRIA PARA MONITORAMENTO
-- ============================================

-- Função para verificar índices não utilizados
CREATE OR REPLACE FUNCTION public.get_unused_indexes()
RETURNS TABLE(
  table_name text,
  index_name text,
  times_used bigint,
  index_size text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    relname::text as table_name,
    indexrelname::text as index_name,
    idx_scan as times_used,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
    AND idx_scan < 10
  ORDER BY pg_relation_size(indexrelid) DESC
  LIMIT 20;
$$;

-- Comentário
COMMENT ON FUNCTION public.get_unused_indexes() IS 
'Retorna índices com menos de 10 utilizações para análise de remoção.';

-- ============================================
-- PARTE 12: POPULAR VIEW MATERIALIZADA
-- ============================================

-- Refresh inicial da view
REFRESH MATERIALIZED VIEW mv_lead_stats_by_org;

-- ============================================
-- FIM DA MIGRAÇÃO
-- ============================================
-- 
-- PRÓXIMOS PASSOS:
-- 1. Configure o cron job para executar a edge function db-maintenance
--    (veja instruções em docs/CRON_SETUP.md)
-- 2. Monitore os logs da edge function para verificar execução
-- 3. Use get_unused_indexes() periodicamente para limpar índices não usados
--
-- ============================================
