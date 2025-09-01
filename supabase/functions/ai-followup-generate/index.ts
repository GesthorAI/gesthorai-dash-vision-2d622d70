import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AIFollowupRequest {
  user_id: string;
  lead: {
    name: string;
    business: string;
    niche?: string;
    city?: string;
    phone?: string;
    email?: string;
  };
  persona_id?: string;
  template_id?: string;
  custom_instructions?: string;
  variations_count?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const request: AIFollowupRequest = await req.json();
    console.log('AI Followup request:', request);

    // Validate request
    if (!request.user_id || !request.lead) {
      throw new Error('Missing required fields: user_id, lead');
    }

    // Get persona
    let persona = null;
    if (request.persona_id) {
      const { data: personaData, error: personaError } = await supabase
        .from('ai_personas')
        .select('*')
        .eq('id', request.persona_id)
        .eq('user_id', request.user_id)
        .single();

      if (personaError) {
        console.error('Error fetching persona:', personaError);
      } else {
        persona = personaData;
      }
    }

    // Get fallback persona if none specified or not found
    if (!persona) {
      const { data: defaultPersona, error: defaultError } = await supabase
        .from('ai_personas')
        .select('*')
        .eq('user_id', request.user_id)
        .eq('name', 'Profissional')
        .eq('is_active', true)
        .single();

      if (!defaultError) {
        persona = defaultPersona;
      }
    }

    // Get template if specified
    let template = null;
    if (request.template_id) {
      const { data: templateData, error: templateError } = await supabase
        .from('message_templates')
        .select('*')
        .eq('id', request.template_id)
        .eq('user_id', request.user_id)
        .single();

      if (!templateError) {
        template = templateData;
      }
    }

    // Build prompt
    const variations_count = request.variations_count || 3;
    const lead = request.lead;
    
    const systemPrompt = `Você é um especialista em comunicação comercial que cria mensagens de follow-up personalizadas.

PERSONA: ${persona?.name || 'Profissional'}
TOM: ${persona?.tone || 'professional'}
DIRETRIZES: ${persona?.guidelines || 'Seja direto, respeitoso e focado em resultados.'}

${template ? `TEMPLATE BASE:\n${template.message}\n\n` : ''}

INSTRUÇÕES ADICIONAIS: ${request.custom_instructions || 'Nenhuma'}

Crie ${variations_count} variações de mensagens de follow-up para o lead abaixo.
Cada mensagem deve:
1. Ser personalizada para o lead específico
2. Seguir a persona e tom definidos
3. Incluir um call-to-action claro
4. Ter entre 100-300 caracteres para WhatsApp
5. Ser natural e não parecer automática

LEAD:
- Nome: ${lead.name}
- Empresa: ${lead.business}
- Nicho: ${lead.niche || 'Não informado'}
- Cidade: ${lead.city || 'Não informada'}
- Telefone: ${lead.phone ? 'Disponível' : 'Não disponível'}
- Email: ${lead.email ? 'Disponível' : 'Não disponível'}

Responda APENAS com um JSON válido no formato:
{
  "variations": [
    {
      "message": "texto da mensagem",
      "confidence": 0.95
    }
  ]
}`;

    const userPrompt = `Gere ${variations_count} mensagens de follow-up personalizadas para ${lead.name} da empresa ${lead.business}.`;

    // Call OpenAI API
    const startTime = Date.now();
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const openAIData = await response.json();
    const executionTime = Date.now() - startTime;
    
    console.log('OpenAI response:', openAIData);

    // Parse the structured response
    let aiResult;
    try {
      aiResult = JSON.parse(openAIData.choices[0].message.content);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      throw new Error('Invalid AI response format');
    }

    // Log to ai_prompt_logs
    const tokensIn = openAIData.usage?.prompt_tokens || 0;
    const tokensOut = openAIData.usage?.completion_tokens || 0;
    const costEstimate = (tokensIn * 0.000001) + (tokensOut * 0.000003); // rough gpt-4o-mini pricing

    await supabase
      .from('ai_prompt_logs')
      .insert({
        user_id: request.user_id,
        scope: 'followup',
        model: 'gpt-4o-mini',
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        cost_estimate: costEstimate,
        input_json: {
          lead: request.lead,
          persona_id: request.persona_id,
          template_id: request.template_id,
          custom_instructions: request.custom_instructions
        },
        output_json: aiResult,
        persona_id: persona?.id,
        execution_time_ms: executionTime
      });

    const result = {
      variations: aiResult.variations || [],
      persona_used: persona?.name || 'Default',
      tokens_used: tokensIn + tokensOut,
      model: 'gpt-4o-mini'
    };

    console.log('AI followup generated successfully:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-followup-generate:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        variations: [],
        fallback: true
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});