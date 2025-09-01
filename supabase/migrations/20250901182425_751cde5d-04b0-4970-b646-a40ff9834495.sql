
-- 1) Tabela para armazenar chaves de provedores de IA por usuário (cifradas)
CREATE TABLE IF NOT EXISTS public.ai_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('openai')),
  key_cipher TEXT NOT NULL,  -- texto cifrado (base64)
  iv TEXT NOT NULL,          -- vetor de inicialização (base64)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ai_api_keys_user_provider_uniq UNIQUE (user_id, provider)
);

-- 2) Habilitar RLS
ALTER TABLE public.ai_api_keys ENABLE ROW LEVEL SECURITY;

-- 3) Políticas de acesso: cada usuário só enxerga e gerencia a própria chave
DROP POLICY IF EXISTS "ai_api_keys_select_own" ON public.ai_api_keys;
CREATE POLICY "ai_api_keys_select_own"
  ON public.ai_api_keys
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_api_keys_insert_own" ON public.ai_api_keys;
CREATE POLICY "ai_api_keys_insert_own"
  ON public.ai_api_keys
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_api_keys_update_own" ON public.ai_api_keys;
CREATE POLICY "ai_api_keys_update_own"
  ON public.ai_api_keys
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_api_keys_delete_own" ON public.ai_api_keys;
CREATE POLICY "ai_api_keys_delete_own"
  ON public.ai_api_keys
  FOR DELETE
  USING (auth.uid() = user_id);

-- 4) Trigger para updated_at automático (usa a função já existente no projeto)
DROP TRIGGER IF EXISTS trg_ai_api_keys_updated_at ON public.ai_api_keys;
CREATE TRIGGER trg_ai_api_keys_updated_at
  BEFORE UPDATE ON public.ai_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
