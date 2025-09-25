-- ====================================
-- FASE 2: Validações Avançadas e Políticas RLS Específicas
-- ====================================

-- 1. Função para validar dados de lead
CREATE OR REPLACE FUNCTION public.validate_lead_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Validar email se fornecido
  IF NEW.email IS NOT NULL AND NEW.email != '' THEN
    IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid email format: %', NEW.email;
    END IF;
  END IF;

  -- Validar telefone se fornecido
  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    -- Remover caracteres não numéricos para validação
    IF regexp_replace(NEW.phone, '[^0-9]', '', 'g') !~ '^[0-9]{10,15}$' THEN
      RAISE EXCEPTION 'Invalid phone format: %', NEW.phone;
    END IF;
  END IF;

  -- Normalizar dados
  IF NEW.email IS NOT NULL THEN
    NEW.normalized_email := lower(trim(NEW.email));
  END IF;
  
  IF NEW.phone IS NOT NULL THEN
    NEW.normalized_phone := regexp_replace(NEW.phone, '[^0-9]', '', 'g');
  END IF;

  -- Validar score range
  IF NEW.score IS NOT NULL AND (NEW.score < 0 OR NEW.score > 100) THEN
    RAISE EXCEPTION 'Score must be between 0 and 100: %', NEW.score;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. Trigger para validação de leads
DROP TRIGGER IF EXISTS validate_lead_data_trigger ON public.leads;
CREATE TRIGGER validate_lead_data_trigger
  BEFORE INSERT OR UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_lead_data();

-- 3. Função para prevenir duplicatas de leads
CREATE OR REPLACE FUNCTION public.check_duplicate_leads()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  duplicate_count INTEGER;
BEGIN
  -- Verificar duplicatas por email normalizado
  IF NEW.normalized_email IS NOT NULL AND NEW.normalized_email != '' THEN
    SELECT COUNT(*) INTO duplicate_count
    FROM public.leads 
    WHERE normalized_email = NEW.normalized_email 
    AND organization_id = NEW.organization_id
    AND id != COALESCE(NEW.id, gen_random_uuid());
    
    IF duplicate_count > 0 THEN
      RAISE EXCEPTION 'Duplicate lead found with email: %', NEW.email;
    END IF;
  END IF;

  -- Verificar duplicatas por telefone normalizado
  IF NEW.normalized_phone IS NOT NULL AND NEW.normalized_phone != '' THEN
    SELECT COUNT(*) INTO duplicate_count
    FROM public.leads 
    WHERE normalized_phone = NEW.normalized_phone 
    AND organization_id = NEW.organization_id
    AND id != COALESCE(NEW.id, gen_random_uuid());
    
    IF duplicate_count > 0 THEN
      RAISE EXCEPTION 'Duplicate lead found with phone: %', NEW.phone;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 4. Trigger para verificação de duplicatas
DROP TRIGGER IF EXISTS check_duplicate_leads_trigger ON public.leads;
CREATE TRIGGER check_duplicate_leads_trigger
  BEFORE INSERT OR UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.check_duplicate_leads();

-- 5. Função para audit trail automático
CREATE OR REPLACE FUNCTION public.create_audit_trail()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Inserir log de auditoria para operações sensíveis
  INSERT INTO public.audit_logs (
    table_name,
    action,
    user_id,
    record_id,
    timestamp
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    auth.uid(),
    COALESCE(NEW.id, OLD.id),
    NOW()
  );
  
  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    -- Não bloquear operação se auditoria falhar
    RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 6. Triggers de auditoria para tabelas sensíveis
DROP TRIGGER IF EXISTS audit_leads_changes ON public.leads;
CREATE TRIGGER audit_leads_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.create_audit_trail();

DROP TRIGGER IF EXISTS audit_ai_settings_changes ON public.ai_settings;
CREATE TRIGGER audit_ai_settings_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.ai_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.create_audit_trail();

-- 7. Política RLS para comunicações baseada em função
CREATE OR REPLACE FUNCTION public.can_access_communications(comm_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = comm_organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('admin', 'manager', 'agent')
  );
$$;

-- 8. Melhorar políticas RLS para communications
DROP POLICY IF EXISTS "Organization members can view communications" ON public.communications;
CREATE POLICY "Enhanced organization communications access"
ON public.communications
FOR ALL
TO authenticated
USING (public.can_access_communications(organization_id))
WITH CHECK (public.can_access_communications(organization_id));

-- 9. Função para limitar tentativas de login por IP
CREATE OR REPLACE FUNCTION public.check_login_attempts(ip_address TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  attempt_count INTEGER;
BEGIN
  -- Contar tentativas nas últimas 15 minutos
  SELECT COUNT(*) INTO attempt_count
  FROM auth.audit_log_entries
  WHERE ip_address = check_login_attempts.ip_address
  AND created_at > NOW() - INTERVAL '15 minutes'
  AND payload->>'error_code' = 'invalid_credentials';
  
  -- Máximo 5 tentativas por 15 minutos
  RETURN attempt_count < 5;
END;
$function$;

-- 10. Função para validar força da senha
CREATE OR REPLACE FUNCTION public.validate_password_strength(password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Mínimo 8 caracteres, pelo menos uma maiúscula, minúscula, número e símbolo
  RETURN (
    length(password) >= 8 AND
    password ~ '[A-Z]' AND
    password ~ '[a-z]' AND
    password ~ '[0-9]' AND
    password ~ '[^A-Za-z0-9]'
  );
END;
$function$;

-- 11. Função para mascarar dados sensíveis em logs
CREATE OR REPLACE FUNCTION public.mask_sensitive_data(data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB := data;
  sensitive_fields TEXT[] := ARRAY['password', 'token', 'api_key', 'email', 'phone', 'cpf', 'cnpj'];
  field TEXT;
BEGIN
  FOREACH field IN ARRAY sensitive_fields LOOP
    IF result ? field THEN
      result := jsonb_set(result, ARRAY[field], '"[MASKED]"'::jsonb);
    END IF;
  END LOOP;
  
  RETURN result;
END;
$function$;

-- 12. Índices adicionais para performance e segurança
CREATE INDEX IF NOT EXISTS idx_leads_normalized_email_org 
ON public.leads(normalized_email, organization_id) 
WHERE normalized_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_normalized_phone_org 
ON public.leads(normalized_phone, organization_id) 
WHERE normalized_phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_table 
ON public.audit_logs(user_id, table_name, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_quotas_period 
ON public.ai_usage_quotas(user_id, organization_id, period_start DESC);

-- 13. Função para verificar quotas de AI em tempo real
CREATE OR REPLACE FUNCTION public.check_ai_quota_available(
  p_user_id UUID, 
  p_organization_id UUID, 
  p_tokens_required INTEGER DEFAULT 1000
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  daily_usage INTEGER;
  daily_limit INTEGER;
BEGIN
  -- Buscar uso e limite diário
  SELECT 
    COALESCE(SUM(tokens_used), 0),
    MAX(tokens_limit)
  INTO daily_usage, daily_limit
  FROM public.ai_usage_quotas
  WHERE user_id = p_user_id 
  AND organization_id = p_organization_id
  AND period_start = date_trunc('day', NOW());
  
  -- Se não há registro, usar limite padrão
  IF daily_limit IS NULL THEN
    daily_limit := 50000;
  END IF;
  
  -- Verificar se há quota suficiente
  RETURN (daily_usage + p_tokens_required) <= daily_limit;
END;
$function$;

-- 14. Função para registrar uso de AI de forma atômica
CREATE OR REPLACE FUNCTION public.record_ai_usage(
  p_user_id UUID,
  p_organization_id UUID,
  p_tokens_used INTEGER,
  p_cost_estimate DECIMAL DEFAULT 0.0,
  p_feature_type TEXT DEFAULT 'general'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_period DATE := date_trunc('day', NOW());
BEGIN
  -- Inserir ou atualizar usage quota
  INSERT INTO public.ai_usage_quotas (
    user_id,
    organization_id,
    period_start,
    period_end,
    tokens_used,
    requests_made,
    cost_incurred
  ) VALUES (
    p_user_id,
    p_organization_id,
    current_period,
    current_period + INTERVAL '1 day',
    p_tokens_used,
    1,
    p_cost_estimate
  )
  ON CONFLICT (user_id, organization_id, period_start)
  DO UPDATE SET
    tokens_used = ai_usage_quotas.tokens_used + p_tokens_used,
    requests_made = ai_usage_quotas.requests_made + 1,
    cost_incurred = ai_usage_quotas.cost_incurred + p_cost_estimate,
    updated_at = NOW();
END;
$function$;