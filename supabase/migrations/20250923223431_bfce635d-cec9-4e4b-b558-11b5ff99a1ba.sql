-- CRITICAL SECURITY FIX: Block anonymous access to sensitive tables
-- This fixes the vulnerability where sensitive customer data was publicly accessible

-- First, let's add explicit policies to block all anonymous access to the leads table
CREATE POLICY "Block anonymous access to leads" 
ON public.leads 
FOR ALL 
TO anon
USING (false);

-- Also block anonymous access to other sensitive tables
CREATE POLICY "Block anonymous access to profiles" 
ON public.profiles 
FOR ALL 
TO anon
USING (false);

CREATE POLICY "Block anonymous access to team_members" 
ON public.team_members 
FOR ALL 
TO anon
USING (false);

CREATE POLICY "Block anonymous access to organization_invites" 
ON public.organization_invites 
FOR ALL 
TO anon
USING (false);

CREATE POLICY "Block anonymous access to whatsapp_instances" 
ON public.whatsapp_instances 
FOR ALL 
TO anon
USING (false);

CREATE POLICY "Block anonymous access to communications" 
ON public.communications 
FOR ALL 
TO anon
USING (false);

CREATE POLICY "Block anonymous access to followup_runs" 
ON public.followup_runs 
FOR ALL 
TO anon
USING (false);

CREATE POLICY "Block anonymous access to followup_run_items" 
ON public.followup_run_items 
FOR ALL 
TO anon
USING (false);

-- Also ensure the organization_members table is protected
CREATE POLICY "Block anonymous access to organization_members" 
ON public.organization_members 
FOR ALL 
TO anon
USING (false);

-- Add a policy to ensure only authenticated users can access leads within their organization
-- This replaces/supplements the existing policy with more explicit authentication check
CREATE POLICY "Authenticated users can only view leads in their organization" 
ON public.leads 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND organization_id IS NOT NULL 
  AND organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Ensure similar protection for other operations on leads
CREATE POLICY "Authenticated users can only insert leads in their organization" 
ON public.leads 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid()
  AND organization_id IS NOT NULL 
  AND organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can only update leads in their organization" 
ON public.leads 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND organization_id IS NOT NULL 
  AND organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND organization_id IS NOT NULL 
  AND organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can only delete leads in their organization" 
ON public.leads 
FOR DELETE 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND organization_id IS NOT NULL 
  AND organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);