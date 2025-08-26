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
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Start search received:', req.method);
    
    // Initialize Supabase client
    const supabaseUrl = 'https://xpgazdzcbtjqivbsunvh.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwZ2F6ZHpjYnRqcWl2YnN1bnZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjYxODksImV4cCI6MjA3MTcwMjE4OX0.59lJ1yOZr4D0tcSgxSAtGQiYb2FT3q_LUooNOaCG67o';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const payload: StartSearchPayload = await req.json();
    console.log('Start search payload:', JSON.stringify(payload, null, 2));
    
    const { niche, city, search_id } = payload;
    
    // Validate required fields
    if (!niche || !city) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'niche and city are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    let finalSearchId = search_id;
    
    // If no search_id provided, create a new search record
    if (!search_id) {
      const { data: newSearch, error: searchError } = await supabase
        .from('searches')
        .insert({
          niche,
          city,
          status: 'processando'
        })
        .select()
        .single();
        
      if (searchError) {
        console.error('Error creating search:', searchError);
        return new Response(
          JSON.stringify({ error: 'Failed to create search record' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      finalSearchId = newSearch.id;
      console.log('Created new search:', finalSearchId);
    }
    
    // Get environment variables
    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
    const callbackToken = Deno.env.get('WEBHOOK_SHARED_TOKEN');
    
    if (!n8nWebhookUrl || !callbackToken) {
      console.error('Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Prepare callback URL  
    const callbackUrl = `https://xpgazdzcbtjqivbsunvh.supabase.co/functions/v1/webhook-leads`;
    
    // Prepare payload for n8n
    const n8nPayload = {
      search_id: finalSearchId,
      niche,
      city,
      callback_url: callbackUrl,
      callback_token: callbackToken
    };
    
    console.log('Sending to n8n:', n8nWebhookUrl);
    
    // Call n8n webhook
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(n8nPayload)
    });
    
    if (!n8nResponse.ok) {
      console.error('n8n webhook failed:', n8nResponse.status, n8nResponse.statusText);
      
      // Update search status to failed
      await supabase
        .from('searches')
        .update({ status: 'failed' })
        .eq('id', finalSearchId);
        
      return new Response(
        JSON.stringify({ error: 'Failed to queue search job' }),
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