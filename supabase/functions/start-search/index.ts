import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StartSearchPayload {
  niche: string;
  city: string;
  search_id?: string;
  organization_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Start search received:', req.method);
    
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
    // Try WEBHOOK_SHARED_TOKEN first, then fallback to callbackToken
    let callbackToken = Deno.env.get('WEBHOOK_SHARED_TOKEN') || Deno.env.get('callbackToken');
    let tokenSource = 'MISSING';
    
    if (Deno.env.get('WEBHOOK_SHARED_TOKEN')) {
      tokenSource = 'WEBHOOK_SHARED_TOKEN';
      console.log('Using WEBHOOK_SHARED_TOKEN for authentication');
    } else if (Deno.env.get('callbackToken')) {
      tokenSource = 'callbackToken (fallback)';
      console.log('Using callbackToken as fallback for authentication');
    } else {
      console.log('No webhook token found in either WEBHOOK_SHARED_TOKEN or callbackToken');
    }
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionInstanceName = Deno.env.get('EVOLUTION_INSTANCE_NAME');
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
    
    console.log('Environment check:', {
      supabaseUrl: supabaseUrl ? 'SET' : 'MISSING',
      supabaseServiceKey: supabaseServiceKey ? 'SET' : 'MISSING',
      n8nWebhookUrl: n8nWebhookUrl ? 'SET' : 'MISSING',
      callbackToken: callbackToken ? `SET (${tokenSource})` : 'MISSING',
      evolutionApiUrl: evolutionApiUrl ? 'SET' : 'MISSING',
      evolutionInstanceName: evolutionInstanceName ? 'SET' : 'MISSING',
      evolutionApiKey: evolutionApiKey ? 'SET' : 'MISSING'
    });
    
    // Check for missing critical variables
    const missingVars = [];
    if (!supabaseUrl) missingVars.push('SUPABASE_URL');
    if (!supabaseServiceKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
    if (!n8nWebhookUrl) missingVars.push('N8N_WEBHOOK_URL');
    if (!callbackToken) missingVars.push('WEBHOOK_SHARED_TOKEN');
    
    if (missingVars.length > 0) {
      console.error('Missing required environment variables:', missingVars);
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error - missing environment variables',
          missing: missingVars,
          details: `Missing critical environment variables: ${missingVars.join(', ')}`
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get the authorization header for user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase client with user's auth for membership validation
    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { 
        auth: { 
          autoRefreshToken: false,
          persistSession: false 
        },
        global: { 
          headers: { 
            Authorization: authHeader 
          } 
        }
      }
    );

    // Get user from auth
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const { niche, city, search_id, organization_id } = body as StartSearchPayload;
    
    if (!niche || !city || !organization_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields: niche, city, organization_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify user is a member of the organization
    const { data: membership, error: membershipError } = await supabaseClient
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization_id)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return new Response(JSON.stringify({ error: 'User is not a member of this organization' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize service role client for database operations
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('User authenticated:', user.id);
    
    // If no search_id provided, create a new search record
    let currentSearchId = search_id;
    if (!currentSearchId) {
      const { data: searchData, error: searchError } = await supabaseService
        .from('searches')
        .insert({
          niche,
          city,
          user_id: user.id,
          organization_id,
          status: 'processando'
        })
        .select()
        .single();
        
      if (searchError) {
        return new Response(
          JSON.stringify({ error: 'Failed to create search record' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      currentSearchId = searchData.id;
    }
    
    // Prepare callback URL using environment variable
    const callbackUrl = `${supabaseUrl}/functions/v1/webhook-leads`;
    
    // Prepare payload for n8n
    const n8nPayload = {
      search_id: currentSearchId,
      niche,
      city,
      callback_url: callbackUrl,
      callback_token: callbackToken,
      URL_EvolutionAPI: evolutionApiUrl,
      Nome_Instancia_EvolutionAPI: evolutionInstanceName,
      Api_Key_EvolutionAPI: evolutionApiKey
    };
    
    console.log('Sending payload to n8n:', n8nWebhookUrl, JSON.stringify(n8nPayload, null, 2));
    
    // Call n8n webhook with multiple authentication methods
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-token': callbackToken,
        'Authorization': `Bearer ${callbackToken}`
      },
      body: JSON.stringify(n8nPayload)
    });
    
    const responseText = await n8nResponse.text();
    console.log('n8n response:', n8nResponse.status, responseText);
    
    if (!n8nResponse.ok) {
      console.error('n8n webhook failed:', {
        status: n8nResponse.status,
        statusText: n8nResponse.statusText,
        body: responseText
      });
      
      // Update search status to failed
      const { error: updateError } = await supabaseService
        .from('searches')
        .update({ status: 'falhou' })
        .eq('id', currentSearchId);
        
      if (updateError) {
        console.error('Failed to update search status to failed:', updateError);
      }
        
      return new Response(
        JSON.stringify({ 
          error: 'Failed to queue search job', 
          details: `n8n responded with ${n8nResponse.status}: ${responseText}`,
          n8nUrl: n8nWebhookUrl,
          searchId: currentSearchId,
          troubleshooting: 'Check n8n webhook configuration and authentication'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Search queued successfully:', currentSearchId);
    
    return new Response(
      JSON.stringify({ 
        search_id: currentSearchId,
        status: 'queued',
        message: 'Search job queued successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('Start search error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});