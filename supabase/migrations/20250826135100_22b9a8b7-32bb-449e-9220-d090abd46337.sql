-- Create leads table for storing lead data
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  business TEXT NOT NULL,
  city TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  status TEXT DEFAULT 'novo',
  score INTEGER DEFAULT 0,
  source TEXT,
  niche TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create searches table for storing search history
CREATE TABLE public.searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  niche TEXT NOT NULL,
  city TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processando',
  total_leads INTEGER DEFAULT 0,
  webhook_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.searches ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a dashboard app)
CREATE POLICY "Allow public access to leads" 
ON public.leads 
FOR ALL 
USING (true);

CREATE POLICY "Allow public access to searches" 
ON public.searches 
FOR ALL 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_searches_updated_at
  BEFORE UPDATE ON public.searches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_leads_niche ON public.leads(niche);
CREATE INDEX idx_leads_city ON public.leads(city);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_created_at ON public.leads(created_at);
CREATE INDEX idx_searches_status ON public.searches(status);
CREATE INDEX idx_searches_created_at ON public.searches(created_at);