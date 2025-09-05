-- Fix organization_members table security by ensuring policies only apply to authenticated users
-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view members of their organizations" ON public.organization_members;

-- Create new secure policies that explicitly require authentication
CREATE POLICY "Admins can manage organization members"
ON public.organization_members
FOR ALL
TO authenticated
USING (is_org_admin(organization_id))
WITH CHECK (is_org_admin(organization_id));

CREATE POLICY "Users can view members of their organizations"
ON public.organization_members
FOR SELECT
TO authenticated
USING (is_org_member(organization_id));

-- Ensure no public access whatsoever
CREATE POLICY "Block all public access to organization members"
ON public.organization_members
FOR ALL
TO anon
USING (false);

-- Additional security: Ensure the helper functions are properly secured
-- Update is_org_member function to be more explicit about authentication
CREATE OR REPLACE FUNCTION public.is_org_member(org_id uuid, user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN user_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_id = org_id AND organization_members.user_id = user_id
    )
  END;
$$;

-- Update is_org_admin function to be more explicit about authentication
CREATE OR REPLACE FUNCTION public.is_org_admin(org_id uuid, user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN user_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_id = org_id 
      AND organization_members.user_id = user_id 
      AND role = 'admin'
    )
  END;
$$;