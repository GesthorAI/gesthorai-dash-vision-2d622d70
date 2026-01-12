import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyticsRequest {
  user_id: string;
  organization_id: string;
  analysis_type: 'leads_overview' | 'performance_trends' | 'conversion_insights' | 'ai_usage';
  date_range?: {
    start_date: string;
    end_date: string;
  };
  filters?: {
    status?: string[];
    niche?: string[];
    city?: string[];
    source?: string[];
  };
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

    const request: AnalyticsRequest = await req.json();
    console.log('AI Analytics request:', { 
      user_id: request.user_id, 
      analysis_type: request.analysis_type
    });

    // Validate request
    if (!request.user_id || !request.organization_id || !request.analysis_type) {
      throw new Error('Missing required fields: user_id, organization_id, analysis_type');
    }

    // Check if AI analytics is enabled
    const { data: aiSettings } = await supabase
      .from('ai_settings')
      .select('feature_flags')
      .eq('organization_id', request.organization_id)
      .single();

    const featureEnabled = aiSettings?.feature_flags?.analytics_insights === true;
    if (!featureEnabled) {
      return new Response(
        JSON.stringify({ 
          error: 'AI analytics not enabled for this organization',
          insights: null
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

    // Set date range (default to last 30 days)
    const endDate = request.date_range?.end_date || new Date().toISOString();
    const startDate = request.date_range?.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Build query based on analysis type and fetch relevant data
    let analyticsData: any = {};
    
    try {
      switch (request.analysis_type) {
        case 'leads_overview':
          // Get leads data
          const { data: leadsData } = await supabase
            .from('leads')
            .select('id, name, business, niche, city, status, source, score, created_at')
            .eq('organization_id', request.organization_id)
            .gte('created_at', startDate)
            .lte('created_at', endDate);

          // Get lead scores
          const { data: scoresData } = await supabase
            .from('lead_scores')
            .select('lead_id, score, confidence, created_at')
            .in('lead_id', leadsData?.map(l => l.id) || []);

          analyticsData = {
            leads: leadsData || [],
            scores: scoresData || [],
            total_leads: leadsData?.length || 0,
            date_range: { start_date: startDate, end_date: endDate }
          };
          break;

        case 'performance_trends':
          // Get communications data
          const { data: commsData } = await supabase
            .from('communications')
            .select('lead_id, type, channel, status, created_at')
            .eq('organization_id', request.organization_id)
            .gte('created_at', startDate)
            .lte('created_at', endDate);

          // Get followup runs
          const { data: followupData } = await supabase
            .from('followup_runs')
            .select('id, name, status, total_leads, sent_count, failed_count, created_at')
            .eq('organization_id', request.organization_id)
            .gte('created_at', startDate)
            .lte('created_at', endDate);

          analyticsData = {
            communications: commsData || [],
            followup_runs: followupData || [],
            date_range: { start_date: startDate, end_date: endDate }
          };
          break;

        case 'conversion_insights':
          // Get leads with status progression
          const { data: conversionData } = await supabase
            .from('leads')
            .select('id, status, source, niche, city, score, created_at, updated_at')
            .eq('organization_id', request.organization_id)
            .gte('created_at', startDate)
            .lte('created_at', endDate);

          analyticsData = {
            leads: conversionData || [],
            date_range: { start_date: startDate, end_date: endDate }
          };
          break;

        case 'ai_usage':
          // Get AI usage logs
          const { data: aiLogs } = await supabase
            .from('ai_prompt_logs')
            .select('scope, model, tokens_in, tokens_out, cost_estimate, created_at')
            .eq('user_id', request.user_id)
            .gte('created_at', startDate)
            .lte('created_at', endDate);

          analyticsData = {
            ai_logs: aiLogs || [],
            date_range: { start_date: startDate, end_date: endDate }
          };
          break;

        default:
          throw new Error('Invalid analysis type');
      }
    } catch (dataError) {
      console.error('Error fetching analytics data:', dataError);
      throw new Error('Failed to fetch analytics data');
    }

    // Build system prompt based on analysis type
    let systemPrompt = '';
    
    switch (request.analysis_type) {
      case 'leads_overview':
        systemPrompt = `Você é um analista de dados especializado em análise de leads B2B.

MISSÃO: Analisar os dados de leads fornecidos e gerar insights acionáveis sobre a qualidade, distribuição e oportunidades.

ANÁLISES A INCLUIR:
1. **Distribuição por Status**: Quantos leads em cada status e % de conversão
2. **Qualidade dos Leads**: Análise dos scores e padrões de qualidade
3. **Segmentação**: Principais nichos, cidades, fontes
4. **Tendências Temporais**: Como os leads estão chegando ao longo do tempo
5. **Oportunidades**: Onde focar esforços para melhorar resultados

FORMATO: Insights práticos e recomendações específicas.`;
        break;

      case 'performance_trends':
        systemPrompt = `Você é um analista de performance de vendas especializado em comunicação com leads.

MISSÃO: Analisar dados de comunicação e campanhas de follow-up para identificar tendências e oportunidades de melhoria.

ANÁLISES A INCLUIR:
1. **Performance de Comunicação**: Taxa de resposta por canal
2. **Efetividade de Follow-ups**: Taxa de sucesso das campanhas
3. **Tendências Temporais**: Melhores horários e dias para contato
4. **Canais de Comunicação**: WhatsApp vs Email vs Telefone
5. **Oportunidades**: Como otimizar a comunicação

FORMATO: Insights sobre performance e recomendações de otimização.`;
        break;

      case 'conversion_insights':
        systemPrompt = `Você é um especialista em análise de conversão e funil de vendas.

MISSÃO: Analisar a jornada dos leads desde o primeiro contato até a conversão, identificando gargalos e oportunidades.

ANÁLISES A INCLUIR:
1. **Funil de Conversão**: Taxa de conversão por etapa
2. **Tempo de Conversão**: Quanto tempo leads levam para converter
3. **Fatores de Sucesso**: Características dos leads que convertem melhor
4. **Gargalos**: Onde leads estão "travando" no funil
5. **Segmentação**: Quais nichos/fontes convertem melhor

FORMATO: Insights sobre conversão e estratégias para melhorar o funil.`;
        break;

      case 'ai_usage':
        systemPrompt = `Você é um analista de eficiência de IA e automação.

MISSÃO: Analisar o uso de recursos de IA para identificar padrões, custos e oportunidades de otimização.

ANÁLISES A INCLUIR:
1. **Uso por Funcionalidade**: Quais recursos de IA são mais usados
2. **Eficiência de Custos**: Análise de tokens e gastos
3. **Padrões de Uso**: Quando e como a IA é utilizada
4. **ROI de IA**: Retorno sobre investimento em automação
5. **Otimizações**: Como usar IA de forma mais eficiente

FORMATO: Insights sobre uso de IA e recomendações de otimização.`;
        break;
    }

    systemPrompt += `

DIRETRIZES:
- Use dados concretos para embasar insights
- Seja específico nas recomendações
- Foque em ações práticas e implementáveis
- Identifique tendências e padrões importantes
- Considere o contexto do mercado brasileiro

Responda APENAS com JSON válido:
{
  "insights": [
    {
      "title": "Título do insight",
      "description": "Descrição detalhada",
      "impact": "alto|medio|baixo",
      "category": "qualidade|performance|conversao|custo",
      "recommendation": "Ação específica recomendada",
      "data_supporting": "Dados que embasam este insight"
    }
  ],
  "key_metrics": {
    "metric1": "valor",
    "metric2": "valor"
  },
  "recommendations": [
    "Recomendação 1",
    "Recomendação 2"
  ],
  "trends": [
    "Tendência identificada 1",
    "Tendência identificada 2"
  ]
}`;

    const userPrompt = `Analise os seguintes dados e gere insights para ${request.analysis_type}:

DADOS PARA ANÁLISE:
${JSON.stringify(analyticsData, null, 2)}

FILTROS APLICADOS:
${request.filters ? JSON.stringify(request.filters, null, 2) : 'Nenhum filtro aplicado'}

Forneça insights detalhados e recomendações acionáveis baseados nos dados fornecidos.`;

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
        requestBody.max_tokens = 4000;
        requestBody.temperature = 0.3;
      } else {
        requestBody.max_completion_tokens = 4000;
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
        throw new Error('Invalid AI response format');
      }

      // Log the request
      await supabase
        .from('ai_prompt_logs')
        .insert({
          user_id: request.user_id,
          scope: 'analytics',
          model: model,
          tokens_in: tokensIn,
          tokens_out: tokensOut,
          cost_estimate: (tokensIn * 0.000001) + (tokensOut * 0.000003),
          input_json: { 
            analysis_type: request.analysis_type,
            data_points: JSON.stringify(analyticsData).length,
            date_range: { start_date: startDate, end_date: endDate }
          },
          output_json: aiResult,
          execution_time_ms: Date.now() - startTime
        });

      const executionTime = Date.now() - startTime;
      
      console.log(`AI analytics complete for ${request.analysis_type} in ${executionTime}ms`);

      return new Response(JSON.stringify({
        success: true,
        analysis_type: request.analysis_type,
        insights: aiResult.insights || [],
        key_metrics: aiResult.key_metrics || {},
        recommendations: aiResult.recommendations || [],
        trends: aiResult.trends || [],
        date_range: { start_date: startDate, end_date: endDate },
        data_points_analyzed: JSON.stringify(analyticsData).length,
        execution_time_ms: executionTime
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (apiError) {
      console.error('Error calling OpenAI API:', apiError);
      throw apiError;
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in ai-analytics:', error);
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        insights: null
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});