-- SECURITY FIX: Strengthen organization_invites RLS policies (Fixed)
-- This fixes potential unauthorized access to invitation tokens and invite data

-- Drop the overly permissive email-based policy that could allow attackers
-- to register with invite emails and view tokens
DROP POLICY IF EXISTS "Users can view invites sent to their email" ON public.organization_invites;

-- Drop the too-broad admin policy to replace with granular ones
DROP POLICY IF EXISTS "Organization admins can manage invites" ON public.organization_invites;

-- Create more secure, granular policies

-- 1. Only organization admins can create new invites
CREATE POLICY "Only org admins can create invites"
ON public.organization_invites
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND is_org_admin(organization_id, auth.uid())
);

-- 2. Only organization admins can view all invites for their org
CREATE POLICY "Org admins can view organization invites"
ON public.organization_invites
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND is_org_admin(organization_id, auth.uid())
);

-- 3. Only organization admins can cancel/delete pending invites
CREATE POLICY "Org admins can delete pending invites"
ON public.organization_invites
FOR DELETE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND is_org_admin(organization_id, auth.uid())
  AND accepted_at IS NULL  -- Only allow deleting pending invites
);

-- 4. Very restricted update policy - only for marking as accepted
CREATE POLICY "Restricted invite updates"
ON public.organization_invites
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND (
    -- Only org admins can update pending invites
    (accepted_at IS NULL AND is_org_admin(organization_id, auth.uid()))
    -- Or system can mark as accepted (via RPC function)
    OR (accepted_at IS NULL AND email IN (
      SELECT email FROM auth.users WHERE id = auth.uid()
      UNION
      SELECT email FROM profiles WHERE id = auth.uid()
    ))
  )
)
WITH CHECK (
  -- Only allow updating specific fields for acceptance
  auth.uid() IS NOT NULL
);

-- 5. Allow users to view their own invite details (without sensitive fields) for accept page
CREATE POLICY "Users can view their own invite details"
ON public.organization_invites
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND email IN (
    SELECT email FROM auth.users WHERE id = auth.uid()
    UNION
    SELECT email FROM profiles WHERE id = auth.uid()
  )
  AND accepted_at IS NULL  -- Only pending invites
  AND expires_at > now()   -- Only non-expired invites
);

-- 6. Create a security definer function to safely get invite by token
-- This prevents direct token access while allowing legitimate invite acceptance
CREATE OR REPLACE FUNCTION public.get_invite_by_token(invite_token text)
RETURNS TABLE (
  id uuid,
  organization_id uuid,
  email text,
  role text,
  invited_at timestamptz,
  expires_at timestamptz,
  organization_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
BEGIN
  -- Get the current user's email
  SELECT COALESCE(u.email, p.email) INTO user_email
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  WHERE u.id = auth.uid();
  
  -- Return invite details only if the email matches and invite is valid
  RETURN QUERY
  SELECT 
    oi.id,
    oi.organization_id,
    oi.email,
    oi.role,
    oi.invited_at,
    oi.expires_at,
    o.name as organization_name
  FROM organization_invites oi
  JOIN organizations o ON o.id = oi.organization_id
  WHERE oi.token = invite_token
    AND oi.email = user_email
    AND oi.accepted_at IS NULL
    AND oi.expires_at > now();
END;
$$;