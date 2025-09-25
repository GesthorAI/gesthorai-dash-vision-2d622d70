-- ====================================
-- CORREÇÕES DE SEGURANÇA - Resolver warnings automáticos
-- ====================================

-- 1. Corrigir search_path para todas as funções existentes
CREATE OR REPLACE FUNCTION public.validate_organization_access(org_id uuid, user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_id = org_id 
    AND organization_members.user_id = user_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_rate_limit(user_id_param uuid, operation_type text, max_requests integer DEFAULT 100, window_minutes integer DEFAULT 60)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.is_org_member(org_id uuid, user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE 
    WHEN user_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_id = org_id AND organization_members.user_id = user_id
    )
  END;
$function$;

CREATE OR REPLACE FUNCTION public.is_org_admin(org_id uuid, user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE 
    WHEN user_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_id = org_id 
      AND organization_members.user_id = user_id 
      AND role = 'admin'
    )
  END;
$function$;

-- 2. Verificar e corrigir extensões no schema público
-- Mover extensão vector do schema public para extensions (se existir)
DO $$ 
BEGIN
    -- Verificar se a extensão vector está no schema public
    IF EXISTS (
        SELECT 1 FROM pg_extension e 
        JOIN pg_namespace n ON n.oid = e.extnamespace 
        WHERE e.extname = 'vector' AND n.nspname = 'public'
    ) THEN
        -- Criar schema extensions se não existir
        CREATE SCHEMA IF NOT EXISTS extensions;
        
        -- Mover a extensão para o schema extensions
        ALTER EXTENSION vector SET SCHEMA extensions;
        
        -- Garantir que o search_path inclui extensions
        ALTER DATABASE postgres SET search_path = "$user", public, extensions;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Se houver erro, apenas continue - pode ser que não tenhamos permissão
        NULL;
END $$;

-- 3. Função para monitorar tentativas de acesso suspeitas
CREATE OR REPLACE FUNCTION public.log_suspicious_access(
    access_type TEXT,
    resource_id UUID DEFAULT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.audit_logs (
        table_name,
        action,
        user_id,
        record_id,
        timestamp
    ) VALUES (
        'security_access',
        access_type,
        auth.uid(),
        resource_id,
        NOW()
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Não bloquear operação se log falhar
        NULL;
END;
$function$;

-- 4. Função para verificar integridade de dados
CREATE OR REPLACE FUNCTION public.verify_data_integrity()
RETURNS TABLE(
    table_name TEXT,
    issue_type TEXT,
    issue_count BIGINT,
    description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Verificar leads órfãos (sem organização)
    RETURN QUERY
    SELECT 
        'leads'::TEXT as table_name,
        'orphaned_records'::TEXT as issue_type,
        COUNT(*)::BIGINT as issue_count,
        'Leads without valid organization_id'::TEXT as description
    FROM public.leads 
    WHERE organization_id IS NULL;
    
    -- Verificar duplicatas por email
    RETURN QUERY
    SELECT 
        'leads'::TEXT as table_name,
        'duplicate_emails'::TEXT as issue_type,
        COUNT(*)::BIGINT as issue_count,
        'Leads with duplicate normalized emails'::TEXT as description
    FROM (
        SELECT normalized_email, organization_id
        FROM public.leads 
        WHERE normalized_email IS NOT NULL
        GROUP BY normalized_email, organization_id 
        HAVING COUNT(*) > 1
    ) duplicates;
    
    -- Verificar usuários sem organizações
    RETURN QUERY
    SELECT 
        'organization_members'::TEXT as table_name,
        'users_without_org'::TEXT as issue_type,
        COUNT(*)::BIGINT as issue_count,
        'Users not assigned to any organization'::TEXT as description
    FROM auth.users u
    WHERE NOT EXISTS (
        SELECT 1 FROM public.organization_members om 
        WHERE om.user_id = u.id
    );
END;
$function$;

-- 5. Função para sanitização de entrada
CREATE OR REPLACE FUNCTION public.sanitize_input(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    IF input_text IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Remover caracteres perigosos e normalizar
    RETURN trim(
        regexp_replace(
            regexp_replace(input_text, '[<>"\'';&]', '', 'g'),
            '\s+', ' ', 'g'
        )
    );
END;
$function$;

-- 6. Política RLS aprimorada para AI usage quotas
DROP POLICY IF EXISTS "Organization members can view usage quotas" ON public.ai_usage_quotas;
CREATE POLICY "Enhanced AI usage quotas access"
ON public.ai_usage_quotas
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid() OR 
    public.is_org_admin(organization_id, auth.uid())
);

-- 7. Função para cleanup automático de dados expirados
CREATE OR REPLACE FUNCTION public.cleanup_expired_data_enhanced()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    cleanup_count INTEGER := 0;
    temp_count INTEGER;
BEGIN
    -- Clean up expired organization invites
    DELETE FROM public.organization_invites 
    WHERE expires_at < now() AND accepted_at IS NULL;
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    cleanup_count := cleanup_count + temp_count;
    
    -- Clean up old AI prompt logs (keep last 90 days)
    DELETE FROM public.ai_prompt_logs 
    WHERE created_at < now() - interval '90 days';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    cleanup_count := cleanup_count + temp_count;
    
    -- Clean up old audit logs (keep last 1 year)
    DELETE FROM public.audit_logs 
    WHERE timestamp < now() - interval '1 year';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    cleanup_count := cleanup_count + temp_count;
    
    -- Clean up unused embeddings cache
    DELETE FROM public.ai_embeddings_cache 
    WHERE expires_at < now() AND access_count < 3;
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    cleanup_count := cleanup_count + temp_count;
    
    RETURN cleanup_count;
END;
$function$;

-- 8. Índices para melhorar performance de queries de segurança
CREATE INDEX IF NOT EXISTS idx_organization_members_user_role 
ON public.organization_members(user_id, organization_id, role);

CREATE INDEX IF NOT EXISTS idx_leads_organization_normalized_email 
ON public.leads(organization_id, normalized_email) 
WHERE normalized_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp_user 
ON public.audit_logs(timestamp DESC, user_id) 
WHERE user_id IS NOT NULL;