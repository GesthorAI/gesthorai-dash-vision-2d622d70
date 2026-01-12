import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

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

    const requestBody: ConversationSummaryRequest = await req.json();
    const { user_id, organization_id, lead_id, messages, summary_type = 'brief' } = requestBody;

    console.log('AI Conversation Summary request:', { 
      user_id, 
      organization_id, 
      lead_id, 
      messages_count: messages.length, 
      summary_type 
    });

    if (!messages || messages.length === 0) {
      throw new Error('No messages provided for summary');
    }

    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    // Check if conversation summary feature is enabled
    const { data: settings } = await supabaseClient
      .from('ai_settings')
      .select('feature_flags, model_preferences')
      .eq('organization_id', organization_id)
      .single();

    if (!settings?.feature_flags?.conversation_summary) {
      throw new Error('Conversation summary feature not enabled for this organization');
    }

    // Get lead details for context
    const { data: leadData } = await supabaseClient
      .from('leads')
      .select('name, business, city, niche, status')
      .eq('id', lead_id)
      .single();

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const model = settings.model_preferences?.default_model || 'gpt-5-mini-2025-08-07';
    const startTime = Date.now();

    // Different system prompts based on summary type
    const systemPrompts = {
      brief: `You are an AI assistant specialized in creating brief conversation summaries for sales teams.

Analyze the conversation and provide a concise summary focusing on:
- Key points discussed
- Lead's interest level and sentiment
- Next steps or follow-up needed
- Overall conversation stage

Keep the summary under 3 sentences and focus on actionable insights.`,

      detailed: `You are an AI assistant specialized in creating detailed conversation analyses for sales teams.

Analyze the conversation thoroughly and provide:
- Comprehensive summary of all topics discussed
- Lead's sentiment and interest indicators throughout the conversation
- Specific pain points or needs mentioned
- Objections or concerns raised
- Opportunities identified
- Detailed next steps and recommendations

Be thorough but organized in your analysis.`,

      action_items: `You are an AI assistant specialized in extracting actionable tasks from sales conversations.

Focus specifically on:
- Clear action items for the sales team
- Follow-up tasks with specific timelines
- Information gaps that need to be filled
- Next meeting or contact scheduling needs
- Preparation items for future interactions

Present as a clear, prioritized task list.`
    };

    const systemPrompt = systemPrompts[summary_type] + `

For lead sentiment, use these categories:
- interessado: Showing clear interest and engagement
- neutro: Polite but non-committal responses
- resistente: Showing hesitation or objections
- perdido: Disengaged or clearly not interested

For conversation stage, use:
- inicial: First contact or introduction
- qualificacao: Qualifying needs and fit
- proposta: Discussing solutions or proposals
- negociacao: Negotiating terms or addressing objections
- fechamento: Moving toward closing or final decision

Provide priority score (1-10) based on likelihood to convert and urgency.

Return valid JSON with this structure:
{
  "summary": "conversation summary text",
  "key_insights": ["insight 1", "insight 2"],
  "lead_sentiment": "sentiment category",
  "conversation_stage": "stage category", 
  "priority_score": number,
  "recommended_actions": ["action 1", "action 2"],
  "tags": ["tag1", "tag2"]
}`;

    // Format conversation for AI analysis
    const conversationText = messages
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map(msg => {
        const direction = msg.type === 'inbound' ? 'Lead' : 'Empresa';
        const timestamp = new Date(msg.created_at).toLocaleString('pt-BR');
        return `[${timestamp}] ${direction} (${msg.channel}): ${msg.message}`;
      })
      .join('\n');

    const userPrompt = `Analyze this conversation for lead: ${leadData?.name || 'Unknown'} (${leadData?.business || 'Unknown business'})

Lead Context:
- Business: ${leadData?.business || 'N/A'}
- City: ${leadData?.city || 'N/A'}
- Niche: ${leadData?.niche || 'N/A'}
- Current Status: ${leadData?.status || 'N/A'}

Conversation (${messages.length} messages):
${conversationText}

Provide a ${summary_type} summary and analysis in valid JSON format.`;

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
        max_completion_tokens: summary_type === 'detailed' ? 2000 : 1000,
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
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent);
      throw new Error('Failed to parse AI response');
    }

    const executionTime = Date.now() - startTime;

    // Log the prompt for analytics
    await supabaseClient
      .from('ai_prompt_logs')
      .insert({
        user_id,
        organization_id,
        lead_id,
        feature_type: 'conversation_summary',
        model,
        scope: 'conversation_analysis',
        tokens_in: data.usage?.prompt_tokens || 0,
        tokens_out: data.usage?.completion_tokens || 0,
        cost_estimate: ((data.usage?.prompt_tokens || 0) * 0.000001) + ((data.usage?.completion_tokens || 0) * 0.000002),
        execution_time_ms: executionTime,
        input_json: { messages_count: messages.length, summary_type },
        output_json: { 
          sentiment: aiResponse.lead_sentiment,
          stage: aiResponse.conversation_stage,
          priority_score: aiResponse.priority_score
        }
      });

    console.log('AI Conversation Summary completed:', {
      sentiment: aiResponse.lead_sentiment,
      stage: aiResponse.conversation_stage,
      execution_time: executionTime
    });

    return new Response(JSON.stringify({
      success: true,
      summary: aiResponse.summary,
      key_insights: aiResponse.key_insights || [],
      lead_sentiment: aiResponse.lead_sentiment || 'neutro',
      conversation_stage: aiResponse.conversation_stage || 'inicial',
      priority_score: aiResponse.priority_score || 5,
      recommended_actions: aiResponse.recommended_actions || [],
      tags: aiResponse.tags || [],
      summary_type,
      messages_analyzed: messages.length,
      execution_time_ms: executionTime
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in ai-conversation-summary function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});