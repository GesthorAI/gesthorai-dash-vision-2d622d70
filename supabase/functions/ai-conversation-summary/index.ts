import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConversationSummaryRequest {
  user_id: string;
  organization_id: string;
  lead_id: string;
  messages: Array<{
    id: string;
    type: 'inbound' | 'outbound' | 'auto_reply';
    message: string;
    channel: 'whatsapp' | 'email' | 'phone';
    created_at: string;
  }>;
  summary_type?: 'brief' | 'detailed' | 'action_items';
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

    const request: ConversationSummaryRequest = await req.json();
    console.log('AI Conversation Summary request:', { 
      user_id: request.user_id, 
      lead_id: request.lead_id,
      messages_count: request.messages.length 
    });

    // Validate request
    if (!request.user_id || !request.organization_id || !request.lead_id || !request.messages?.length) {
      throw new Error('Missing required fields: user_id, organization_id, lead_id, messages');
    }

    // Check if AI conversation summary is enabled
    const { data: aiSettings } = await supabase
      .from('ai_settings')
      .select('feature_flags')
      .eq('organization_id', request.organization_id)
      .single();

    const featureEnabled = aiSettings?.feature_flags?.conversation_summary === true;
    if (!featureEnabled) {
      return new Response(
        JSON.stringify({ 
          error: 'AI conversation summary not enabled for this organization',
          summary: null
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get lead information for context
    const { data: lead } = await supabase
      .from('leads')
      .select('name, business, niche, city, status')
      .eq('id', request.lead_id)
      .single();

    const startTime = Date.now();
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const model = aiSettings?.feature_flags?.model || 'gpt-5-mini-2025-08-07';
    const summaryType = request.summary_type || 'detailed';

    // Build system prompt based on summary type
    let systemPrompt = '';
    
    switch (summaryType) {
      case 'brief':
        systemPrompt = `Você é um assistente especializado em resumir conversas comerciais de forma concisa.

MISSÃO: Criar um resumo breve (máximo 100 palavras) da conversa com foco nos pontos principais.

FORMATO DO RESUMO BREVE:
- Status do lead
- Principal interesse/objeção
- Próximos passos (se houver)

Seja direto e objetivo.`;
        break;
        
      case 'action_items':
        systemPrompt = `Você é um assistente especializado em extrair itens de ação de conversas comerciais.

MISSÃO: Identificar todas as tarefas, compromissos e próximos passos mencionados na conversa.

FORMATO DOS ITENS DE AÇÃO:
- Tarefa específica
- Responsável (vendedor/lead)
- Prazo (se mencionado)
- Prioridade (alta/média/baixa)

Foque apenas em ações concretas e compromissos.`;
        break;
        
      default: // detailed
        systemPrompt = `Você é um assistente especializado em resumir conversas comerciais de forma detalhada e estruturada.

MISSÃO: Criar um resumo completo da conversa que permita qualquer pessoa entender o contexto e status do lead.

ESTRUTURA DO RESUMO DETALHADO:
1. **Contexto**: Breve apresentação do lead e sua situação
2. **Interesse**: O que o lead demonstrou interesse ou necessidade
3. **Objeções**: Principais resistências ou dúvidas levantadas
4. **Propostas**: O que foi oferecido/proposto pelo vendedor
5. **Status Atual**: Onde a conversa parou
6. **Próximos Passos**: O que deve ser feito na sequência
7. **Insights**: Observações importantes sobre o lead

Seja detalhado mas organize a informação de forma clara.`;
    }

    systemPrompt += `

CONTEXTO DO LEAD:
- Nome: ${lead?.name || 'Não informado'}
- Empresa: ${lead?.business || 'Não informada'}
- Nicho: ${lead?.niche || 'Não informado'}
- Cidade: ${lead?.city || 'Não informada'}
- Status: ${lead?.status || 'Novo'}

DIRETRIZES:
- Use linguagem profissional mas acessível
- Mantenha neutralidade e objetividade
- Identifique patterns de comportamento do lead
- Destaque informações comercialmente relevantes
- Se a conversa for muito curta, seja proporcional no resumo

Responda APENAS com JSON válido:
{
  "summary": "Texto do resumo conforme formato solicitado",
  "key_insights": ["insight1", "insight2", "insight3"],
  "lead_sentiment": "interessado|neutro|resistente|perdido",
  "conversation_stage": "inicial|qualificacao|proposta|negociacao|fechamento",
  "priority_score": 5,
  "recommended_actions": ["acao1", "acao2"],
  "tags": ["tag1", "tag2", "tag3"]
}`;

    // Prepare conversation text
    const conversationText = request.messages
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((msg, index) => {
        const direction = msg.type === 'inbound' ? 'LEAD' : 'VENDEDOR';
        const timestamp = new Date(msg.created_at).toLocaleString('pt-BR');
        return `[${timestamp}] ${direction} (${msg.channel}): ${msg.message}`;
      })
      .join('\n');

    const userPrompt = `Análise a seguinte conversa e crie um resumo ${summaryType === 'brief' ? 'breve' : summaryType === 'action_items' ? 'focado em ações' : 'detalhado'}:

CONVERSA (${request.messages.length} mensagens):
${conversationText}

Forneça o resumo no formato JSON solicitado.`;

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
        requestBody.max_tokens = summaryType === 'brief' ? 500 : 2000;
        requestBody.temperature = 0.3;
      } else {
        requestBody.max_completion_tokens = summaryType === 'brief' ? 500 : 2000;
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
          lead_id: request.lead_id,
          scope: 'conversation_summary',
          model: model,
          tokens_in: tokensIn,
          tokens_out: tokensOut,
          cost_estimate: (tokensIn * 0.000001) + (tokensOut * 0.000003),
          input_json: { 
            lead_id: request.lead_id,
            messages_count: request.messages.length,
            summary_type: summaryType
          },
          output_json: aiResult,
          execution_time_ms: Date.now() - startTime
        });

      const executionTime = Date.now() - startTime;
      
      console.log(`AI conversation summary complete for lead ${request.lead_id} in ${executionTime}ms`);

      return new Response(JSON.stringify({
        success: true,
        summary: aiResult.summary,
        key_insights: aiResult.key_insights || [],
        lead_sentiment: aiResult.lead_sentiment || 'neutro',
        conversation_stage: aiResult.conversation_stage || 'inicial',
        priority_score: aiResult.priority_score || 5,
        recommended_actions: aiResult.recommended_actions || [],
        tags: aiResult.tags || [],
        summary_type: summaryType,
        messages_analyzed: request.messages.length,
        execution_time_ms: executionTime
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (apiError) {
      console.error('Error calling OpenAI API:', apiError);
      throw apiError;
    }

  } catch (error) {
    console.error('Error in ai-conversation-summary:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        summary: null
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});