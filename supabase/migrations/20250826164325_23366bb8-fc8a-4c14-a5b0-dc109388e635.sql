-- Phase 1: Data Modeling and Performance Improvements (Fixed)

-- Add search_id to leads table for proper relationship
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS search_id UUID REFERENCES public.searches(id);

-- Add indexes for better performance (with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_leads_search_id ON public.leads(search_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_score ON public.leads(score DESC);
CREATE INDEX IF NOT EXISTS idx_searches_status ON public.searches(status);
CREATE INDEX IF NOT EXISTS idx_searches_created_at ON public.searches(created_at DESC);

-- Enable updated_at trigger for searches table
DROP TRIGGER IF EXISTS update_searches_updated_at ON public.searches;
CREATE TRIGGER update_searches_updated_at
    BEFORE UPDATE ON public.searches
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for leads table
DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Realtime for both tables
ALTER TABLE public.leads REPLICA IDENTITY FULL;
ALTER TABLE public.searches REPLICA IDENTITY FULL;