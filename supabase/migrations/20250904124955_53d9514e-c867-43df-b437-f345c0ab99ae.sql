-- Security Fix: Ensure leads table has proper organization_id constraints
-- This prevents the security vulnerability where leads without organization_id could be accessible

-- First, update any existing leads that don't have organization_id
-- We'll assign them to their user's default organization
UPDATE leads 
SET organization_id = (
  SELECT om.organization_id 
  FROM organization_members om 
  WHERE om.user_id = leads.user_id 
  LIMIT 1
)
WHERE organization_id IS NULL;

-- Now make organization_id NOT NULL to prevent future security issues
ALTER TABLE leads 
ALTER COLUMN organization_id SET NOT NULL;

-- Add a check constraint to ensure organization_id is always present
ALTER TABLE leads 
ADD CONSTRAINT leads_organization_id_not_null 
CHECK (organization_id IS NOT NULL);

-- Improve RLS policies to be more explicit about NULL handling
-- Drop existing policies
DROP POLICY IF EXISTS "Organization members can view leads" ON leads;
DROP POLICY IF EXISTS "Organization members can insert leads" ON leads;
DROP POLICY IF EXISTS "Organization members can update leads" ON leads;
DROP POLICY IF EXISTS "Organization members can delete leads" ON leads;

-- Recreate policies with improved security
CREATE POLICY "Organization members can view leads" 
ON leads FOR SELECT 
TO authenticated 
USING (
  organization_id IS NOT NULL 
  AND organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Organization members can insert leads" 
ON leads FOR INSERT 
TO authenticated 
WITH CHECK (
  organization_id IS NOT NULL 
  AND organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Organization members can update leads" 
ON leads FOR UPDATE 
TO authenticated 
USING (
  organization_id IS NOT NULL 
  AND organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  organization_id IS NOT NULL 
  AND organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Organization members can delete leads" 
ON leads FOR DELETE 
TO authenticated 
USING (
  organization_id IS NOT NULL 
  AND organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Add audit function to log access to sensitive data
CREATE OR REPLACE FUNCTION log_sensitive_data_access()
RETURNS trigger AS $$
BEGIN
  -- Log any access to leads table for security monitoring
  INSERT INTO audit_logs (table_name, action, user_id, record_id, timestamp)
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    auth.uid(),
    COALESCE(NEW.id, OLD.id),
    NOW()
  );
  
  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    -- If audit logging fails, don't block the operation
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  action TEXT NOT NULL,
  user_id UUID,
  record_id UUID,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only allow viewing of audit logs by authenticated users for their own actions
CREATE POLICY "Users can view their own audit logs" 
ON audit_logs FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

-- Add trigger for leads table auditing
CREATE TRIGGER leads_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON leads
  FOR EACH ROW EXECUTE FUNCTION log_sensitive_data_access();