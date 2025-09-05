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
    const callbackToken = Deno.env.get('WEBHOOK_SHARED_TOKEN');
    
    console.log('Environment check:', {
      supabaseUrl: supabaseUrl ? 'SET' : 'MISSING',
      supabaseServiceKey: supabaseServiceKey ? 'SET' : 'MISSING',
      n8nWebhookUrl: n8nWebhookUrl ? 'SET' : 'MISSING',
      callbackToken: callbackToken ? 'SET' : 'MISSING'
    });
    
    if (!supabaseUrl || !supabaseServiceKey || !n8nWebhookUrl || !callbackToken) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error - missing environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const payload: StartSearchPayload = await req.json();
    console.log('Start search payload:', JSON.stringify(payload, null, 2));
    
    const { niche, city, search_id } = payload;
    
    // Validate required fields
    if (!niche || !city) {
      console.error('Missing required fields - niche and city are required');
      return new Response(
        JSON.stringify({ error: 'niche and city are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      console.error('Invalid authorization:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('User authenticated:', user.id);
    
    let finalSearchId = search_id;
    
    // If no search_id provided, create a new search record
    if (!search_id) {
      const { data: newSearch, error: searchError } = await supabase
        .from('searches')
        .insert({
          niche,
          city,
          status: 'processando',
          user_id: user.id
        })
        .select()
        .single();
        
      if (searchError) {
        console.error('Error creating search:', searchError);
        return new Response(
          JSON.stringify({ error: 'Failed to create search record', details: searchError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      finalSearchId = newSearch.id;
      console.log('Created new search:', finalSearchId);
    }
    
    // Prepare callback URL using environment variable
    const callbackUrl = `${supabaseUrl}/functions/v1/webhook-leads`;
    
    // Prepare payload for n8n
    const n8nPayload = {
      search_id: finalSearchId,
      niche,
      city,
      callback_url: callbackUrl,
      callback_token: callbackToken
    };
    
    console.log('Sending payload to n8n:', n8nWebhookUrl, JSON.stringify(n8nPayload, null, 2));
    
    // Call n8n webhook
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-token': callbackToken
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
      const { error: updateError } = await supabase
        .from('searches')
        .update({ status: 'falhou' })
        .eq('id', finalSearchId);
        
      if (updateError) {
        console.error('Failed to update search status to failed:', updateError);
      }
        
      return new Response(
        JSON.stringify({ 
          error: 'Failed to queue search job', 
          details: `n8n responded with ${n8nResponse.status}: ${responseText}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Search queued successfully:', finalSearchId);
    
    return new Response(
      JSON.stringify({ 
        search_id: finalSearchId,
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