-- Add missing columns to leads table for webhook data
ALTER TABLE public.leads 
ADD COLUMN collected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN whatsapp_verified BOOLEAN,
ADD COLUMN whatsapp_exists BOOLEAN,
ADD COLUMN whatsapp_jid TEXT,
ADD COLUMN whatsapp_number TEXT;

-- Create index on search_id for better performance
CREATE INDEX IF NOT EXISTS idx_leads_search_id ON public.leads(search_id);

-- Add trigger for updated_at if not exists
DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();