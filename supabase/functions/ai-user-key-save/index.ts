
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para criptografar a chave API
async function encryptApiKey(apiKey: string, encryptionKey: string): Promise<{cipher: string, iv: string}> {
  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(encryptionKey.slice(0, 32)); // Garantir 32 bytes
  const apiKeyBytes = encoder.encode(apiKey);
  
  // Gerar IV aleatório
  const iv = crypto.getRandomValues(new Uint8Array(16));
  
  // Importar chave para AES-GCM
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  // Criptografar
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    apiKeyBytes
  );
  
  // Converter para base64
  const cipher = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  const ivB64 = btoa(String.fromCharCode(...iv));
  
  return { cipher, iv: ivB64 };
}

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

    const { apiKey, provider = 'openai' } = await req.json();
    
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('API key is required');
    }

    // Validar formato da chave OpenAI
    if (provider === 'openai' && !apiKey.startsWith('sk-')) {
      throw new Error('Chave OpenAI inválida. Deve começar com "sk-"');
    }

    const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    console.log(`Saving API key for user ${user.id}, provider: ${provider}`);

    // Criptografar a chave
    const { cipher, iv } = await encryptApiKey(apiKey, encryptionKey);

    // Salvar ou atualizar no banco
    const { data, error } = await supabase
      .from('ai_api_keys')
      .upsert({
        user_id: user.id,
        provider,
        key_cipher: cipher,
        iv,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,provider'
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw new Error(`Erro ao salvar chave: ${error.message}`);
    }

    console.log(`API key saved successfully for user ${user.id}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Chave API salva com sucesso',
      provider,
      created_at: data.created_at,
      updated_at: data.updated_at
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-user-key-save:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
