-- Security and performance improvements migration (final)

-- 1. Create basic performance indexes
CREATE INDEX IF NOT EXISTS idx_leads_organization_status ON public.leads(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_user_created ON public.leads(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_phone_search ON public.leads(normalized_phone);
CREATE INDEX IF NOT EXISTS idx_leads_email_search ON public.leads(normalized_email);

-- 2. Add indexes for search performance
CREATE INDEX IF NOT EXISTS idx_searches_org_status ON public.searches(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_org_status ON public.tasks(organization_id, status, created_at DESC);

-- 3. Add indexes for AI performance tracking
CREATE INDEX IF NOT EXISTS idx_ai_performance_org_feature ON public.ai_performance_metrics(organization_id, feature, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_quotas_user_period ON public.ai_usage_quotas(user_id, period_start);

-- 4. Add indexes for communications
CREATE INDEX IF NOT EXISTS idx_communications_lead_created ON public.communications(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_communications_org_type ON public.communications(organization_id, type, created_at DESC);

-- 5. Add indexes for organization management
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_token ON public.organization_invites(token);

-- 6. Improve embeddings cache performance
CREATE INDEX IF NOT EXISTS idx_embeddings_hash_type ON public.ai_embeddings_cache(content_hash, content_type);
CREATE INDEX IF NOT EXISTS idx_embeddings_expires ON public.ai_embeddings_cache(expires_at);

-- 7. Add function to clean up expired data automatically
CREATE OR REPLACE FUNCTION public.cleanup_expired_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Clean up expired organization invites
  DELETE FROM public.organization_invites 
  WHERE expires_at < now() AND accepted_at IS NULL;
  
  -- Clean up expired embeddings cache
  DELETE FROM public.ai_embeddings_cache 
  WHERE expires_at < now() AND access_count < 3;
  
  -- Clean up old AI logs (keep last 30 days)
  DELETE FROM public.ai_prompt_logs 
  WHERE created_at < now() - interval '30 days';
  
  -- Clean up old performance metrics (keep last 90 days)
  DELETE FROM public.ai_performance_metrics 
  WHERE created_at < now() - interval '90 days';
END;
$$;

-- 8. Add security function to rate limit API calls
CREATE OR REPLACE FUNCTION public.check_rate_limit(user_id_param uuid, operation_type text, max_requests integer DEFAULT 100, window_minutes integer DEFAULT 60)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_count integer;
BEGIN
  -- Count requests in the time window
  SELECT COUNT(*) INTO request_count
  FROM public.ai_usage_quotas
  WHERE user_id = user_id_param
    AND period_start > now() - (window_minutes || ' minutes')::interval;
  
  -- Return true if under limit
  RETURN request_count < max_requests;
END;
$$;

-- 9. Add composite indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_search_filters ON public.leads(organization_id, status, niche, city);
CREATE INDEX IF NOT EXISTS idx_followup_runs_status ON public.followup_runs(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_logs_feature_date ON public.ai_prompt_logs(organization_id, feature_type, created_at DESC);

-- 10. Create function to validate organization membership
CREATE OR REPLACE FUNCTION public.validate_organization_access(org_id uuid, user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_id = org_id 
    AND organization_members.user_id = user_id
  );
END;
$$;