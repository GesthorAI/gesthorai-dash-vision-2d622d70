-- ====================================
-- FASE 3: Monitoramento Avançado e Sistema RBAC Granular
-- ====================================

-- 1. Criar tabela de permissões granulares
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  resource_type TEXT NOT NULL, -- 'leads', 'communications', 'ai_features', etc.
  action TEXT NOT NULL, -- 'create', 'read', 'update', 'delete', 'export', 'manage'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar tabela de papéis (roles) avançados
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_system_role BOOLEAN DEFAULT FALSE,
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_role_per_org UNIQUE(organization_id, name)
);

-- 3. Atualizar tabela organization_members para usar roles granulares
ALTER TABLE public.organization_members 
ADD COLUMN IF NOT EXISTS role_id UUID,
ADD COLUMN IF NOT EXISTS custom_permissions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 4. Criar tabela de alertas de segurança
CREATE TABLE IF NOT EXISTS public.security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  alert_type TEXT NOT NULL, -- 'suspicious_activity', 'data_breach', 'quota_exceeded', etc.
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'investigating', 'resolved', 'dismissed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  auto_resolved BOOLEAN DEFAULT FALSE
);

-- 5. Criar tabela de sessões de usuário para monitoramento
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID,
  session_token_hash TEXT NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  device_info JSONB DEFAULT '{}'::jsonb,
  login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  logout_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  location_info JSONB DEFAULT '{}'::jsonb
);

-- 6. Inserir permissões básicas do sistema
INSERT INTO public.permissions (name, description, resource_type, action) VALUES
-- Leads permissions
('leads:create', 'Create new leads', 'leads', 'create'),
('leads:read', 'View leads', 'leads', 'read'),
('leads:update', 'Edit lead information', 'leads', 'update'),
('leads:delete', 'Delete leads', 'leads', 'delete'),
('leads:export', 'Export leads data', 'leads', 'export'),
('leads:assign', 'Assign leads to team members', 'leads', 'assign'),

-- AI Features permissions
('ai:use_scoring', 'Use AI lead scoring', 'ai_features', 'use'),
('ai:use_followup', 'Use AI followup generation', 'ai_features', 'use'),
('ai:use_semantic_search', 'Use semantic search', 'ai_features', 'use'),
('ai:configure_settings', 'Configure AI settings', 'ai_features', 'manage'),

-- Communications permissions
('communications:send', 'Send communications', 'communications', 'create'),
('communications:view', 'View communications', 'communications', 'read'),
('communications:manage_templates', 'Manage message templates', 'communications', 'manage'),

-- Organization permissions
('organization:manage_members', 'Manage organization members', 'organization', 'manage'),
('organization:view_analytics', 'View organization analytics', 'organization', 'read'),
('organization:manage_settings', 'Manage organization settings', 'organization', 'manage'),
('organization:export_data', 'Export organization data', 'organization', 'export')
ON CONFLICT (name) DO NOTHING;

-- 7. Função para verificar permissões granulares
CREATE OR REPLACE FUNCTION public.check_user_permission(
  p_user_id UUID,
  p_organization_id UUID,
  p_permission_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  has_permission BOOLEAN := FALSE;
  user_role_id UUID;
  role_permissions JSONB;
  custom_permissions JSONB;
BEGIN
  -- Verificar se é admin (admins têm todas as permissões)
  IF public.is_org_admin(p_organization_id, p_user_id) THEN
    RETURN TRUE;
  END IF;
  
  -- Buscar role e permissões customizadas do usuário
  SELECT role_id, custom_permissions 
  INTO user_role_id, custom_permissions
  FROM organization_members 
  WHERE organization_id = p_organization_id 
  AND user_id = p_user_id;
  
  -- Verificar permissões customizadas
  IF custom_permissions ? p_permission_name THEN
    RETURN TRUE;
  END IF;
  
  -- Verificar permissões do role
  IF user_role_id IS NOT NULL THEN
    SELECT permissions INTO role_permissions
    FROM roles 
    WHERE id = user_role_id;
    
    IF role_permissions ? p_permission_name THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$function$;

-- 8. Função para criar alerta de segurança
CREATE OR REPLACE FUNCTION public.create_security_alert(
  p_organization_id UUID,
  p_alert_type TEXT,
  p_severity TEXT,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  alert_id UUID;
BEGIN
  INSERT INTO public.security_alerts (
    organization_id,
    alert_type,
    severity,
    title,
    description,
    metadata
  ) VALUES (
    p_organization_id,
    p_alert_type,
    p_severity,
    p_title,
    p_description,
    p_metadata
  ) RETURNING id INTO alert_id;
  
  RETURN alert_id;
END;
$function$;

-- 9. Função para detectar atividade suspeita
CREATE OR REPLACE FUNCTION public.detect_suspicious_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  recent_actions INTEGER;
  org_id UUID;
BEGIN
  -- Buscar organização do usuário
  SELECT organization_id INTO org_id
  FROM organization_members 
  WHERE user_id = auth.uid() 
  LIMIT 1;
  
  -- Contar ações recentes (últimos 5 minutos)
  SELECT COUNT(*) INTO recent_actions
  FROM audit_logs 
  WHERE user_id = auth.uid() 
  AND timestamp > NOW() - INTERVAL '5 minutes'
  AND action IN ('INSERT', 'UPDATE', 'DELETE');
  
  -- Se muitas ações em pouco tempo, criar alerta
  IF recent_actions > 50 THEN
    PERFORM public.create_security_alert(
      org_id,
      'suspicious_activity',
      'high',
      'Unusual activity detected',
      format('User performed %s actions in 5 minutes', recent_actions),
      jsonb_build_object(
        'user_id', auth.uid(),
        'action_count', recent_actions,
        'time_window', '5_minutes'
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 10. Trigger para monitorar atividade suspeita
DROP TRIGGER IF EXISTS monitor_suspicious_activity ON public.audit_logs;
CREATE TRIGGER monitor_suspicious_activity
  AFTER INSERT ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.detect_suspicious_activity();

-- 11. Função para registrar sessão de usuário
CREATE OR REPLACE FUNCTION public.register_user_session(
  p_user_id UUID,
  p_organization_id UUID DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  session_id UUID;
  session_token_hash TEXT;
BEGIN
  -- Gerar hash único para a sessão
  session_token_hash := encode(digest(p_user_id::text || NOW()::text || random()::text, 'sha256'), 'hex');
  
  -- Inserir nova sessão
  INSERT INTO public.user_sessions (
    user_id,
    organization_id,
    session_token_hash,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_organization_id,
    session_token_hash,
    p_ip_address::inet,
    p_user_agent
  ) RETURNING id INTO session_id;
  
  RETURN session_id;
END;
$function$;

-- 12. Função para monitorar quotas de AI por organização
CREATE OR REPLACE FUNCTION public.monitor_organization_ai_usage()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  org_record RECORD;
  daily_usage INTEGER;
  daily_limit INTEGER;
  usage_percentage DECIMAL;
BEGIN
  FOR org_record IN 
    SELECT DISTINCT organization_id FROM ai_usage_quotas 
    WHERE period_start = date_trunc('day', NOW())
  LOOP
    -- Calcular uso diário da organização
    SELECT 
      COALESCE(SUM(tokens_used), 0),
      COALESCE(MAX(tokens_limit), 100000)
    INTO daily_usage, daily_limit
    FROM ai_usage_quotas
    WHERE organization_id = org_record.organization_id
    AND period_start = date_trunc('day', NOW());
    
    usage_percentage := (daily_usage::DECIMAL / daily_limit::DECIMAL) * 100;
    
    -- Alertas baseados em uso
    IF usage_percentage >= 90 THEN
      PERFORM public.create_security_alert(
        org_record.organization_id,
        'quota_exceeded',
        'critical',
        'AI quota almost exceeded',
        format('Organization has used %s%% of daily AI quota', usage_percentage),
        jsonb_build_object(
          'usage_percentage', usage_percentage,
          'tokens_used', daily_usage,
          'tokens_limit', daily_limit
        )
      );
    ELSIF usage_percentage >= 75 THEN
      PERFORM public.create_security_alert(
        org_record.organization_id,
        'quota_warning',
        'medium',
        'High AI usage detected',
        format('Organization has used %s%% of daily AI quota', usage_percentage),
        jsonb_build_object(
          'usage_percentage', usage_percentage,
          'tokens_used', daily_usage,
          'tokens_limit', daily_limit
        )
      );
    END IF;
  END LOOP;
END;
$function$;

-- 13. RLS para as novas tabelas
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- 14. Políticas RLS para permissões (apenas leitura para membros)
CREATE POLICY "Members can view permissions"
ON public.permissions
FOR SELECT
TO authenticated
USING (TRUE);

-- 15. Políticas RLS para roles
CREATE POLICY "Organization members can view roles"
ON public.roles
FOR SELECT
TO authenticated
USING (public.is_org_member(organization_id));

CREATE POLICY "Organization admins can manage roles"
ON public.roles
FOR ALL
TO authenticated
USING (public.is_org_admin(organization_id))
WITH CHECK (public.is_org_admin(organization_id));

-- 16. Políticas RLS para alertas de segurança
CREATE POLICY "Organization members can view security alerts"
ON public.security_alerts
FOR SELECT
TO authenticated
USING (public.is_org_member(organization_id));

CREATE POLICY "Organization admins can manage security alerts"
ON public.security_alerts
FOR ALL
TO authenticated
USING (public.is_org_admin(organization_id))
WITH CHECK (public.is_org_admin(organization_id));

-- 17. Políticas RLS para sessões de usuário
CREATE POLICY "Users can view their own sessions"
ON public.user_sessions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Organization admins can view member sessions"
ON public.user_sessions
FOR SELECT
TO authenticated
USING (
  organization_id IS NOT NULL AND 
  public.is_org_admin(organization_id)
);

-- 18. Índices para performance das novas tabelas
CREATE INDEX IF NOT EXISTS idx_roles_organization 
ON public.roles(organization_id);

CREATE INDEX IF NOT EXISTS idx_security_alerts_org_status 
ON public.security_alerts(organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active 
ON public.user_sessions(user_id, is_active, last_activity DESC);

CREATE INDEX IF NOT EXISTS idx_organization_members_role 
ON public.organization_members(role_id) 
WHERE role_id IS NOT NULL;

-- 19. Trigger para atualizar updated_at nas novas tabelas
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 20. Função para relatório de segurança organizacional
CREATE OR REPLACE FUNCTION public.get_organization_security_report(p_organization_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
  active_alerts INTEGER;
  total_members INTEGER;
  recent_logins INTEGER;
  ai_usage_today INTEGER;
BEGIN
  -- Verificar se usuário tem permissão
  IF NOT public.is_org_admin(p_organization_id) THEN
    RAISE EXCEPTION 'Access denied: admin privileges required';
  END IF;
  
  -- Contar alertas ativos
  SELECT COUNT(*) INTO active_alerts
  FROM security_alerts
  WHERE organization_id = p_organization_id
  AND status = 'active';
  
  -- Contar membros totais
  SELECT COUNT(*) INTO total_members
  FROM organization_members
  WHERE organization_id = p_organization_id;
  
  -- Contar logins recentes (últimas 24h)
  SELECT COUNT(*) INTO recent_logins
  FROM user_sessions
  WHERE organization_id = p_organization_id
  AND login_at > NOW() - INTERVAL '24 hours';
  
  -- Uso de AI hoje
  SELECT COALESCE(SUM(tokens_used), 0) INTO ai_usage_today
  FROM ai_usage_quotas
  WHERE organization_id = p_organization_id
  AND period_start = date_trunc('day', NOW());
  
  result := jsonb_build_object(
    'organization_id', p_organization_id,
    'generated_at', NOW(),
    'security_metrics', jsonb_build_object(
      'active_alerts', active_alerts,
      'total_members', total_members,
      'recent_logins_24h', recent_logins,
      'ai_tokens_used_today', ai_usage_today
    )
  );
  
  RETURN result;
END;
$function$;