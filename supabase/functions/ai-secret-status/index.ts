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

    // Check if OpenAI API key exists
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const hasOpenAIKey = !!openAIApiKey;

    console.log(`AI Secret Status check for user ${user.id}: ${hasOpenAIKey ? 'Key exists' : 'Key missing'}`);

    return new Response(JSON.stringify({
      hasOpenAIKey,
      status: hasOpenAIKey ? 'configured' : 'missing',
      message: hasOpenAIKey ? 'Chave API configurada' : 'Chave API não configurada'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in ai-secret-status:', error);
    return new Response(JSON.stringify({ 
      error: errorMessage,
      hasOpenAIKey: false,
      status: 'error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});