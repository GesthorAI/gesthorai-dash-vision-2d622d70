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

    const { query, organization_id, limit = 50, similarity_threshold = 0.7 } = await req.json();
    
    if (!query || !organization_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: query, organization_id' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is a member of the organization
    const { data: membership, error: membershipError } = await supabaseClient
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization_id)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return new Response(
        JSON.stringify({ error: 'User is not a member of this organization' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Semantic search query:', query);

    // Generate embedding for search query
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query,
      }),
    });

    if (!embeddingResponse.ok) {
      const error = await embeddingResponse.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${embeddingResponse.status}`);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // Perform vector similarity search using authenticated client
    const { data: leads, error } = await supabaseClient.rpc('search_leads_by_similarity', {
      query_embedding: queryEmbedding,
      similarity_threshold,
      max_results: limit,
      org_id: organization_id
    });

    if (error) {
      // If RPC doesn't exist, fall back to direct SQL
      console.log('RPC not found, using direct query');
      
      const { data: fallbackLeads, error: fallbackError } = await supabaseClient
        .from('leads')
        .select(`
          id, name, business, city, niche, phone, email, status, score,
          created_at, updated_at,
          (embedding <=> '[${queryEmbedding.join(',')}]') as similarity
        `)
        .eq('organization_id', organization_id)
        .not('embedding', 'is', null)
        .order('similarity', { ascending: true })
        .limit(limit);

      if (fallbackError) throw fallbackError;

      return new Response(JSON.stringify({ 
        success: true, 
        leads: fallbackLeads || [],
        query,
        total_results: fallbackLeads?.length || 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Semantic search found ${leads?.length || 0} results`);

    return new Response(JSON.stringify({ 
      success: true, 
      leads: leads || [],
      query,
      total_results: leads?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in semantic-search function:', error);
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});