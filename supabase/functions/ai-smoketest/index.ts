
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para descriptografar a chave API
async function decryptApiKey(cipher: string, iv: string, encryptionKey: string): Promise<string> {
  const keyBytes = new TextEncoder().encode(encryptionKey.slice(0, 32));
  const cipherBytes = new Uint8Array(atob(cipher).split('').map(c => c.charCodeAt(0)));
  const ivBytes = new Uint8Array(atob(iv).split('').map(c => c.charCodeAt(0)));
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    cryptoKey,
    cipherBytes
  );
  
  return new TextDecoder().decode(decrypted);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user authentication
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

    let openAIApiKey: string | null = null;
    let keySource = 'none';

    // 1. Primeiro, tentar buscar chave do usuário
    try {
      const { data: userKey, error: keyError } = await supabase
        .from('ai_api_keys')
        .select('key_cipher, iv')
        .eq('user_id', user.id)
        .eq('provider', 'openai')
        .single();

      if (!keyError && userKey) {
        const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY');
        if (encryptionKey) {
          openAIApiKey = await decryptApiKey(userKey.key_cipher, userKey.iv, encryptionKey);
          keySource = 'user';
          console.log(`Using user's personal OpenAI key for user ${user.id}`);
        }
      }
    } catch (error) {
      console.log('No user key found, falling back to system key');
    }

    // 2. Se não houver chave do usuário, usar chave do sistema
    if (!openAIApiKey) {
      openAIApiKey = Deno.env.get('OPENAI_API_KEY');
      if (openAIApiKey) {
        keySource = 'system';
        console.log(`Using system OpenAI key for user ${user.id}`);
      }
    }

    if (!openAIApiKey) {
      throw new Error('Nenhuma chave OpenAI configurada');
    }

    console.log(`AI Smoke test initiated for user ${user.id} using ${keySource} key`);

    const startTime = Date.now();

    // Test OpenAI API with a minimal request
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const endTime = Date.now();
    const latency = endTime - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error (${response.status}):`, errorText);
      
      // Log the test result
      await supabase.from('ai_prompt_logs').insert({
        user_id: user.id,
        scope: 'admin:smoketest',
        model: 'api-test',
        execution_time_ms: latency,
        error_message: `API test failed (${keySource} key): ${response.status} - ${errorText}`,
        input_json: { test: 'connection', keySource },
        output_json: { error: errorText, status: response.status, keySource }
      });

      throw new Error(`Teste de API falhou: ${response.status}`);
    }

    const data = await response.json();
    const success = response.ok && data.data && Array.isArray(data.data);

    console.log(`AI Smoke test completed for user ${user.id}: ${success ? 'SUCCESS' : 'FAILED'} (${latency}ms) using ${keySource} key`);

    // Log successful test
    await supabase.from('ai_prompt_logs').insert({
      user_id: user.id,
      scope: 'admin:smoketest',
      model: 'api-test',
      execution_time_ms: latency,
      input_json: { test: 'connection', keySource },
      output_json: { 
        success: true, 
        latency,
        models_count: data.data?.length || 0,
        keySource
      }
    });

    return new Response(JSON.stringify({
      success: true,
      latency,
      status: 'connected',
      message: `Conexão OK (${latency}ms) - ${keySource === 'user' ? 'chave pessoal' : 'chave do sistema'}`,
      models_available: data.data?.length || 0,
      keySource
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-smoketest:', error);
    
    // Try to log error if we have user context
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
        
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } },
        });

        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          await supabase.from('ai_prompt_logs').insert({
            user_id: user.id,
            scope: 'admin:smoketest',
            model: 'api-test',
            error_message: error.message,
            input_json: { test: 'connection' },
            output_json: { error: error.message }
          });
        }
      }
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      status: 'error',
      message: `Erro: ${error.message}`
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
