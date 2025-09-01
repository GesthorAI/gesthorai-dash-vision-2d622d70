-- Fase 0: Fundamentos de IA - Tabelas base para governança e observabilidade

-- Configurações de IA por usuário
CREATE TABLE public.ai_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  limits JSONB NOT NULL DEFAULT '{
    "daily_tokens": 50000,
    "weekly_tokens": 300000,
    "max_concurrent_requests": 5
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

-- Políticas para ai_settings
CREATE POLICY "Users can manage their own AI settings" 
ON public.ai_settings 
FOR ALL 
USING (auth.uid() = user_id);

-- Personas de IA para templates de prompts
CREATE TABLE public.ai_personas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  tone TEXT NOT NULL DEFAULT 'professional',
  guidelines TEXT,
  language TEXT NOT NULL DEFAULT 'pt-BR',
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.ai_personas ENABLE ROW LEVEL SECURITY;

-- Políticas para ai_personas
CREATE POLICY "Users can manage their own AI personas" 
ON public.ai_personas 
FOR ALL 
USING (auth.uid() = user_id);

-- Logs de prompts de IA para observabilidade
CREATE TABLE public.ai_prompt_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  scope TEXT NOT NULL, -- 'followup', 'lead_score', 'dedupe', etc
  model TEXT NOT NULL,
  tokens_in INTEGER,
  tokens_out INTEGER,
  cost_estimate DECIMAL(10,6),
  input_hash TEXT,
  input_json JSONB,
  output_json JSONB,
  lead_id UUID,
  search_id UUID,
  run_id UUID,
  persona_id UUID,
  execution_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.ai_prompt_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para ai_prompt_logs
CREATE POLICY "Users can view their own AI prompt logs" 
ON public.ai_prompt_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert AI prompt logs" 
ON public.ai_prompt_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Pontuações de leads com IA
CREATE TABLE public.lead_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL,
  score NUMERIC(5,2) NOT NULL,
  rationale TEXT,
  model TEXT NOT NULL,
  confidence NUMERIC(3,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.lead_scores ENABLE ROW LEVEL SECURITY;

-- Políticas para lead_scores (através da relação com leads)
CREATE POLICY "Users can view scores for their leads" 
ON public.lead_scores 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM leads 
  WHERE leads.id = lead_scores.lead_id 
  AND leads.user_id = auth.uid()
));

CREATE POLICY "System can manage lead scores" 
ON public.lead_scores 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM leads 
  WHERE leads.id = lead_scores.lead_id 
  AND leads.user_id = auth.uid()
));

-- Trigger para updated_at nas novas tabelas
CREATE TRIGGER update_ai_settings_updated_at
  BEFORE UPDATE ON public.ai_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_personas_updated_at
  BEFORE UPDATE ON public.ai_personas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lead_scores_updated_at
  BEFORE UPDATE ON public.lead_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_ai_settings_user_id ON public.ai_settings(user_id);
CREATE INDEX idx_ai_personas_user_id ON public.ai_personas(user_id);
CREATE INDEX idx_ai_personas_active ON public.ai_personas(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_ai_prompt_logs_user_id ON public.ai_prompt_logs(user_id);
CREATE INDEX idx_ai_prompt_logs_scope ON public.ai_prompt_logs(user_id, scope);
CREATE INDEX idx_ai_prompt_logs_created_at ON public.ai_prompt_logs(created_at DESC);
CREATE INDEX idx_lead_scores_lead_id ON public.lead_scores(lead_id);
CREATE INDEX idx_lead_scores_created_at ON public.lead_scores(created_at DESC);

-- Inserir personas padrão para novos usuários (função)
CREATE OR REPLACE FUNCTION public.create_default_ai_personas()
RETURNS TRIGGER AS $$
BEGIN
  -- Persona profissional
  INSERT INTO public.ai_personas (user_id, name, description, tone, guidelines, language)
  VALUES (
    NEW.id,
    'Profissional',
    'Persona padrão para comunicação profissional',
    'professional',
    'Seja direto, respeitoso e focado em resultados. Use linguagem formal mas acessível.',
    'pt-BR'
  );
  
  -- Persona amigável
  INSERT INTO public.ai_personas (user_id, name, description, tone, guidelines, language)
  VALUES (
    NEW.id,
    'Amigável',
    'Persona para comunicação mais próxima e calorosa',
    'friendly',
    'Seja acolhedor, empático e próximo. Use linguagem mais casual mas respeitosa.',
    'pt-BR'
  );
  
  -- Persona técnica
  INSERT INTO public.ai_personas (user_id, name, description, tone, guidelines, language)
  VALUES (
    NEW.id,
    'Técnica',
    'Persona para comunicação detalhada e técnica',
    'technical',
    'Seja preciso, detalhado e técnico. Inclua dados específicos e informações relevantes.',
    'pt-BR'
  );
  
  -- Configurações padrão de IA
  INSERT INTO public.ai_settings (user_id, feature_flags, limits)
  VALUES (
    NEW.id,
    '{
      "followup_ai": true,
      "lead_scoring_ai": true,
      "auto_dedupe": false,
      "semantic_search": false,
      "auto_reply": false
    }'::jsonb,
    '{
      "daily_tokens": 50000,
      "weekly_tokens": 300000,
      "max_concurrent_requests": 5
    }'::jsonb
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para criar personas padrão para novos usuários
CREATE TRIGGER create_default_ai_personas_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_ai_personas();