import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PrepareRequest {
  runId: string;
  filters: {
    niche?: string;
    city?: string;
    status?: string;
    minScore?: number;
    maxDaysOld?: number;
    excludeContacted?: boolean;
  };
  templateId: string;
  generateWithAI?: boolean;
}

interface Lead {
  id: string;
  name: string;
  business: string;
  city: string;
  phone: string;
  niche: string;
  status: string;
  score: number;
  created_at: string;
  last_contacted_at?: string;
}

interface MessageTemplate {
  id: string;
  message: string;
  variables: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user ID from JWT
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: PrepareRequest = await req.json();
    console.log('Preparing followup run:', body.runId);

    // Build lead query with filters
    let query = supabaseClient
      .from('leads')
      .select('*')
      .eq('user_id', user.id)
      .neq('status', 'descartado');

    if (body.filters.niche) {
      query = query.ilike('niche', `%${body.filters.niche}%`);
    }
    if (body.filters.city) {
      query = query.ilike('city', `%${body.filters.city}%`);
    }
    if (body.filters.status) {
      query = query.eq('status', body.filters.status);
    }
    if (body.filters.minScore) {
      query = query.gte('score', body.filters.minScore);
    }
    if (body.filters.maxDaysOld) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - body.filters.maxDaysOld);
      query = query.gte('created_at', cutoffDate.toISOString());
    }
    if (body.filters.excludeContacted) {
      query = query.is('last_contacted_at', null);
    }

    const { data: leads, error: leadsError } = await query;
    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch leads' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${leads?.length || 0} leads matching filters`);

    // Get message template
    const { data: template, error: templateError } = await supabaseClient
      .from('message_templates')
      .select('*')
      .eq('id', body.templateId)
      .eq('user_id', user.id)
      .single();

    if (templateError) {
      console.error('Error fetching template:', templateError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch template' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate messages for each lead
    const runItems = [];
    for (const lead of leads || []) {
      let message = template.message;

      if (body.generateWithAI && Deno.env.get('OPENAI_API_KEY')) {
        try {
          // Generate personalized message with OpenAI
          const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-5-mini-2025-08-07',
              messages: [
                {
                  role: 'system',
                  content: `Você é um especialista em gerar mensagens de follow-up personalizadas para WhatsApp. 
                  Baseie-se no template fornecido mas personalize com informações específicas do lead.
                  Seja natural, cordial e profissional. Mantenha a mensagem curta (máximo 2 parágrafos).`
                },
                {
                  role: 'user',
                  content: `Template: ${template.message}
                  
                  Informações do lead:
                  - Nome: ${lead.name}
                  - Negócio: ${lead.business}
                  - Cidade: ${lead.city}
                  - Nicho: ${lead.niche}
                  - Score: ${lead.score}
                  
                  Gere uma mensagem personalizada mantendo o tom e objetivo do template:`
                }
              ],
              max_completion_tokens: 200
            }),
          });

          if (openAIResponse.ok) {
            const aiData = await openAIResponse.json();
            message = aiData.choices[0].message.content;
            console.log(`Generated AI message for lead ${lead.id}`);
          } else {
            console.error('OpenAI API error, using template message');
          }
        } catch (error) {
          console.error('Error generating AI message:', error);
          // Fall back to template with variable replacement
        }
      }

      // Replace template variables if not using AI
      if (!body.generateWithAI || !Deno.env.get('OPENAI_API_KEY')) {
        message = message
          .replace(/\{\{name\}\}/g, lead.name)
          .replace(/\{\{business\}\}/g, lead.business)
          .replace(/\{\{city\}\}/g, lead.city)
          .replace(/\{\{niche\}\}/g, lead.niche);
      }

      runItems.push({
        run_id: body.runId,
        lead_id: lead.id,
        message: message,
        status: 'pending'
      });
    }

    // Insert run items
    if (runItems.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('followup_run_items')
        .insert(runItems);

      if (insertError) {
        console.error('Error inserting run items:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to create run items' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update run status and counts
    const { error: updateError } = await supabaseClient
      .from('followup_runs')
      .update({
        status: 'prepared',
        total_leads: runItems.length,
        started_at: new Date().toISOString()
      })
      .eq('id', body.runId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating run:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update run' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully prepared ${runItems.length} messages for run ${body.runId}`);

    return new Response(
      JSON.stringify({
        success: true,
        totalLeads: runItems.length,
        runItems: runItems.slice(0, 5) // Return first 5 for preview
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in followup-prepare function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});