import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AIScoreRequest {
  user_id: string;
  leads: Array<{
    id: string;
    name: string;
    business: string;
    niche?: string;
    city?: string;
    phone?: string;
    email?: string;
    status?: string;
    source?: string;
    created_at?: string;
  }>;
  batch_mode?: boolean;
}

interface LeadScoreResult {
  lead_id: string;
  score: number;
  rationale: string;
  confidence: number;
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

    const request: AIScoreRequest = await req.json();
    console.log('AI Lead Score request:', { user_id: request.user_id, leads_count: request.leads.length });

    // Validate request
    if (!request.user_id || !request.leads?.length) {
      throw new Error('Missing required fields: user_id, leads');
    }

    // Check if user has AI lead scoring enabled
    const { data: aiSettings } = await supabase
      .from('ai_settings')
      .select('feature_flags, limits')
      .eq('user_id', request.user_id)
      .single();

    console.log(`Processing ${request.leads.length} leads for scoring`);

    // Get user's AI settings for model configuration
    const { data: userSettings } = await supabase
      .from('ai_settings')
      .select('feature_flags')
      .eq('user_id', request.user_id)
      .single();

    const model = userSettings?.feature_flags?.model || 'gpt-4o-mini';
    const temperature = userSettings?.feature_flags?.temperature || 0.7;
    const maxTokens = userSettings?.feature_flags?.max_tokens || 1000;

    const featureEnabled = aiSettings?.feature_flags && 
                          typeof aiSettings.feature_flags === 'object' &&
                          (aiSettings.feature_flags as any).lead_scoring_ai === true;

    if (!featureEnabled) {
      return new Response(
        JSON.stringify({ 
          error: 'AI lead scoring not enabled for this user',
          scores: []
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const startTime = Date.now();
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Build system prompt for lead scoring
    const systemPrompt = `Você é um especialista em qualificação de leads B2B com 15+ anos de experiência em vendas e marketing digital.

MISSÃO: Analisar leads e atribuir uma pontuação de 0-10 baseada na probabilidade de conversão.

CRITÉRIOS DE PONTUAÇÃO:
1. **Completude dos Dados (0-2 pontos)**
   - Telefone + Email + Nome completo = 2 pontos
   - 2 dos 3 campos = 1.5 pontos
   - Apenas 1 campo = 1 ponto
   - Dados incompletos = 0.5 pontos

2. **Qualidade do Negócio (0-3 pontos)**
   - Nome profissional da empresa = 2-3 pontos
   - Nome genérico/suspeito = 1 ponto
   - Sem nome ou muito vago = 0 pontos

3. **Nicho/Mercado (0-2 pontos)**
   - Nichos lucrativos (medicina, advocacia, consultoria) = 2 pontos
   - Nichos médios (varejo, serviços) = 1.5 pontos
   - Nichos difíceis ou não informado = 1 ponto

4. **Localização (0-1 ponto)**
   - Capitais/grandes centros = 1 ponto
   - Cidades menores = 0.5 pontos
   - Não informado = 0 pontos

5. **Fonte e Timing (0-2 pontos)**
   - Lead orgânico recente (até 7 dias) = 2 pontos
   - Lead orgânico antigo (8-30 dias) = 1.5 pontos
   - Lead comprado/importado = 1 ponto
   - Muito antigo (>30 dias) = 0.5 pontos

IMPORTANTE:
- Seja criterioso mas realista
- Considere o contexto brasileiro
- Leve em conta indicadores de poder aquisitivo
- Prefira scores entre 3-8 (extremos são raros)

Responda APENAS com JSON válido:
{
  "scores": [
    {
      "lead_id": "uuid",
      "score": 7.5,
      "rationale": "Explicação clara e concisa do score em português",
      "confidence": 0.85
    }
  ]
}`;

    // Process leads in batches for better performance
    const batchSize = request.batch_mode ? 20 : 5;
    const results: LeadScoreResult[] = [];
    
    for (let i = 0; i < request.leads.length; i += batchSize) {
      const batch = request.leads.slice(i, i + batchSize);
      
      const userPrompt = `Analise os seguintes leads e atribua pontuações:

${batch.map((lead, index) => `
LEAD ${index + 1}:
- ID: ${lead.id}
- Nome: ${lead.name}
- Empresa: ${lead.business}
- Nicho: ${lead.niche || 'Não informado'}
- Cidade: ${lead.city || 'Não informada'}
- Telefone: ${lead.phone ? 'Disponível' : 'Não disponível'}
- Email: ${lead.email ? 'Disponível' : 'Não disponível'}
- Status: ${lead.status || 'novo'}
- Fonte: ${lead.source || 'Não informada'}
- Idade: ${lead.created_at ? `${Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24))} dias` : 'Não informada'}
`).join('\n')}

Forneça pontuações detalhadas para todos os ${batch.length} leads.`;

      try {
        const requestBody: any = {
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
        };

        // Handle different model parameter requirements
        const legacyModels = ['gpt-4o', 'gpt-4o-mini'];
        const newModels = ['gpt-5-2025-08-07', 'gpt-5-mini-2025-08-07', 'gpt-4.1-2025-04-14'];
        
        if (legacyModels.includes(model)) {
          requestBody.max_tokens = Math.min(maxTokens, 2000);
          requestBody.temperature = Math.min(temperature, 0.5);
        } else if (newModels.includes(model)) {
          requestBody.max_completion_tokens = Math.min(maxTokens, 2000);
        } else {
          requestBody.max_tokens = Math.min(maxTokens, 2000);
          requestBody.temperature = Math.min(temperature, 0.5);
        }
        
        requestBody.response_format = { type: "json_object" };

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
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const openAIData = await response.json();
        const tokensIn = openAIData.usage?.prompt_tokens || 0;
        const tokensOut = openAIData.usage?.completion_tokens || 0;

        // Parse AI response
        let aiResult;
        try {
          aiResult = JSON.parse(openAIData.choices[0].message.content);
        } catch (parseError) {
          console.error('Error parsing AI response:', parseError);
          // Fallback: assign default scores
          aiResult = {
            scores: batch.map(lead => ({
              lead_id: lead.id,
              score: 5.0,
              rationale: "Erro na análise de IA - score padrão aplicado",
              confidence: 0.5
            }))
          };
        }

        // Validate and add results
        if (aiResult.scores && Array.isArray(aiResult.scores)) {
          results.push(...aiResult.scores);
        }

        // Log this batch
        await supabase
          .from('ai_prompt_logs')
          .insert({
            user_id: request.user_id,
            scope: 'lead_score',
            model: model,
            tokens_in: tokensIn,
            tokens_out: tokensOut,
            cost_estimate: (tokensIn * 0.000001) + (tokensOut * 0.000003),
            input_json: { leads: batch.map(l => ({ id: l.id, name: l.name, business: l.business })) },
            output_json: aiResult,
            execution_time_ms: Date.now() - startTime
          });

        console.log(`Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(request.leads.length/batchSize)}`);

      } catch (batchError) {
        console.error('Error processing batch:', batchError);
        // Add fallback scores for this batch
        results.push(...batch.map(lead => ({
          lead_id: lead.id,
          score: 5.0,
          rationale: "Erro na análise - score padrão aplicado",
          confidence: 0.5
        })));
      }
    }

    // Save scores to database
    const scoresToSave = results.map(result => ({
      lead_id: result.lead_id,
      score: Math.max(0, Math.min(10, result.score)), // Clamp between 0-10
      rationale: result.rationale,
      model: model,
      confidence: Math.max(0, Math.min(1, result.confidence || 0.8))
    }));

    if (scoresToSave.length > 0) {
      // Delete existing scores for these leads first
      const leadIds = scoresToSave.map(s => s.lead_id);
      await supabase
        .from('lead_scores')
        .delete()
        .in('lead_id', leadIds);

      // Insert new scores
      const { error: insertError } = await supabase
        .from('lead_scores')
        .insert(scoresToSave);

      if (insertError) {
        console.error('Error saving scores:', insertError);
        throw new Error('Failed to save lead scores');
      }
    }

    const executionTime = Date.now() - startTime;
    
    console.log(`AI lead scoring complete: ${results.length} leads processed in ${executionTime}ms`);

    return new Response(JSON.stringify({
      success: true,
      scores: results,
      processed_count: results.length,
      execution_time_ms: executionTime
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in ai-lead-score:', error);
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        scores: []
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});