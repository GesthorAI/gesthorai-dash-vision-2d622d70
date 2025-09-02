
-- 1) Tabela para configurações por usuário da Evolution API
CREATE TABLE public.evolution_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  evolution_api_url TEXT NOT NULL,
  default_instance_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garantir 1 registro por usuário (upsert fácil)
CREATE UNIQUE INDEX evolution_settings_user_id_key ON public.evolution_settings(user_id);

-- 2) Habilitar RLS
ALTER TABLE public.evolution_settings ENABLE ROW LEVEL SECURITY;

-- 3) Políticas RLS: cada usuário só vê e gerencia seu próprio registro
CREATE POLICY "Users can select their own evolution settings"
  ON public.evolution_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own evolution settings"
  ON public.evolution_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own evolution settings"
  ON public.evolution_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own evolution settings"
  ON public.evolution_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- 4) Trigger para manter updated_at sempre atualizado
CREATE TRIGGER set_timestamp_on_evolution_settings
BEFORE UPDATE ON public.evolution_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
