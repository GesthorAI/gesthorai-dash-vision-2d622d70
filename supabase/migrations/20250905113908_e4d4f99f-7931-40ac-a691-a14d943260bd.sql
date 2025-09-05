-- Fix organizations table RLS to block anonymous inserts
-- Drop the permissive policy that allows anonymous inserts
DROP POLICY IF EXISTS "Users can create organizations via RPC" ON public.organizations;

-- Create a new policy that only allows authenticated users to create organizations
CREATE POLICY "Authenticated users can create organizations via RPC"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Ensure no anonymous access to organizations
CREATE POLICY "Block anonymous access to organizations"
ON public.organizations
FOR ALL
TO anon
USING (false);