-- Add missing columns to leads table (only if they don't exist)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to uuid;

-- Create lead_assignments table if it doesn't exist
CREATE TABLE IF NOT EXISTS lead_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  team_member_id uuid NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on lead_assignments if not already enabled
ALTER TABLE lead_assignments ENABLE ROW LEVEL SECURITY;

-- Add useful indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_leads_user_status ON leads(user_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_user_score ON leads(user_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_user_created ON leads(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_archived ON leads(user_id, archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lead_assignments_lead ON lead_assignments(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_member ON lead_assignments(team_member_id);