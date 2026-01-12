import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DedupeRequest {
  user_id: string;
  organization_id: string;
  leads: Array<{
    id: string;
    name: string;
    business: string;
    phone?: string;
    email?: string;
    city?: string;
    niche?: string;
  }>;
  similarity_threshold?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const requestBody: DedupeRequest = await req.json();
    const { user_id, organization_id, leads, similarity_threshold = 0.85 } = requestBody;

    console.log('AI Dedupe request:', { user_id, organization_id, leads_count: leads.length, similarity_threshold });

    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    // Check if auto-dedupe feature is enabled
    const { data: settings } = await supabaseClient
      .from('ai_settings')
      .select('feature_flags')
      .eq('organization_id', organization_id)
      .single();

    if (!settings?.feature_flags?.auto_dedupe) {
      throw new Error('Auto-dedupe feature not enabled for this organization');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const startTime = Date.now();

    // System prompt for AI deduplication
    const systemPrompt = `You are an AI assistant specialized in identifying duplicate leads in a CRM system.

Your mission is to analyze leads and identify potential duplicates based on the following criteria:
- Similar names (considering variations, abbreviations, and typos)
- Same business/company name
- Same phone number (considering formatting differences)
- Same email address
- Same city and niche combination

For each group of duplicates found, you must:
1. Choose the most complete lead as the "master"
2. List all duplicate lead IDs
3. Calculate a similarity score (0-1)
4. Specify which criteria matched
5. Provide a clear rationale

Return your response as valid JSON with this structure:
{
  "duplicate_groups": [
    {
      "master_id": "lead_id",
      "duplicates": ["lead_id1", "lead_id2"],
      "similarity_score": 0.95,
      "match_criteria": ["name", "business", "phone"],
      "rationale": "Explanation of why these are duplicates"
    }
  ]
}

Be conservative - only mark leads as duplicates if you're confident they represent the same entity.`;

    // Process leads in batches to avoid token limits
    const batchSize = 50;
    const allDuplicateGroups = [];

    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      
      const userPrompt = `Analyze these leads for duplicates with similarity threshold ${similarity_threshold}:

${batch.map(lead => `ID: ${lead.id}
Name: ${lead.name}
Business: ${lead.business}
Phone: ${lead.phone || 'N/A'}
Email: ${lead.email || 'N/A'}
City: ${lead.city || 'N/A'}
Niche: ${lead.niche || 'N/A'}
---`).join('\n')}

Find duplicate groups based on the criteria and return valid JSON.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5-mini-2025-08-07',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_completion_tokens: 4000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('OpenAI API error:', errorData);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const aiContent = data.choices[0].message.content;
      
      let parsedDuplicateGroupsCount = 0;
      try {
        const aiResponse = JSON.parse(aiContent);
        if (aiResponse.duplicate_groups) {
          allDuplicateGroups.push(...aiResponse.duplicate_groups);
          parsedDuplicateGroupsCount = aiResponse.duplicate_groups.length;
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', aiContent);
        // Continue with next batch even if one fails
      }

      // Log the prompt for analytics
      await supabaseClient
        .from('ai_prompt_logs')
        .insert({
          user_id,
          organization_id,
          feature_type: 'dedupe',
          model: 'gpt-5-mini-2025-08-07',
          scope: 'batch_dedupe',
          tokens_in: data.usage?.prompt_tokens || 0,
          tokens_out: data.usage?.completion_tokens || 0,
          cost_estimate: ((data.usage?.prompt_tokens || 0) * 0.000001) + ((data.usage?.completion_tokens || 0) * 0.000002),
          execution_time_ms: Date.now() - startTime,
          input_json: { batch_size: batch.length, similarity_threshold },
          output_json: { duplicate_groups_found: parsedDuplicateGroupsCount }
        });
    }

    const executionTime = Date.now() - startTime;

    console.log('AI Dedupe completed:', {
      duplicate_groups: allDuplicateGroups.length,
      execution_time: executionTime
    });

    return new Response(JSON.stringify({
      success: true,
      duplicate_groups: allDuplicateGroups,
      total_duplicates_found: allDuplicateGroups.reduce((sum, group) => sum + group.duplicates.length, 0),
      total_groups: allDuplicateGroups.length,
      similarity_threshold,
      execution_time_ms: executionTime
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in ai-dedupe function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});