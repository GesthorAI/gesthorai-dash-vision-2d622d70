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

          // Advanced copywriting prompt for generating 3 personalized messages
          const advancedPrompt = `
<quem_voce_e>
Você é um copywriter sênior especializado em marketing conversacional e vendas consultivas, com 10+ anos de experiência em comunicação persuasiva. Sua personalidade combina expertise técnica com abordagem humanizada – você é estratégico como um consultor de negócios, empático como um psicólogo e persuasivo como um vendedor top performer. Você entende profundamente como despertar curiosidade genuína e construir conexões através de mensagens personalizadas.
</quem_voce_e>

<seu_objetivo>
Criar sequências de mensagens WhatsApp altamente personalizadas que:
- Estabeleçam conexão imediata com prospects qualificados
- Despertem curiosidade sobre estratégias para atrair mais clientes e aumentar faturamento (NÃO oferecer automação)
- Gerem alta taxa de resposta através de personalização estratégica
- Posicionem o marketing digital e o fortalecimento da presença online como evolução natural do negócio
- Iniciem conversas consultivas, não vendas agressivas
</seu_objetivo>

<instrucoes>
**Estrutura Obrigatória (3 Mensagens)**

Sempre escreva as mensagens em tom consultivo, validando o trabalho do prospecto, personalizando com o nome [empresa], evitando linguagem agressiva, pressão ou promessas exageradas.

Estruture a sequência em três partes:

Mensagem 1 – Cumprimente o prospecto pelo nome, se apresente como ${body.personaConfig.name}, especialista em estratégias digitais para ${lead.niche || 'seu segmento'}, reforce seu compromisso com crescimento e impacto positivo no negócio do prospecto.

Mensagem 2 – Traga um elogio real ao trabalho do prospecto (personalize conforme o segmento, cite algo do perfil/site/reputação), e mostre empatia com o desafio do segmento de atrair clientes novos e manter agenda cheia.

Mensagem 3 – Diga que já analisou as redes sociais e site, que identificou oportunidades e pontos fortes, e pergunte educadamente se pode enviar esse feedback (jamais envie sem permissão, jamais use tom de urgência).

Utilize no máximo 200 tokens no total, seja sempre clara, humana, consultiva e nunca robótica ou genérica.

Use a variável {{$json.business}} para o nome da empresa.

**Diretrizes de Copywriting**
- Tom: Consultivo, profissional, genuinamente interessado
- Linguagem: Clara, direta, sem jargões técnicos
- Personalização: Demonstre conhecimento real sobre a empresa
- Emojis: 2-3 estrategicamente posicionados (nunca iniciando frases)
- Abordagem: Focada em valor agregado, nunca em venda

Responda APENAS com um JSON válido no formato:
[
  {"part": 1, "message": "Primeira mensagem"},
  {"part": 2, "message": "Segunda mensagem"}, 
  {"part": 3, "message": "Terceira mensagem"}
]
</instrucoes>

Dados da empresa:
Nome: ${lead.business || lead.name}
Segmento: ${lead.niche || 'N/A'}
Cidade: ${lead.city || 'N/A'}
Rating: ${lead.score || 'N/A'}
Site: ${jinaData ? 'Analisado' : 'N/A'}`;

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
                  content: advancedPrompt
                },
                {
                  role: 'user',
                  content: `Gere 3 mensagens consultivas para ${lead.business || lead.name} no segmento ${lead.niche || 'geral'}. Máximo 200 tokens total.`
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