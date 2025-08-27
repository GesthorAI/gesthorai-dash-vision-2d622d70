-- Add new columns to leads table
ALTER TABLE public.leads 
ADD COLUMN archived_at TIMESTAMPTZ NULL,
ADD COLUMN assigned_to UUID NULL;

-- Create team_members table
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent',
  status TEXT NOT NULL DEFAULT 'active',
  capacity INTEGER NOT NULL DEFAULT 50,
  specialties TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create lead_assignments table
CREATE TABLE public.lead_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL,
  team_member_id UUID NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID NOT NULL,
  UNIQUE(lead_id, team_member_id)
);

-- Create assignment_rules table
CREATE TABLE public.assignment_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  criteria JSONB NOT NULL DEFAULT '{}',
  assign_to UUID[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create workflows table
CREATE TABLE public.workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}',
  conditions JSONB NOT NULL DEFAULT '[]',
  actions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for team_members
CREATE POLICY "Users can manage their team members" 
ON public.team_members 
FOR ALL 
USING (auth.uid() = user_id);

-- Create RLS policies for lead_assignments
CREATE POLICY "Users can view assignments for their leads" 
ON public.lead_assignments 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.leads 
  WHERE leads.id = lead_assignments.lead_id 
  AND leads.user_id = auth.uid()
));

CREATE POLICY "Users can create assignments for their leads" 
ON public.lead_assignments 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.leads 
  WHERE leads.id = lead_assignments.lead_id 
  AND leads.user_id = auth.uid()
) AND auth.uid() = assigned_by);

CREATE POLICY "Users can update assignments for their leads" 
ON public.lead_assignments 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.leads 
  WHERE leads.id = lead_assignments.lead_id 
  AND leads.user_id = auth.uid()
));

CREATE POLICY "Users can delete assignments for their leads" 
ON public.lead_assignments 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.leads 
  WHERE leads.id = lead_assignments.lead_id 
  AND leads.user_id = auth.uid()
));

-- Create RLS policies for assignment_rules
CREATE POLICY "Users can manage their assignment rules" 
ON public.assignment_rules 
FOR ALL 
USING (auth.uid() = user_id);

-- Create RLS policies for workflows
CREATE POLICY "Users can manage their workflows" 
ON public.workflows 
FOR ALL 
USING (auth.uid() = user_id);

-- Create useful indexes
CREATE INDEX idx_leads_archived_at ON public.leads(user_id, archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX idx_leads_assigned_to ON public.leads(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_lead_assignments_lead_id ON public.lead_assignments(lead_id);
CREATE INDEX idx_lead_assignments_team_member_id ON public.lead_assignments(team_member_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_assignment_rules_user_id ON public.assignment_rules(user_id, is_active);
CREATE INDEX idx_workflows_user_id ON public.workflows(user_id, is_active);

-- Add triggers for updated_at columns
CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assignment_rules_updated_at
  BEFORE UPDATE ON public.assignment_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON public.workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();