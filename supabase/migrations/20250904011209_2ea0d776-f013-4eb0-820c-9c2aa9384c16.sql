-- Atualizar RLS policies para usar organization_id
-- Isso vai permitir que membros da mesma organização vejam os dados compartilhados

-- Atualizar políticas para leads
DROP POLICY IF EXISTS "Users can view their own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can insert their own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can update their own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can delete their own leads" ON public.leads;

CREATE POLICY "Organization members can view leads" 
ON public.leads 
FOR SELECT 
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Organization members can insert leads" 
ON public.leads 
FOR INSERT 
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Organization members can update leads" 
ON public.leads 
FOR UPDATE 
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Organization members can delete leads" 
ON public.leads 
FOR DELETE 
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Atualizar políticas para searches
DROP POLICY IF EXISTS "Users can view their own searches" ON public.searches;
DROP POLICY IF EXISTS "Users can insert their own searches" ON public.searches;
DROP POLICY IF EXISTS "Users can update their own searches" ON public.searches;
DROP POLICY IF EXISTS "Users can delete their own searches" ON public.searches;

CREATE POLICY "Organization members can view searches" 
ON public.searches 
FOR SELECT 
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Organization members can insert searches" 
ON public.searches 
FOR INSERT 
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Organization members can update searches" 
ON public.searches 
FOR UPDATE 
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Organization members can delete searches" 
ON public.searches 
FOR DELETE 
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Atualizar políticas para tasks
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;

CREATE POLICY "Organization members can view tasks" 
ON public.tasks 
FOR SELECT 
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Organization members can create tasks" 
ON public.tasks 
FOR INSERT 
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Organization members can update tasks" 
ON public.tasks 
FOR UPDATE 
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Organization members can delete tasks" 
ON public.tasks 
FOR DELETE 
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Atualizar políticas para team_members
DROP POLICY IF EXISTS "Users can manage their team members" ON public.team_members;

CREATE POLICY "Organization members can manage team members" 
ON public.team_members 
FOR ALL 
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Atualizar políticas para message_templates
DROP POLICY IF EXISTS "Users can view their own templates" ON public.message_templates;
DROP POLICY IF EXISTS "Users can create their own templates" ON public.message_templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON public.message_templates;
DROP POLICY IF EXISTS "Users can delete their own templates" ON public.message_templates;

CREATE POLICY "Organization members can view templates" 
ON public.message_templates 
FOR SELECT 
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Organization members can create templates" 
ON public.message_templates 
FOR INSERT 
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Organization members can update templates" 
ON public.message_templates 
FOR UPDATE 
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Organization members can delete templates" 
ON public.message_templates 
FOR DELETE 
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Atualizar políticas para assignment_rules
DROP POLICY IF EXISTS "Users can manage their assignment rules" ON public.assignment_rules;

CREATE POLICY "Organization members can manage assignment rules" 
ON public.assignment_rules 
FOR ALL 
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Atualizar políticas para ai_personas
DROP POLICY IF EXISTS "Users can manage their own AI personas" ON public.ai_personas;

CREATE POLICY "Organization members can manage AI personas" 
ON public.ai_personas 
FOR ALL 
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Atualizar políticas para ai_settings
DROP POLICY IF EXISTS "Users can manage their own AI settings" ON public.ai_settings;

CREATE POLICY "Organization members can manage AI settings" 
ON public.ai_settings 
FOR ALL 
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Atualizar políticas para workflows
DROP POLICY IF EXISTS "Users can manage their workflows" ON public.workflows;

CREATE POLICY "Organization members can manage workflows" 
ON public.workflows 
FOR ALL 
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Atualizar políticas para whatsapp_instances
DROP POLICY IF EXISTS "Users can read their own or shared instances" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Users can insert their own instances" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Users can update their own instances" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Users can delete their own instances" ON public.whatsapp_instances;

CREATE POLICY "Organization members can manage whatsapp instances" 
ON public.whatsapp_instances 
FOR ALL 
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Atualizar políticas para followup_runs
DROP POLICY IF EXISTS "Users can view their own followup runs" ON public.followup_runs;
DROP POLICY IF EXISTS "Users can create their own followup runs" ON public.followup_runs;
DROP POLICY IF EXISTS "Users can update their own followup runs" ON public.followup_runs;
DROP POLICY IF EXISTS "Users can delete their own followup runs" ON public.followup_runs;

CREATE POLICY "Organization members can manage followup runs" 
ON public.followup_runs 
FOR ALL 
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Atualizar políticas para evolution_settings
DROP POLICY IF EXISTS "Users can select their own evolution settings" ON public.evolution_settings;
DROP POLICY IF EXISTS "Users can insert their own evolution settings" ON public.evolution_settings;
DROP POLICY IF EXISTS "Users can update their own evolution settings" ON public.evolution_settings;
DROP POLICY IF EXISTS "Users can delete their own evolution settings" ON public.evolution_settings;

CREATE POLICY "Organization members can manage evolution settings" 
ON public.evolution_settings 
FOR ALL 
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);