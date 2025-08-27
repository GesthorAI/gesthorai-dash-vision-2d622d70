-- Add missing columns to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES team_members(id);

-- Create lead_assignments table for tracking assignment history
CREATE TABLE IF NOT EXISTS lead_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  team_member_id uuid NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on lead_assignments
ALTER TABLE lead_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for lead_assignments
CREATE POLICY "Users can view assignments for their leads" 
ON lead_assignments FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = lead_assignments.lead_id 
    AND leads.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create assignments for their leads" 
ON lead_assignments FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = lead_assignments.lead_id 
    AND leads.user_id = auth.uid()
  ) 
  AND auth.uid() = assigned_by
);

CREATE POLICY "Users can update assignments for their leads" 
ON lead_assignments FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = lead_assignments.lead_id 
    AND leads.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete assignments for their leads" 
ON lead_assignments FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = lead_assignments.lead_id 
    AND leads.user_id = auth.uid()
  )
);

-- Add useful indexes
CREATE INDEX IF NOT EXISTS idx_leads_user_status ON leads(user_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_user_score ON leads(user_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_user_created ON leads(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_archived ON leads(user_id, archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lead_assignments_lead ON lead_assignments(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_member ON lead_assignments(team_member_id);

-- Add trigger for updated_at on lead_assignments
CREATE TRIGGER update_lead_assignments_updated_at
  BEFORE UPDATE ON lead_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();