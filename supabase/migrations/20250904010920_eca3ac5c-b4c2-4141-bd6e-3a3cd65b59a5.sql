-- Fase 1: Estrutura Base Multi-Tenant

-- Criar tabela de organizações (tenants)
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb,
  plan TEXT DEFAULT 'free',
  max_users INTEGER DEFAULT 5,
  max_leads INTEGER DEFAULT 1000,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de membros da organização
CREATE TABLE public.organization_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  invited_by UUID REFERENCES auth.users(id),
  UNIQUE(organization_id, user_id)
);

-- Adicionar organization_id nas tabelas existentes
ALTER TABLE public.leads ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.searches ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.tasks ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.team_members ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.message_templates ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.followup_runs ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.whatsapp_instances ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.workflows ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.ai_personas ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.ai_settings ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.assignment_rules ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.evolution_settings ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para organizations
CREATE POLICY "Users can view their organizations" 
ON public.organizations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = organizations.id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their organizations if admin" 
ON public.organizations 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = organizations.id 
    AND user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Políticas RLS para organization_members
CREATE POLICY "Users can view members of their organizations" 
ON public.organization_members 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om 
    WHERE om.organization_id = organization_members.organization_id 
    AND om.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage organization members" 
ON public.organization_members 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = organization_members.organization_id 
    AND user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Função para criar organização padrão ao criar usuário
CREATE OR REPLACE FUNCTION public.create_user_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id UUID;
  user_name TEXT;
BEGIN
  -- Pegar nome do usuário
  user_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email);
  
  -- Criar organização padrão
  INSERT INTO public.organizations (name, slug, plan, max_users, max_leads)
  VALUES (
    user_name || ' Org',
    'org-' || NEW.id::text,
    'free',
    5,
    1000
  )
  RETURNING id INTO org_id;
  
  -- Adicionar usuário como admin da organização
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (org_id, NEW.id, 'admin');
  
  RETURN NEW;
END;
$$;

-- Trigger para criar organização ao criar usuário
CREATE TRIGGER on_auth_user_created_org
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_organization();

-- Função para migrar dados existentes
CREATE OR REPLACE FUNCTION public.migrate_existing_data_to_orgs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  org_id UUID;
BEGIN
  -- Para cada usuário existente sem organização
  FOR user_record IN 
    SELECT DISTINCT u.id, u.email, u.raw_user_meta_data
    FROM auth.users u
    WHERE NOT EXISTS (
      SELECT 1 FROM public.organization_members om 
      WHERE om.user_id = u.id
    )
  LOOP
    -- Criar organização para o usuário
    INSERT INTO public.organizations (name, slug, plan, max_users, max_leads)
    VALUES (
      COALESCE(user_record.raw_user_meta_data ->> 'full_name', user_record.email) || ' Org',
      'org-' || user_record.id::text,
      'free',
      5,
      1000
    )
    RETURNING id INTO org_id;
    
    -- Adicionar como admin
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (org_id, user_record.id, 'admin');
    
    -- Migrar dados existentes
    UPDATE public.leads SET organization_id = org_id WHERE user_id = user_record.id;
    UPDATE public.searches SET organization_id = org_id WHERE user_id = user_record.id;
    UPDATE public.tasks SET organization_id = org_id WHERE user_id = user_record.id;
    UPDATE public.team_members SET organization_id = org_id WHERE user_id = user_record.id;
    UPDATE public.message_templates SET organization_id = org_id WHERE user_id = user_record.id;
    UPDATE public.followup_runs SET organization_id = org_id WHERE user_id = user_record.id;
    UPDATE public.whatsapp_instances SET organization_id = org_id WHERE user_id = user_record.id;
    UPDATE public.workflows SET organization_id = org_id WHERE user_id = user_record.id;
    UPDATE public.ai_personas SET organization_id = org_id WHERE user_id = user_record.id;
    UPDATE public.ai_settings SET organization_id = org_id WHERE user_id = user_record.id;
    UPDATE public.assignment_rules SET organization_id = org_id WHERE user_id = user_record.id;
    UPDATE public.evolution_settings SET organization_id = org_id WHERE user_id = user_record.id;
  END LOOP;
END;
$$;

-- Executar migração dos dados existentes
SELECT public.migrate_existing_data_to_orgs();

-- Trigger para updated_at nas novas tabelas
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();