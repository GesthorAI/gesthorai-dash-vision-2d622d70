import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const request: EnrichRequest = await req.json();
    console.log('AI Enrich request:', { user_id: request.user_id, leads_count: request.leads.length });

    // Validate request
    if (!request.user_id || !request.organization_id || !request.leads?.length) {
      throw new Error('Missing required fields: user_id, organization_id, leads');
    }

    // Check if AI enrichment is enabled
    const { data: aiSettings } = await supabase
      .from('ai_settings')
      .select('feature_flags')
      .eq('organization_id', request.organization_id)
      .single();

    const featureEnabled = aiSettings?.feature_flags?.lead_enrichment === true;
    if (!featureEnabled) {
      return new Response(
        JSON.stringify({ 
          error: 'AI lead enrichment not enabled for this organization',
          enriched_leads: []
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const startTime = Date.now();
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const model = aiSettings?.feature_flags?.model || 'gpt-5-mini-2025-08-07';
    const enrichmentFields = request.enrichment_fields || ['niche', 'business_size', 'potential_value', 'contact_preference'];

    // Build system prompt for enrichment
    const systemPrompt = `Você é um especialista em enriquecimento de dados de leads B2B com conhecimento profundo do mercado brasileiro.

MISSÃO: Analisar leads incompletos e inferir informações adicionais baseado em patterns, conhecimento de mercado e lógica empresarial.

CAMPOS PARA ENRIQUECER:
${enrichmentFields.map(field => `- ${field}`).join('\n')}

DIRETRIZES DE ENRIQUECIMENTO:
1. **Nicho/Segmento**: Baseado no nome da empresa, inferir o setor (medicina, advocacia, comércio, serviços, etc.)
2. **Porte da Empresa**: MEI, Micro, Pequena, Média (baseado no nome, cidade, contexto)
3. **Valor Potencial**: Baixo (R$ 100-500), Médio (R$ 500-2000), Alto (R$ 2000+)
4. **Preferência de Contato**: WhatsApp, Email, Telefone (baseado no perfil/nicho)
5. **Urgência**: Baixa, Média, Alta (baseado no tipo de negócio)
6. **Horário Ideal**: Manhã, Tarde, Noite (baseado no perfil profissional)

REGRAS:
- Seja conservador: use "Não determinado" se não houver certeza
- Baseie-se em conhecimento real do mercado brasileiro
- Considere o contexto da cidade (capital vs interior)
- Use categorias padronizadas e consistentes
- Priorize precision over recall

Responda APENAS com JSON válido:
{
  "enriched_leads": [
    {
      "lead_id": "uuid",
      "enriched_data": {
        "niche": "Medicina - Clínica Geral",
        "business_size": "Micro",
        "potential_value": "Alto",
        "contact_preference": "WhatsApp",
        "urgency": "Média",
        "ideal_time": "Manhã",
        "confidence_score": 0.85
      },
      "rationale": "Explicação da inferência feita"
    }
  ]
}`;

    // Process leads in smaller batches for enrichment
    const batchSize = 10;
    const allEnrichedLeads: any[] = [];
    
    for (let i = 0; i < request.leads.length; i += batchSize) {
      const batch = request.leads.slice(i, i + batchSize);
      
      const userPrompt = `Enriqueça os seguintes ${batch.length} leads com informações inferidas:

${batch.map((lead, index) => `
LEAD ${index + 1}:
- ID: ${lead.id}
- Nome: ${lead.name}
- Empresa: ${lead.business}
- Telefone: ${lead.phone || 'Não informado'}
- Email: ${lead.email || 'Não informado'}
- Cidade: ${lead.city || 'Não informada'}
- Nicho atual: ${lead.niche || 'Não informado'}
`).join('\n')}

Para cada lead, infira as informações solicitadas baseado nos dados disponíveis.`;

      try {
        const requestBody: any = {
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: "json_object" }
        };

        // Handle model parameter differences
        const legacyModels = ['gpt-4o', 'gpt-4o-mini'];
        if (legacyModels.includes(model)) {
          requestBody.max_tokens = 3000;
          requestBody.temperature = 0.3;
        } else {
          requestBody.max_completion_tokens = 3000;
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error('OpenAI API error:', errorData);
          continue; // Skip this batch
        }

        const openAIData = await response.json();
        const tokensIn = openAIData.usage?.prompt_tokens || 0;
        const tokensOut = openAIData.usage?.completion_tokens || 0;

        // Parse AI response
        let aiResult;
        try {
          aiResult = JSON.parse(openAIData.choices[0].message.content);
          if (aiResult.enriched_leads && Array.isArray(aiResult.enriched_leads)) {
            allEnrichedLeads.push(...aiResult.enriched_leads);
          }
        } catch (parseError) {
          console.error('Error parsing AI response:', parseError);
        }

        // Log this batch
        await supabase
          .from('ai_prompt_logs')
          .insert({
            user_id: request.user_id,
            scope: 'enrichment',
            model: model,
            tokens_in: tokensIn,
            tokens_out: tokensOut,
            cost_estimate: (tokensIn * 0.000001) + (tokensOut * 0.000003),
            input_json: { leads_count: batch.length, fields: enrichmentFields },
            output_json: aiResult,
            execution_time_ms: Date.now() - startTime
          });

        console.log(`Processed enrichment batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(request.leads.length/batchSize)}`);

      } catch (batchError) {
        console.error('Error processing enrichment batch:', batchError);
      }
    }

    // Update leads with enriched data
    const updatePromises = allEnrichedLeads.map(async (enrichedLead) => {
      try {
        const { error } = await supabase
          .from('leads')
          .update({
            niche: enrichedLead.enriched_data.niche || undefined,
            // Store additional enriched data in a metadata JSON field if available
            // For now, we'll focus on the niche field which exists
            updated_at: new Date().toISOString()
          })
          .eq('id', enrichedLead.lead_id);

        if (error) {
          console.error('Error updating lead:', error);
        }
      } catch (updateError) {
        console.error('Error in lead update:', updateError);
      }
    });

    await Promise.allSettled(updatePromises);

    const executionTime = Date.now() - startTime;
    
    console.log(`AI enrichment complete: ${allEnrichedLeads.length} leads enriched in ${executionTime}ms`);

    return new Response(JSON.stringify({
      success: true,
      enriched_leads: allEnrichedLeads,
      total_enriched: allEnrichedLeads.length,
      enrichment_fields: enrichmentFields,
      execution_time_ms: executionTime
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-enrich:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        enriched_leads: []
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});