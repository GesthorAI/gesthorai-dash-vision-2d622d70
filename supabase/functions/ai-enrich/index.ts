import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrichRequest {
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
  enrichment_fields?: string[];
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

    const requestBody: EnrichRequest = await req.json();
    const { user_id, organization_id, leads, enrichment_fields = ['niche', 'business_size', 'potential_value'] } = requestBody;

    console.log('AI Enrich request:', { user_id, organization_id, leads_count: leads.length, enrichment_fields });

    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    // Check if lead enrichment is enabled
    const { data: settings } = await supabaseClient
      .from('ai_settings')
      .select('feature_flags, model_preferences')
      .eq('organization_id', organization_id)
      .single();

    if (!settings?.feature_flags?.lead_enrichment) {
      throw new Error('Lead enrichment feature not enabled for this organization');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const model = settings.model_preferences?.default_model || 'gpt-5-mini-2025-08-07';
    const startTime = Date.now();

    // System prompt for AI enrichment
    const systemPrompt = `You are an AI assistant specialized in enriching lead data for CRM systems.

Your mission is to analyze lead information and infer additional valuable data points based on the provided context.

Available enrichment fields:
- niche: Business vertical/industry category
- business_size: Estimated company size (micro, pequena, media, grande)
- potential_value: Estimated potential value (baixo, medio, alto)
- contact_preference: Preferred contact method (whatsapp, email, phone)
- urgency: Lead urgency level (baixa, media, alta)
- ideal_time: Best time to contact (manha, tarde, noite)

For each lead, provide:
1. Enriched data for requested fields
2. Confidence score (0-1) for the enrichment
3. Clear rationale explaining your analysis

Guidelines for enrichment:
- Use Brazilian Portuguese for categorical values
- Be conservative with confidence scores
- Base inferences on business name, location, and existing niche
- Consider regional business patterns in Brazil
- Focus on actionable insights for sales teams

Return valid JSON with this structure:
{
  "enriched_leads": [
    {
      "lead_id": "id",
      "enriched_data": {
        "niche": "value",
        "business_size": "value",
        "potential_value": "value",
        "confidence_score": 0.85
      },
      "rationale": "Explanation of the enrichment logic"
    }
  ]
}`;

    // Process leads in batches
    const batchSize = 20; // Smaller batches for more detailed analysis
    const allEnrichedLeads = [];

    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      
      const userPrompt = `Enrich these leads with the following fields: ${enrichment_fields.join(', ')}

${batch.map(lead => `Lead ID: ${lead.id}
Name: ${lead.name}
Business: ${lead.business}
Phone: ${lead.phone || 'N/A'}
Email: ${lead.email || 'N/A'}
City: ${lead.city || 'N/A'}
Current Niche: ${lead.niche || 'N/A'}
---`).join('\n')}

Provide enrichment for each lead based on the available information and return valid JSON.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
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
      
      let aiResponse;
      try {
        aiResponse = JSON.parse(aiContent);
        if (aiResponse.enriched_leads) {
          allEnrichedLeads.push(...aiResponse.enriched_leads);

          // Update leads in database with enriched data
          for (const enrichedLead of aiResponse.enriched_leads) {
            const updateData: any = {};
            if (enrichedLead.enriched_data.niche) {
              updateData.niche = enrichedLead.enriched_data.niche;
            }
            
            if (Object.keys(updateData).length > 0) {
              await supabaseClient
                .from('leads')
                .update(updateData)
                .eq('id', enrichedLead.lead_id);
            }
          }
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', aiContent);
        // Continue with next batch
      }

      // Log the prompt for analytics
      await supabaseClient
        .from('ai_prompt_logs')
        .insert({
          user_id,
          organization_id,
          feature_type: 'enrichment',
          model,
          scope: 'batch_enrichment',
          tokens_in: data.usage?.prompt_tokens || 0,
          tokens_out: data.usage?.completion_tokens || 0,
          cost_estimate: ((data.usage?.prompt_tokens || 0) * 0.000001) + ((data.usage?.completion_tokens || 0) * 0.000002),
          execution_time_ms: Date.now() - startTime,
          input_json: { batch_size: batch.length, enrichment_fields },
          output_json: { leads_enriched: aiResponse?.enriched_leads?.length || 0 }
        });
    }

    const executionTime = Date.now() - startTime;

    console.log('AI Enrich completed:', {
      enriched_leads: allEnrichedLeads.length,
      execution_time: executionTime
    });

    return new Response(JSON.stringify({
      success: true,
      enriched_leads: allEnrichedLeads,
      total_enriched: allEnrichedLeads.length,
      enrichment_fields,
      execution_time_ms: executionTime
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-enrich function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});