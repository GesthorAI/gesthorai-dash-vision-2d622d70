-- ============================================
-- TABELA DE SNAPSHOTS DIÁRIOS DE MÉTRICAS
-- Execute no Supabase SQL Editor
-- ============================================

-- Tabela para armazenar snapshots diários de métricas por organização
CREATE TABLE IF NOT EXISTS public.lead_stats_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Métricas de leads
  total_leads INTEGER NOT NULL DEFAULT 0,
  new_leads INTEGER NOT NULL DEFAULT 0,
  qualified_leads INTEGER NOT NULL DEFAULT 0,
  converted_leads INTEGER NOT NULL DEFAULT 0,
  lost_leads INTEGER NOT NULL DEFAULT 0,
  whatsapp_leads INTEGER NOT NULL DEFAULT 0,
  active_leads INTEGER NOT NULL DEFAULT 0,
  
  -- Métricas de score
  avg_score NUMERIC(5,2) DEFAULT 0,
  max_score INTEGER DEFAULT 0,
  min_score INTEGER DEFAULT 0,
  
  -- Métricas do dia
  leads_created_today INTEGER NOT NULL DEFAULT 0,
  conversions_today INTEGER NOT NULL DEFAULT 0,
  qualifications_today INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Garantir apenas um snapshot por org por dia
  UNIQUE(organization_id, snapshot_date)
);

-- Índices para consultas performáticas
CREATE INDEX IF NOT EXISTS idx_snapshots_org_date 
  ON lead_stats_snapshots(organization_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_snapshots_date 
  ON lead_stats_snapshots(snapshot_date DESC);

-- RLS para segurança multi-tenant
ALTER TABLE lead_stats_snapshots ENABLE ROW LEVEL SECURITY;

-- Política de leitura: membros da organização
CREATE POLICY "Members can view org snapshots" ON lead_stats_snapshots
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Política de escrita: apenas para service role (edge functions)
CREATE POLICY "Service role can insert snapshots" ON lead_stats_snapshots
  FOR INSERT
  WITH CHECK (true);

-- ============================================
-- FUNÇÃO PARA CAPTURAR SNAPSHOT DIÁRIO
-- ============================================

CREATE OR REPLACE FUNCTION public.capture_daily_snapshots()
RETURNS TABLE(
  organization_id UUID,
  status TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_record RECORD;
  snapshot_count INTEGER := 0;
BEGIN
  -- Para cada organização ativa
  FOR org_record IN 
    SELECT DISTINCT o.id 
    FROM organizations o
    INNER JOIN leads l ON l.organization_id = o.id
    WHERE l.created_at > NOW() - INTERVAL '90 days'
  LOOP
    -- Inserir ou atualizar snapshot do dia
    INSERT INTO lead_stats_snapshots (
      organization_id,
      snapshot_date,
      total_leads,
      new_leads,
      qualified_leads,
      converted_leads,
      lost_leads,
      whatsapp_leads,
      active_leads,
      avg_score,
      max_score,
      min_score,
      leads_created_today,
      conversions_today,
      qualifications_today
    )
    SELECT
      org_record.id,
      CURRENT_DATE,
      COUNT(*),
      COUNT(*) FILTER (WHERE status = 'novo'),
      COUNT(*) FILTER (WHERE status = 'qualificado'),
      COUNT(*) FILTER (WHERE status = 'convertido'),
      COUNT(*) FILTER (WHERE status = 'perdido'),
      COUNT(*) FILTER (WHERE whatsapp_verified = true),
      COUNT(*) FILTER (WHERE archived_at IS NULL),
      COALESCE(AVG(score), 0),
      COALESCE(MAX(score), 0),
      COALESCE(MIN(score), 0),
      COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE),
      COUNT(*) FILTER (WHERE status = 'convertido' AND updated_at::date = CURRENT_DATE),
      COUNT(*) FILTER (WHERE status = 'qualificado' AND updated_at::date = CURRENT_DATE)
    FROM leads
    WHERE organization_id = org_record.id
    ON CONFLICT (organization_id, snapshot_date)
    DO UPDATE SET
      total_leads = EXCLUDED.total_leads,
      new_leads = EXCLUDED.new_leads,
      qualified_leads = EXCLUDED.qualified_leads,
      converted_leads = EXCLUDED.converted_leads,
      lost_leads = EXCLUDED.lost_leads,
      whatsapp_leads = EXCLUDED.whatsapp_leads,
      active_leads = EXCLUDED.active_leads,
      avg_score = EXCLUDED.avg_score,
      max_score = EXCLUDED.max_score,
      min_score = EXCLUDED.min_score,
      leads_created_today = EXCLUDED.leads_created_today,
      conversions_today = EXCLUDED.conversions_today,
      qualifications_today = EXCLUDED.qualifications_today;
    
    organization_id := org_record.id;
    status := 'captured';
    snapshot_count := snapshot_count + 1;
    RETURN NEXT;
  END LOOP;
  
  RAISE NOTICE 'Captured % snapshots', snapshot_count;
END;
$$;

-- ============================================
-- FUNÇÃO PARA BUSCAR HISTÓRICO DE SNAPSHOTS
-- ============================================

CREATE OR REPLACE FUNCTION public.get_lead_stats_history(
  p_organization_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  snapshot_date DATE,
  total_leads INTEGER,
  new_leads INTEGER,
  qualified_leads INTEGER,
  converted_leads INTEGER,
  whatsapp_leads INTEGER,
  leads_created_today INTEGER,
  conversions_today INTEGER,
  qualifications_today INTEGER,
  avg_score NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.snapshot_date,
    s.total_leads,
    s.new_leads,
    s.qualified_leads,
    s.converted_leads,
    s.whatsapp_leads,
    s.leads_created_today,
    s.conversions_today,
    s.qualifications_today,
    s.avg_score
  FROM lead_stats_snapshots s
  WHERE s.organization_id = p_organization_id
    AND s.snapshot_date >= CURRENT_DATE - p_days
  ORDER BY s.snapshot_date ASC;
$$;

-- ============================================
-- LIMPAR SNAPSHOTS ANTIGOS (>180 dias)
-- ============================================

CREATE OR REPLACE FUNCTION public.cleanup_old_snapshots()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM lead_stats_snapshots
  WHERE snapshot_date < CURRENT_DATE - 180;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION public.capture_daily_snapshots() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_lead_stats_history(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_snapshots() TO service_role;
