-- Fase 3: Melhorias no Banco de Dados e Performance para IA

-- 1. Criar tabela para quotas e limites de IA
CREATE TABLE IF NOT EXISTS public.ai_usage_quotas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT date_trunc('day', now()),
  period_end TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (date_trunc('day', now()) + interval '1 day'),
  tokens_used INTEGER NOT NULL DEFAULT 0,
  requests_made INTEGER NOT NULL DEFAULT 0,
  tokens_limit INTEGER NOT NULL DEFAULT 50000,
  requests_limit INTEGER NOT NULL DEFAULT 100,
  cost_incurred DECIMAL(10,4) NOT NULL DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Criar tabela para cache de embeddings
CREATE TABLE IF NOT EXISTS public.ai_embeddings_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_hash TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL, -- 'lead', 'search', 'message', etc.
  embedding VECTOR(1536), -- OpenAI embedding dimension
  model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  metadata JSONB DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  access_count INTEGER DEFAULT 1
);

-- 3. Criar tabela para análise de performance de IA
CREATE TABLE IF NOT EXISTS public.ai_performance_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID,
  feature TEXT NOT NULL, -- 'dedupe', 'enrich', 'conversation_summary', etc.
  execution_time_ms INTEGER NOT NULL,
  tokens_used INTEGER,
  cost_estimate DECIMAL(10,4),
  success BOOLEAN NOT NULL DEFAULT true,
  error_type TEXT,
  model_used TEXT,
  input_size INTEGER,
  output_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Adicionar colunas para configurações avançadas de IA (se não existirem)
ALTER TABLE public.ai_settings 
ADD COLUMN IF NOT EXISTS model_preferences JSONB DEFAULT '{
  "default_model": "gpt-5-mini-2025-08-07",
  "fallback_model": "gpt-4.1-mini-2025-04-14",
  "embedding_model": "text-embedding-3-small"
}';

ALTER TABLE public.ai_settings 
ADD COLUMN IF NOT EXISTS performance_settings JSONB DEFAULT '{
  "max_concurrent_requests": 5,
  "timeout_seconds": 30,
  "retry_attempts": 3,
  "cache_embeddings": true
}';

ALTER TABLE public.ai_settings 
ADD COLUMN IF NOT EXISTS cost_controls JSONB DEFAULT '{
  "daily_cost_limit": 10.0,
  "monthly_cost_limit": 100.0,
  "auto_disable_on_limit": true,
  "cost_alerts": true
}';

-- 5. Melhorar tabela de logs com mais campos
ALTER TABLE public.ai_prompt_logs 
ADD COLUMN IF NOT EXISTS feature_type TEXT,
ADD COLUMN IF NOT EXISTS organization_id UUID,
ADD COLUMN IF NOT EXISTS cached BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS user_feedback INTEGER; -- 1-5 rating

-- 6. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_ai_prompt_logs_user_created 
ON public.ai_prompt_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_prompt_logs_organization_created 
ON public.ai_prompt_logs(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_prompt_logs_feature_type 
ON public.ai_prompt_logs(feature_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_quotas_user_period 
ON public.ai_usage_quotas(user_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_ai_usage_quotas_organization_period 
ON public.ai_usage_quotas(organization_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_ai_embeddings_cache_hash 
ON public.ai_embeddings_cache(content_hash);

CREATE INDEX IF NOT EXISTS idx_ai_embeddings_cache_type_expires 
ON public.ai_embeddings_cache(content_type, expires_at);

CREATE INDEX IF NOT EXISTS idx_ai_performance_metrics_user_feature 
ON public.ai_performance_metrics(user_id, feature, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_performance_metrics_organization_feature 
ON public.ai_performance_metrics(organization_id, feature, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leads_embedding 
ON public.leads USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 7. Habilitar RLS nas novas tabelas
ALTER TABLE public.ai_usage_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_embeddings_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_performance_metrics ENABLE ROW LEVEL SECURITY;

-- 8. Criar políticas RLS para ai_usage_quotas
CREATE POLICY "Organization members can view usage quotas" 
ON public.ai_usage_quotas 
FOR SELECT 
USING (organization_id IN (
  SELECT organization_id FROM organization_members 
  WHERE user_id = auth.uid()
));

CREATE POLICY "System can manage usage quotas" 
ON public.ai_usage_quotas 
FOR ALL 
USING (true)
WITH CHECK (true);

-- 9. Criar políticas RLS para ai_embeddings_cache
CREATE POLICY "Embeddings cache is system managed" 
ON public.ai_embeddings_cache 
FOR ALL 
USING (true)
WITH CHECK (true);

-- 10. Criar políticas RLS para ai_performance_metrics
CREATE POLICY "Organization members can view performance metrics" 
ON public.ai_performance_metrics 
FOR SELECT 
USING (organization_id IN (
  SELECT organization_id FROM organization_members 
  WHERE user_id = auth.uid()
));

CREATE POLICY "System can insert performance metrics" 
ON public.ai_performance_metrics 
FOR INSERT 
WITH CHECK (true);

-- 11. Criar trigger para atualizar updated_at
CREATE TRIGGER update_ai_usage_quotas_updated_at
  BEFORE UPDATE ON public.ai_usage_quotas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Criar função para limpeza automática de cache
CREATE OR REPLACE FUNCTION public.cleanup_expired_embeddings()
RETURNS void AS $$
BEGIN
  DELETE FROM public.ai_embeddings_cache 
  WHERE expires_at < now() 
  AND access_count < 5; -- Manter embeddings mais usados por mais tempo
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Criar função para reset de quotas diárias
CREATE OR REPLACE FUNCTION public.reset_daily_ai_quotas()
RETURNS void AS $$
BEGIN
  -- Criar novos períodos de quota para hoje
  INSERT INTO public.ai_usage_quotas (user_id, organization_id, tokens_limit, requests_limit)
  SELECT DISTINCT 
    om.user_id,
    om.organization_id,
    COALESCE((ais.limits->>'daily_tokens')::integer, 50000) as tokens_limit,
    COALESCE((ais.limits->>'daily_requests')::integer, 100) as requests_limit
  FROM organization_members om
  LEFT JOIN ai_settings ais ON ais.organization_id = om.organization_id
  WHERE NOT EXISTS (
    SELECT 1 FROM ai_usage_quotas auq 
    WHERE auq.user_id = om.user_id 
    AND auq.organization_id = om.organization_id
    AND auq.period_start = date_trunc('day', now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Função para obter usage atual do usuário
CREATE OR REPLACE FUNCTION public.get_current_ai_usage(p_user_id UUID, p_organization_id UUID)
RETURNS JSONB AS $$
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
  FROM ai_usage_quotas
  WHERE user_id = p_user_id 
  AND organization_id = p_organization_id
  AND period_start = date_trunc('day', now());
  
  -- Uso mensal
  SELECT 
    COALESCE(SUM(tokens_used), 0) as tokens_used,
    COALESCE(SUM(requests_made), 0) as requests_made,
    COALESCE(SUM(cost_incurred), 0) as cost_incurred
  INTO monthly_usage
  FROM ai_usage_quotas
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
$$ LANGUAGE plpgsql SECURITY DEFINER;