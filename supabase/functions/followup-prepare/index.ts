import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PersonaConfig {
  name: string;
  systemPrompt: string;
  useJinaAI: boolean;
  messageDelay: number;
}

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
  personaConfig?: PersonaConfig;
  selectedAIVariation?: string;
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
  website?: string;
  whatsapp_number?: string;
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

    // Get the run and its organization_id
    const { data: runData, error: runError } = await supabaseClient
      .from('followup_runs')
      .select('organization_id')
      .eq('id', body.runId)
      .single();

    if (runError || !runData) {
      console.error('Run not found:', body.runId);
      return new Response(
        JSON.stringify({ error: 'Run not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const organizationId = runData.organization_id;

    // Validate user belongs to this organization
    const { data: membershipData } = await supabaseClient
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single();

    if (!membershipData) {
      console.error('User not authorized for organization:', organizationId);
      return new Response(
        JSON.stringify({ error: 'User not authorized for this organization' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build lead query with filters based on organization_id
    let query = supabaseClient
      .from('leads')
      .select('*')
      .eq('organization_id', organizationId)
      .neq('status', 'descartado');

    // Apply case-insensitive filtering for niche and city
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
      .eq('organization_id', organizationId)
      .single();

    if (templateError) {
      console.error('Error fetching template:', templateError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch template' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Robust variable interpolation function
    const interpolateMessage = (message: string, lead: Lead): string => {
      let interpolated = message;
      
      // Define lead field mapping
      const fieldMap: Record<string, string> = {
        'name': lead.name || '',
        'nome': lead.name || '',
        'nome_prospecto': lead.name || '',
        'business': lead.business || '',
        'empresa': lead.business || '',
        'city': lead.city || '',
        'cidade': lead.city || '',
        'niche': lead.niche || '',
        'nicho': lead.niche || '',
        'phone': lead.phone || lead.whatsapp_number || '',
        'telefone': lead.phone || lead.whatsapp_number || '',
        'whatsapp': lead.whatsapp_number || lead.phone || '',
        'email': (lead as any).email || '',
        'score': String(lead.score || 0),
        'rating': String(lead.score || 0),
        'website': lead.website || ''
      };
      
      // Replace variables - case insensitive, with or without spaces
      Object.entries(fieldMap).forEach(([key, value]) => {
        // Match {{key}}, {{ key }}, {{KEY}}, etc.
        const patterns = [
          new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi'),
          new RegExp(`\\{\\{\\s*\\$json\\.${key}\\s*\\}\\}`, 'gi')
        ];
        
        patterns.forEach(pattern => {
          interpolated = interpolated.replace(pattern, value);
        });
      });
      
      // Remove any remaining placeholders
      interpolated = interpolated.replace(/\{\{[^}]*\}\}/g, '');
      
      return interpolated.trim();
    };

    // Generate messages for each lead
    const runItems = [];
    for (const lead of leads || []) {
      let messages = [];

      if (body.generateWithAI && body.selectedAIVariation) {
        // Use the selected AI variation directly
        const interpolatedMessage = interpolateMessage(body.selectedAIVariation, lead);
        messages = [interpolatedMessage];
        console.log(`Using selected AI variation for lead ${lead.id}`);
      } else if (body.generateWithAI && body.personaConfig && Deno.env.get('OPENAI_API_KEY')) {
        try {
          // Get Jina AI scraping data if enabled
          let jinaData = '';
          if (body.personaConfig.useJinaAI && lead.website) {
            try {
              console.log(`Scraping website: ${lead.website}`);
              const jinaResponse = await fetch(`https://r.jina.ai/${lead.website}`, {
                headers: {
                  'Accept': 'application/json',
                  'User-Agent': 'Mozilla/5.0 (compatible; GesthorAI/1.0)'
                }
              });
              if (jinaResponse.ok) {
                jinaData = await jinaResponse.text();
                console.log(`Jina AI scraping successful for ${lead.website}`);
              }
            } catch (jinaError) {
              console.log(`Jina AI scraping failed for ${lead.website}:`, jinaError);
            }
          }

          // Generate 3 consultative messages with dynamic persona
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
                  content: body.personaConfig.systemPrompt
                },
                {
                  role: 'user',
                  content: `Nome da empresa: ${lead.business || lead.name}
Scraper do site da empresa: ${jinaData || 'Site não disponível ou análise desabilitada'}
Rating no Google: ${lead.score || 'N/A'}
Reviews no Google: N/A
Especialidades: ${lead.niche}

Prompt User: Use as variáveis {{$json.nome_prospecto}} para o nome "${lead.name}" na primeira mensagem.

Responda APENAS com um JSON válido no formato:
[
  {"part": 1, "message": "Primeira mensagem"},
  {"part": 2, "message": "Segunda mensagem"}, 
  {"part": 3, "message": "Terceira mensagem"}
]

Substitua ${body.personaConfig.name} por seu nome na primeira mensagem. Limite total: 200 tokens para as 3 mensagens.`
                }
              ],
              max_completion_tokens: 300
            }),
          });

          if (openAIResponse.ok) {
            const aiData = await openAIResponse.json();
            const content = aiData.choices[0].message.content;
            
            try {
              // Parse JSON response
              const parsedMessages = JSON.parse(content);
              if (Array.isArray(parsedMessages) && parsedMessages.length === 3) {
                messages = parsedMessages.map(msg => interpolateMessage(msg.message, lead));
                console.log(`Generated 3 AI messages for lead ${lead.id}`);
              } else {
                throw new Error('Invalid message format');
              }
            } catch (parseError) {
              console.error('Error parsing AI response JSON:', parseError);
              console.log('Raw AI response:', content);
              // Fallback to template with interpolation
              messages = [interpolateMessage(template.message, lead)];
            }
          } else {
            console.error('OpenAI API error, using template message');
            messages = [interpolateMessage(template.message, lead)];
          }
        } catch (error) {
          console.error('Error generating AI messages:', error);
          messages = [interpolateMessage(template.message, lead)];
        }
      } else {
        // Use template with robust interpolation
        messages = [interpolateMessage(template.message, lead)];
      }

      // Create run items for each message
      messages.forEach((message, index) => {
        runItems.push({
          run_id: body.runId,
          lead_id: lead.id,
          message: message,
          status: 'pending',
          message_sequence: index + 1,
          total_messages: messages.length
        });
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

    // Update run status and counts - calculate unique leads
    const uniqueLeadIds = new Set(runItems.map(item => item.lead_id));
    const totalUniqueLeads = uniqueLeadIds.size;
    
    const { error: updateError } = await supabaseClient
      .from('followup_runs')
      .update({
        status: 'prepared',
        total_leads: totalUniqueLeads,
        started_at: new Date().toISOString()
      })
      .eq('id', body.runId)
      .eq('organization_id', organizationId);

    if (updateError) {
      console.error('Error updating run:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update run' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully prepared ${runItems.length} messages for ${totalUniqueLeads} unique leads in run ${body.runId}`);

    return new Response(
      JSON.stringify({
        success: true,
        totalLeads: totalUniqueLeads,
        totalMessages: runItems.length,
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