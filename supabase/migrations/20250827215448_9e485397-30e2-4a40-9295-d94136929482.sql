-- Performance optimizations for lead operations

-- Add indexes for common filter combinations
CREATE INDEX IF NOT EXISTS idx_leads_user_status_score ON leads(user_id, status, score);
CREATE INDEX IF NOT EXISTS idx_leads_user_created_at ON leads(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_leads_user_niche_city ON leads(user_id, niche, city);
CREATE INDEX IF NOT EXISTS idx_leads_search_id ON leads(search_id) WHERE search_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to) WHERE assigned_to IS NOT NULL;

-- Add composite index for assignment operations
CREATE INDEX IF NOT EXISTS idx_leads_user_score_status ON leads(user_id, score DESC, status);

-- Optimize team_members and assignment_rules tables
CREATE INDEX IF NOT EXISTS idx_team_members_user_status ON team_members(user_id, status);
CREATE INDEX IF NOT EXISTS idx_assignment_rules_user_active ON assignment_rules(user_id, is_active);

-- Add foreign key relationships for data integrity
ALTER TABLE lead_assignments 
ADD CONSTRAINT fk_lead_assignments_team_member 
FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE CASCADE;

ALTER TABLE lead_assignments 
ADD CONSTRAINT fk_lead_assignments_lead 
FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;

-- Add check constraints for data validation
ALTER TABLE leads 
ADD CONSTRAINT chk_leads_score_range 
CHECK (score >= 0 AND score <= 10);

ALTER TABLE team_members 
ADD CONSTRAINT chk_team_members_capacity 
CHECK (capacity >= 0 AND capacity <= 100);

-- Update statistics for query optimization
ANALYZE leads;
ANALYZE team_members;
ANALYZE assignment_rules;