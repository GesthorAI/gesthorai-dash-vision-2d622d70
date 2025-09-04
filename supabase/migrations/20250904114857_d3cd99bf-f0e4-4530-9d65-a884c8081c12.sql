-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to leads table for semantic search
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS leads_embedding_idx ON public.leads 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Add updated_at trigger to leads table if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_leads_updated_at'
    ) THEN
        CREATE TRIGGER update_leads_updated_at
            BEFORE UPDATE ON public.leads
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- Add communications table for auto-reply functionality
CREATE TABLE IF NOT EXISTS public.communications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    organization_id UUID,
    type TEXT NOT NULL CHECK (type IN ('inbound', 'outbound', 'auto_reply')),
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'sms')),
    message TEXT,
    metadata JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on communications
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;

-- RLS policies for communications
CREATE POLICY "Organization members can view communications" 
ON public.communications FOR SELECT 
USING (organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid()
));

CREATE POLICY "Organization members can create communications" 
ON public.communications FOR INSERT 
WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid()
));

CREATE POLICY "Organization members can update communications" 
ON public.communications FOR UPDATE 
USING (organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid()
));

-- Add trigger for communications updated_at
CREATE TRIGGER update_communications_updated_at
    BEFORE UPDATE ON public.communications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create auto reply settings table
CREATE TABLE IF NOT EXISTS public.auto_reply_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    organization_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT false,
    business_hours_start TIME DEFAULT '09:00:00',
    business_hours_end TIME DEFAULT '18:00:00',
    business_days INTEGER[] DEFAULT '{1,2,3,4,5}', -- Mon-Fri
    auto_reply_delay_minutes INTEGER DEFAULT 5,
    max_replies_per_lead INTEGER DEFAULT 3,
    persona_id UUID,
    custom_prompt TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on auto_reply_settings
ALTER TABLE public.auto_reply_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for auto_reply_settings
CREATE POLICY "Organization members can manage auto reply settings" 
ON public.auto_reply_settings FOR ALL 
USING (organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid()
));

-- Add trigger for auto_reply_settings updated_at
CREATE TRIGGER update_auto_reply_settings_updated_at
    BEFORE UPDATE ON public.auto_reply_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();