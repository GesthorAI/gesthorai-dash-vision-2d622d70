-- Correção dos warnings de segurança

-- 1. Corrigir search_path das funções criadas
DROP FUNCTION IF EXISTS public.cleanup_expired_embeddings();
CREATE OR REPLACE FUNCTION public.cleanup_expired_embeddings()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.ai_embeddings_cache 
  WHERE expires_at < now() 
  AND access_count < 5; -- Manter embeddings mais usados por mais tempo
END;
$$;

DROP FUNCTION IF EXISTS public.reset_daily_ai_quotas();
CREATE OR REPLACE FUNCTION public.reset_daily_ai_quotas()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Criar novos períodos de quota para hoje
  INSERT INTO public.ai_usage_quotas (user_id, organization_id, tokens_limit, requests_limit)
  SELECT DISTINCT 
    om.user_id,
    om.organization_id,
    COALESCE((ais.limits->>'daily_tokens')::integer, 50000) as tokens_limit,
    COALESCE((ais.limits->>'daily_requests')::integer, 100) as requests_limit
  FROM public.organization_members om
  LEFT JOIN public.ai_settings ais ON ais.organization_id = om.organization_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.ai_usage_quotas auq 
    WHERE auq.user_id = om.user_id 
    AND auq.organization_id = om.organization_id
    AND auq.period_start = date_trunc('day', now())
  );
END;
$$;

DROP FUNCTION IF EXISTS public.get_current_ai_usage(UUID, UUID);
CREATE OR REPLACE FUNCTION public.get_current_ai_usage(p_user_id UUID, p_organization_id UUID)
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  daily_usage RECORD;
  monthly_usage RECORD;
BEGIN
  -- Uso diário
  SELECT 
    COALESCE(SUM(tokens_used), 0) as tokens_used,
    COALESCE(SUM(requests_made), 0) as requests_made,
    COALESCE(SUM(cost_incurred), 0) as cost_incurred
  INTO daily_usage
  FROM public.ai_usage_quotas
  WHERE user_id = p_user_id 
  AND organization_id = p_organization_id
  AND period_start = date_trunc('day', now());
  
  -- Uso mensal
  SELECT 
    COALESCE(SUM(tokens_used), 0) as tokens_used,
    COALESCE(SUM(requests_made), 0) as requests_made,
    COALESCE(SUM(cost_incurred), 0) as cost_incurred
  INTO monthly_usage
  FROM public.ai_usage_quotas
  WHERE user_id = p_user_id 
  AND organization_id = p_organization_id
  AND period_start >= date_trunc('month', now());
  
  result := jsonb_build_object(
    'daily', jsonb_build_object(
      'tokens_used', daily_usage.tokens_used,
      'requests_made', daily_usage.requests_made,
      'cost_incurred', daily_usage.cost_incurred
    ),
    'monthly', jsonb_build_object(
      'tokens_used', monthly_usage.tokens_used,
      'requests_made', monthly_usage.requests_made,
      'cost_incurred', monthly_usage.cost_incurred
    )
  );
  
  RETURN result;
END;
$$;