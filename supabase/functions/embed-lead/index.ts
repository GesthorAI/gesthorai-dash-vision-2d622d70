import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const openaiKey = Deno.env.get('OPENAI_API_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with user's auth
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
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

    // Verify user authentication and get user data
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { lead_id, lead_data } = await req.json();
    
    if (!lead_id) {
      return new Response(
        JSON.stringify({ error: 'lead_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch lead data if not provided using authenticated client
    let leadInfo = lead_data;
    if (!leadInfo) {
      const { data, error } = await supabaseClient
        .from('leads')
        .select('*')
        .eq('id', lead_id)
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Lead not found', details: error.message }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      leadInfo = data;
    }

    // Verify user has access to this lead through organization membership
    const { data: membership, error: membershipError } = await supabaseClient
      .from('organization_members')
      .select('role')
      .eq('organization_id', leadInfo.organization_id)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return new Response(
        JSON.stringify({ error: 'User does not have access to this lead' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create text representation for embedding
    const searchableText = [
      leadInfo.name,
      leadInfo.business,
      leadInfo.city,
      leadInfo.niche,
      leadInfo.phone,
      leadInfo.email
    ].filter(Boolean).join(' ');

    console.log('Generating embedding for:', searchableText);

    // Generate embedding using OpenAI
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: searchableText,
      }),
    });

    if (!embeddingResponse.ok) {
      const error = await embeddingResponse.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${embeddingResponse.status}`);
    }

    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.data[0].embedding;

    // Update the lead with the embedding using authenticated client
    const { error: updateError } = await supabaseClient
      .from('leads')
      .update({ embedding: embedding })
      .eq('id', lead_id);

    if (updateError) throw updateError;

    console.log('Successfully generated embedding for lead:', lead_id);

    return new Response(JSON.stringify({ 
      success: true, 
      lead_id,
      embedding_length: embedding.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in embed-lead function:', error);
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});