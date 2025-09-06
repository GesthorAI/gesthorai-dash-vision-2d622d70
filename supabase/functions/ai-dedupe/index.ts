import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const request: DedupeRequest = await req.json();
    console.log('AI Dedupe request:', { user_id: request.user_id, leads_count: request.leads.length });

    // Validate request
    if (!request.user_id || !request.organization_id || !request.leads?.length) {
      throw new Error('Missing required fields: user_id, organization_id, leads');
    }

    // Check if AI dedupe is enabled
    const { data: aiSettings } = await supabase
      .from('ai_settings')
      .select('feature_flags')
      .eq('organization_id', request.organization_id)
      .single();

    const featureEnabled = aiSettings?.feature_flags?.auto_dedupe === true;
    if (!featureEnabled) {
      return new Response(
        JSON.stringify({ 
          error: 'AI deduplication not enabled for this organization',
          duplicates: []
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
    const threshold = request.similarity_threshold || 0.85;

    // Build system prompt for deduplication
    const systemPrompt = `Você é um especialista em identificação de leads duplicados com alta precisão.

MISSÃO: Analisar uma lista de leads e identificar possíveis duplicatas baseado em critérios rigorosos.

CRITÉRIOS DE DUPLICAÇÃO:
1. **Nome exato ou muito similar** (considerando abreviações, acentos, maiúsculas/minúsculas)
2. **Mesmo telefone** (com ou sem formatação, códigos de área)
3. **Mesmo email** (case-insensitive)
4. **Mesma empresa + cidade** (nomes similares de negócios na mesma localização)
5. **Patterns suspeitos** (empresas genéricas como "Loja", "Serviços", etc.)

LIMIAR DE SIMILARIDADE: ${threshold}

REGRAS:
- Seja conservador: prefira não marcar como duplicata se houver dúvida
- Considere variações ortográficas comuns
- Telefones: ignore formatação, considere apenas números
- Empresas: "João Silva ME" = "João Silva Microempresa" = possível duplicata
- Cidades: "São Paulo" = "SP" = "Sao Paulo"

Responda APENAS com JSON válido:
{
  "duplicate_groups": [
    {
      "master_id": "id_do_lead_principal",
      "duplicates": ["id1", "id2"],
      "similarity_score": 0.95,
      "match_criteria": ["phone", "business_name"],
      "rationale": "Mesmo telefone e empresa similar"
    }
  ],
  "total_duplicates_found": 0,
  "total_groups": 0
}`;

    // Process leads in batches
    const batchSize = 50;
    const allDuplicateGroups: any[] = [];
    
    for (let i = 0; i < request.leads.length; i += batchSize) {
      const batch = request.leads.slice(i, i + batchSize);
      
      const userPrompt = `Analise os seguintes ${batch.length} leads para identificar possíveis duplicatas:

${batch.map((lead, index) => `
LEAD ${index + 1}:
- ID: ${lead.id}
- Nome: ${lead.name}
- Empresa: ${lead.business}
- Telefone: ${lead.phone || 'N/A'}
- Email: ${lead.email || 'N/A'}
- Cidade: ${lead.city || 'N/A'}
- Nicho: ${lead.niche || 'N/A'}
`).join('\n')}

Identifique grupos de duplicatas dentro deste lote.`;

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
          requestBody.max_tokens = 2000;
          requestBody.temperature = 0.1;
        } else {
          requestBody.max_completion_tokens = 2000;
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
          if (aiResult.duplicate_groups && Array.isArray(aiResult.duplicate_groups)) {
            allDuplicateGroups.push(...aiResult.duplicate_groups);
          }
        } catch (parseError) {
          console.error('Error parsing AI response:', parseError);
        }

        // Log this batch
        await supabase
          .from('ai_prompt_logs')
          .insert({
            user_id: request.user_id,
            scope: 'dedupe',
            model: model,
            tokens_in: tokensIn,
            tokens_out: tokensOut,
            cost_estimate: (tokensIn * 0.000001) + (tokensOut * 0.000003),
            input_json: { leads_count: batch.length, threshold },
            output_json: aiResult,
            execution_time_ms: Date.now() - startTime
          });

        console.log(`Processed dedupe batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(request.leads.length/batchSize)}`);

      } catch (batchError) {
        console.error('Error processing dedupe batch:', batchError);
      }
    }

    const executionTime = Date.now() - startTime;
    const totalDuplicates = allDuplicateGroups.reduce((sum, group) => sum + group.duplicates.length, 0);
    
    console.log(`AI deduplication complete: ${allDuplicateGroups.length} groups, ${totalDuplicates} duplicates found in ${executionTime}ms`);

    return new Response(JSON.stringify({
      success: true,
      duplicate_groups: allDuplicateGroups,
      total_duplicates_found: totalDuplicates,
      total_groups: allDuplicateGroups.length,
      similarity_threshold: threshold,
      execution_time_ms: executionTime
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-dedupe:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        duplicate_groups: []
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});