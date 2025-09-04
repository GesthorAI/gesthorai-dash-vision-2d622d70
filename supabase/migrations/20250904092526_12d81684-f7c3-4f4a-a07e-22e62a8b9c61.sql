-- Create helper functions to avoid recursive RLS policies
CREATE OR REPLACE FUNCTION public.is_org_member(org_id uuid, user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_id = org_id AND organization_members.user_id = user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(org_id uuid, user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_id = org_id 
    AND organization_members.user_id = user_id 
    AND role = 'admin'
  );
$$;

-- Fix RLS policies for organization_members to avoid recursion
DROP POLICY IF EXISTS "Admins can manage organization members" ON organization_members;
DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;

CREATE POLICY "Admins can manage organization members" 
ON organization_members 
FOR ALL 
USING (public.is_org_admin(organization_id));

CREATE POLICY "Users can view members of their organizations" 
ON organization_members 
FOR SELECT 
USING (public.is_org_member(organization_id));

-- Create RPC function for creating organization with admin
CREATE OR REPLACE FUNCTION public.create_organization_with_admin(org_name text, org_slug text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org organizations;
  user_id_val uuid;
BEGIN
  -- Get current user ID
  user_id_val := auth.uid();
  
  IF user_id_val IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Create organization
  INSERT INTO organizations (name, slug, plan, max_users, max_leads)
  VALUES (org_name, org_slug, 'free', 5, 1000)
  RETURNING * INTO new_org;
  
  -- Add user as admin
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (new_org.id, user_id_val, 'admin');
  
  -- Return the new organization
  RETURN row_to_json(new_org);
END;
$$;

-- Enable INSERT policy for organizations via RPC
CREATE POLICY "Users can create organizations via RPC" 
ON organizations 
FOR INSERT 
WITH CHECK (true);

-- Ensure triggers are active for new users
DROP TRIGGER IF EXISTS on_auth_user_created_organization ON auth.users;
CREATE TRIGGER on_auth_user_created_organization
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_organization();

DROP TRIGGER IF EXISTS on_auth_user_created_personas ON auth.users;  
CREATE TRIGGER on_auth_user_created_personas
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_default_ai_personas();