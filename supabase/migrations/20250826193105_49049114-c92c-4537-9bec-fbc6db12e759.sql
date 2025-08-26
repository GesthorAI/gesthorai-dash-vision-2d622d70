-- Add user_id columns to both leads and searches tables for proper access control
ALTER TABLE public.leads 
ADD COLUMN user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.searches 
ADD COLUMN user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- For existing data, we'll need to handle the migration
-- Since we just implemented auth, we can set all existing records to the first user
-- This is a temporary measure - in production you'd handle this more carefully

-- Get the first user ID (if any exists)
DO $$
DECLARE
    first_user_id UUID;
BEGIN
    SELECT id INTO first_user_id FROM public.profiles LIMIT 1;
    
    IF first_user_id IS NOT NULL THEN
        -- Update existing leads
        UPDATE public.leads 
        SET user_id = first_user_id 
        WHERE user_id IS NULL;
        
        -- Update existing searches
        UPDATE public.searches 
        SET user_id = first_user_id 
        WHERE user_id IS NULL;
    END IF;
END $$;

-- Make user_id NOT NULL after updating existing data
ALTER TABLE public.leads 
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.searches 
ALTER COLUMN user_id SET NOT NULL;

-- Drop the overly permissive policies
DROP POLICY "Authenticated users can view leads" ON public.leads;
DROP POLICY "Authenticated users can insert leads" ON public.leads;
DROP POLICY "Authenticated users can update leads" ON public.leads;

DROP POLICY "Authenticated users can view searches" ON public.searches;
DROP POLICY "Authenticated users can insert searches" ON public.searches;
DROP POLICY "Authenticated users can update searches" ON public.searches;

-- Create user-specific RLS policies for leads
CREATE POLICY "Users can view their own leads"
ON public.leads
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own leads"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own leads"
ON public.leads
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Create user-specific RLS policies for searches
CREATE POLICY "Users can view their own searches"
ON public.searches
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own searches"
ON public.searches
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own searches"
ON public.searches
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own searches"
ON public.searches
FOR DELETE
TO authenticated
USING (user_id = auth.uid());