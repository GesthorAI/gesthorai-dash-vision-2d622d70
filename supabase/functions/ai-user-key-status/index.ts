
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    console.log(`Checking API key status for user ${user.id}`);

    // Buscar chaves do usuário
    const { data: userKeys, error: keysError } = await supabase
      .from('ai_api_keys')
      .select('provider, created_at, updated_at')
      .eq('user_id', user.id);

    if (keysError) {
      console.error('Database error:', keysError);
      throw new Error(`Erro ao consultar chaves: ${keysError.message}`);
    }

    // Verificar se há chave global do sistema (fallback)
    const systemOpenAIKey = Deno.env.get('OPENAI_API_KEY');
    const hasSystemKey = !!systemOpenAIKey;

    const openaiUserKey = userKeys?.find(k => k.provider === 'openai');
    const hasUserOpenAIKey = !!openaiUserKey;

    console.log(`User ${user.id} key status - User key: ${hasUserOpenAIKey}, System key: ${hasSystemKey}`);

    return new Response(JSON.stringify({
      hasUserOpenAIKey,
      hasSystemOpenAIKey: hasSystemKey,
      hasAnyOpenAIKey: hasUserOpenAIKey || hasSystemKey,
      userKeyInfo: openaiUserKey ? {
        created_at: openaiUserKey.created_at,
        updated_at: openaiUserKey.updated_at
      } : null,
      priority: hasUserOpenAIKey ? 'user' : (hasSystemKey ? 'system' : 'none'),
      message: hasUserOpenAIKey 
        ? 'Usando sua chave OpenAI pessoal'
        : hasSystemKey 
          ? 'Usando chave OpenAI do sistema'
          : 'Nenhuma chave OpenAI configurada'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-user-key-status:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      hasUserOpenAIKey: false,
      hasSystemOpenAIKey: false,
      hasAnyOpenAIKey: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
