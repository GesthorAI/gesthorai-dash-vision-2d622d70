-- Create organization_invites table for managing email invitations
CREATE TABLE public.organization_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member'::text,
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL,
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE NULL,
  user_id UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organization_invites
CREATE POLICY "Organization admins can manage invites" 
ON public.organization_invites 
FOR ALL 
USING (is_org_admin(organization_id));

CREATE POLICY "Users can view invites sent to their email" 
ON public.organization_invites 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  email IN (
    SELECT email FROM auth.users WHERE id = auth.uid()
    UNION
    SELECT email FROM public.profiles WHERE id = auth.uid()
  )
);

-- Function to accept organization invite
CREATE OR REPLACE FUNCTION public.accept_organization_invite(invite_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_record organization_invites;
  user_id_val UUID;
  user_email TEXT;
  result JSON;
BEGIN
  -- Get current user
  user_id_val := auth.uid();
  
  IF user_id_val IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get user email
  SELECT email INTO user_email FROM auth.users WHERE id = user_id_val;
  
  IF user_email IS NULL THEN
    SELECT email INTO user_email FROM public.profiles WHERE id = user_id_val;
  END IF;
  
  -- Find valid invite
  SELECT * INTO invite_record
  FROM organization_invites 
  WHERE token = invite_token 
    AND email = user_email
    AND expires_at > now()
    AND accepted_at IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation token';
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_id = invite_record.organization_id 
    AND user_id = user_id_val
  ) THEN
    RAISE EXCEPTION 'User is already a member of this organization';
  END IF;
  
  -- Add user to organization
  INSERT INTO organization_members (organization_id, user_id, role, invited_by)
  VALUES (invite_record.organization_id, user_id_val, invite_record.role, invite_record.invited_by);
  
  -- Mark invite as accepted
  UPDATE organization_invites 
  SET accepted_at = now(), user_id = user_id_val, updated_at = now()
  WHERE id = invite_record.id;
  
  -- Get organization info
  SELECT json_build_object(
    'organization_id', invite_record.organization_id,
    'role', invite_record.role,
    'message', 'Successfully joined organization'
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Function to cleanup expired invites
CREATE OR REPLACE FUNCTION public.cleanup_expired_invites()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM organization_invites 
  WHERE expires_at < now() AND accepted_at IS NULL;
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_organization_invites_updated_at
BEFORE UPDATE ON public.organization_invites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_organization_invites_token ON public.organization_invites(token);
CREATE INDEX idx_organization_invites_email ON public.organization_invites(email);
CREATE INDEX idx_organization_invites_expires ON public.organization_invites(expires_at);