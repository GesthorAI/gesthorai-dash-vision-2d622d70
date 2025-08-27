-- Add follow-up tracking columns to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS contact_opt_out BOOLEAN DEFAULT FALSE;

-- Create message templates table
CREATE TABLE IF NOT EXISTS public.message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'follow_up',
  subject TEXT,
  message TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for message templates
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for message templates
CREATE POLICY "Users can view their own templates" 
ON public.message_templates 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own templates" 
ON public.message_templates 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates" 
ON public.message_templates 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates" 
ON public.message_templates 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create followup runs table
CREATE TABLE IF NOT EXISTS public.followup_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'preparing',
  filters JSONB NOT NULL DEFAULT '{}',
  template_id UUID,
  total_leads INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for followup runs
ALTER TABLE public.followup_runs ENABLE ROW LEVEL SECURITY;

-- Create policies for followup runs
CREATE POLICY "Users can view their own followup runs" 
ON public.followup_runs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own followup runs" 
ON public.followup_runs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own followup runs" 
ON public.followup_runs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own followup runs" 
ON public.followup_runs 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create followup run items table
CREATE TABLE IF NOT EXISTS public.followup_run_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL,
  lead_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  message TEXT,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for followup run items
ALTER TABLE public.followup_run_items ENABLE ROW LEVEL SECURITY;

-- Create policies for followup run items
CREATE POLICY "Users can view followup items for their runs" 
ON public.followup_run_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.followup_runs 
    WHERE id = run_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create followup items for their runs" 
ON public.followup_run_items 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.followup_runs 
    WHERE id = run_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update followup items for their runs" 
ON public.followup_run_items 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.followup_runs 
    WHERE id = run_id AND user_id = auth.uid()
  )
);

-- Create communications log table
CREATE TABLE IF NOT EXISTS public.communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lead_id UUID NOT NULL,
  type TEXT NOT NULL,
  channel TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for communications
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;

-- Create policies for communications
CREATE POLICY "Users can view their own communications" 
ON public.communications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own communications" 
ON public.communications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create triggers for updating timestamps (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_message_templates_updated_at') THEN
    CREATE TRIGGER update_message_templates_updated_at
    BEFORE UPDATE ON public.message_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_followup_runs_updated_at') THEN
    CREATE TRIGGER update_followup_runs_updated_at
    BEFORE UPDATE ON public.followup_runs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_followup_run_items_updated_at') THEN
    CREATE TRIGGER update_followup_run_items_updated_at
    BEFORE UPDATE ON public.followup_run_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END
$$;