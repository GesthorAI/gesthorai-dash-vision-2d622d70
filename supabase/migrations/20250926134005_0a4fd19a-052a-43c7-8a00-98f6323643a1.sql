-- Correções críticas de segurança no schema público
-- 1. Corrigir política RLS problemática da tabela organization_invites
DROP POLICY IF EXISTS "Restricted invite updates" ON public.organization_invites;

-- Nova política mais segura para updates de convites
CREATE POLICY "Secure invite updates" 
ON public.organization_invites 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL 
  AND (
    -- Admin pode atualizar convites da sua organização (apenas pendentes)
    (is_org_admin(organization_id, auth.uid()) AND accepted_at IS NULL)
    OR 
    -- Usuário pode aceitar apenas seu próprio convite válido
    (
      accepted_at IS NULL 
      AND expires_at > now()
      AND email = COALESCE(
        (SELECT email FROM auth.users WHERE id = auth.uid()),
        (SELECT email FROM profiles WHERE id = auth.uid())
      )
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- 2. Função para validar força de senhas (para uso futuro)
CREATE OR REPLACE FUNCTION public.validate_strong_password(password text)
RETURNS boolean AS $$
BEGIN
  -- Senha deve ter no mínimo 8 caracteres, maiúscula, minúscula, número
  RETURN (
    length(password) >= 8 AND
    password ~ '[A-Z]' AND  -- Pelo menos uma maiúscula
    password ~ '[a-z]' AND  -- Pelo menos uma minúscula  
    password ~ '[0-9]'      -- Pelo menos um número
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public;

-- 3. Melhorar função de rate limiting com alertas de segurança
CREATE OR REPLACE FUNCTION public.check_rate_limit_enhanced(
  user_id_param uuid, 
  operation_type text, 
  max_requests integer DEFAULT 100, 
  window_minutes integer DEFAULT 60,
  organization_id_param uuid DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  request_count integer;
  org_multiplier integer := 1;
BEGIN
  -- Aplicar rate limit ajustado para organizações
  IF organization_id_param IS NOT NULL THEN
    SELECT COUNT(*) INTO org_multiplier
    FROM organization_members 
    WHERE organization_id = organization_id_param;
    
    -- Mais membros = mais requests permitidos (max 5x)
    max_requests := max_requests * LEAST(org_multiplier, 5);
  END IF;
  
  -- Contar requests no período
  SELECT COUNT(*) INTO request_count
  FROM public.ai_usage_quotas
  WHERE user_id = user_id_param
    AND (organization_id_param IS NULL OR organization_id = organization_id_param)
    AND period_start > now() - (window_minutes || ' minutes')::interval;
  
  -- Criar alerta se próximo do limite (80%)
  IF request_count > (max_requests * 0.8) AND organization_id_param IS NOT NULL THEN
    PERFORM public.create_security_alert(
      organization_id_param,
      'rate_limit_warning',
      'medium',
      'Rate limit warning',
      format('User approaching rate limit: %s/%s requests in %s minutes', 
             request_count, max_requests, window_minutes),
      jsonb_build_object(
        'user_id', user_id_param,
        'current_requests', request_count,
        'limit', max_requests,
        'operation_type', operation_type,
        'window_minutes', window_minutes
      )
    );
  END IF;
  
  RETURN request_count < max_requests;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Função para detectar atividade suspeita em massa
CREATE OR REPLACE FUNCTION public.detect_bulk_operations()
RETURNS TRIGGER AS $$
DECLARE
  recent_count integer;
  org_id uuid;
BEGIN
  -- Contar operações recentes (últimos 5 minutos)
  SELECT COUNT(*) INTO recent_count
  FROM audit_logs 
  WHERE user_id = NEW.user_id 
    AND action IN ('INSERT', 'UPDATE', 'DELETE')
    AND timestamp > NOW() - INTERVAL '5 minutes';
  
  -- Se muitas operações em pouco tempo, investigar
  IF recent_count > 100 THEN
    -- Buscar organização do usuário
    SELECT organization_id INTO org_id
    FROM organization_members 
    WHERE user_id = NEW.user_id 
    LIMIT 1;
    
    -- Criar alerta de segurança
    PERFORM public.create_security_alert(
      org_id,
      'suspicious_bulk_activity',
      'high',
      'Suspicious bulk operations detected',
      format('User performed %s operations in 5 minutes', recent_count),
      jsonb_build_object(
        'user_id', NEW.user_id,
        'operation_count', recent_count,
        'time_window', '5_minutes',
        'recent_action', NEW.action,
        'table_affected', NEW.table_name
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Aplicar trigger para detectar operações em massa suspeitas
DROP TRIGGER IF EXISTS detect_bulk_operations_trigger ON audit_logs;
CREATE TRIGGER detect_bulk_operations_trigger
  AFTER INSERT ON audit_logs
  FOR EACH ROW 
  WHEN (NEW.action IN ('INSERT', 'UPDATE', 'DELETE'))
  EXECUTE FUNCTION public.detect_bulk_operations();

-- 6. Função para limpar dados expirados com segurança
CREATE OR REPLACE FUNCTION public.secure_cleanup_expired_data()
RETURNS integer AS $$
DECLARE
  cleanup_count INTEGER := 0;
  temp_count INTEGER;
BEGIN
  -- Registrar início da limpeza
  INSERT INTO audit_logs (table_name, action, timestamp)
  VALUES ('system', 'cleanup_start', NOW());
  
  -- Limpar convites expirados (mais de 7 dias)
  DELETE FROM public.organization_invites 
  WHERE expires_at < now() - interval '1 day' 
    AND accepted_at IS NULL;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  cleanup_count := cleanup_count + temp_count;
  
  -- Limpar logs de AI antigos (mais de 90 dias)
  DELETE FROM public.ai_prompt_logs 
  WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  cleanup_count := cleanup_count + temp_count;
  
  -- Limpar cache de embeddings expirado
  DELETE FROM public.ai_embeddings_cache 
  WHERE expires_at < now() AND access_count < 3;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  cleanup_count := cleanup_count + temp_count;
  
  -- Limpar logs de auditoria muito antigos (mais de 1 ano)
  DELETE FROM public.audit_logs 
  WHERE timestamp < now() - interval '365 days';
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  cleanup_count := cleanup_count + temp_count;
  
  -- Registrar conclusão da limpeza
  INSERT INTO audit_logs (table_name, action, timestamp)
  VALUES ('system', 'cleanup_complete', NOW());
  
  RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Função para criar alertas de segurança automaticamente baseados em padrões
CREATE OR REPLACE FUNCTION public.analyze_security_patterns()
RETURNS void AS $$
DECLARE
  org_record RECORD;
  failed_logins INTEGER;
  high_usage_orgs INTEGER;
BEGIN
  -- Analisar padrões para cada organização
  FOR org_record IN 
    SELECT DISTINCT organization_id 
    FROM organization_members 
    WHERE organization_id IS NOT NULL
  LOOP
    -- Verificar tentativas de login falhadas
    SELECT COUNT(*) INTO failed_logins
    FROM audit_logs al
    JOIN organization_members om ON om.user_id = al.user_id
    WHERE om.organization_id = org_record.organization_id
      AND al.action = 'failed_login'
      AND al.timestamp > now() - interval '1 hour';
    
    -- Alerta se muitas tentativas falhadas
    IF failed_logins > 10 THEN
      PERFORM public.create_security_alert(
        org_record.organization_id,
        'multiple_failed_logins',
        'high',
        'Multiple failed login attempts',
        format('%s failed login attempts in the last hour', failed_logins),
        jsonb_build_object(
          'failed_count', failed_logins,
          'time_window', '1_hour'
        )
      );
    END IF;
    
    -- Verificar uso excessivo de AI
    SELECT COUNT(*) INTO high_usage_orgs
    FROM ai_usage_quotas auq
    WHERE auq.organization_id = org_record.organization_id
      AND auq.period_start = date_trunc('day', NOW())
      AND auq.tokens_used > auq.tokens_limit * 0.95;
    
    -- Alerta se uso muito alto de AI
    IF high_usage_orgs > 0 THEN
      PERFORM public.create_security_alert(
        org_record.organization_id,
        'ai_quota_exhausted',
        'medium',
        'AI quota nearly exhausted',
        'Organization has used 95% or more of daily AI quota',
        jsonb_build_object(
          'quota_usage_percentage', 95
        )
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;