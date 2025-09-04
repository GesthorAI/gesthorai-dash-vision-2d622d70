import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openaiKey = Deno.env.get('OPENAI_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lead_id, lead_data } = await req.json();

    if (!lead_id) {
      throw new Error('lead_id is required');
    }

    // Get lead data if not provided
    let leadInfo = lead_data;
    if (!leadInfo) {
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('name, business, city, niche, phone, email')
        .eq('id', lead_id)
        .single();

      if (leadError) throw leadError;
      leadInfo = lead;
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

    // Update lead with embedding
    const { error: updateError } = await supabase
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

  } catch (error) {
    console.error('Error in embed-lead function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});