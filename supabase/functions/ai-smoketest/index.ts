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

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log(`AI Smoke test initiated for user ${user.id}`);

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
        error_message: `API test failed: ${response.status} - ${errorText}`,
        input_json: { test: 'connection' },
        output_json: { error: errorText, status: response.status }
      });

      throw new Error(`API test failed: ${response.status}`);
    }

    const data = await response.json();
    const success = response.ok && data.data && Array.isArray(data.data);

    console.log(`AI Smoke test completed for user ${user.id}: ${success ? 'SUCCESS' : 'FAILED'} (${latency}ms)`);

    // Log successful test
    await supabase.from('ai_prompt_logs').insert({
      user_id: user.id,
      scope: 'admin:smoketest',
      model: 'api-test',
      execution_time_ms: latency,
      input_json: { test: 'connection' },
      output_json: { 
        success: true, 
        latency,
        models_count: data.data?.length || 0 
      }
    });

    return new Response(JSON.stringify({
      success: true,
      latency,
      status: 'connected',
      message: `Conexão OK (${latency}ms)`,
      models_available: data.data?.length || 0
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