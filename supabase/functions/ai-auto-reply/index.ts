import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openaiKey = Deno.env.get('OPENAI_API_KEY')!;
const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL')!;
const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      lead_id, 
      inbound_message, 
      instance_name,
      phone_number 
    } = await req.json();

    if (!lead_id || !inbound_message) {
      throw new Error('lead_id and inbound_message are required');
    }

    console.log(`Processing auto-reply for lead ${lead_id}`);

    // Get lead and auto-reply settings
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select(`
        id, name, business, city, niche, organization_id, user_id,
        whatsapp_number, phone, last_contacted_at
      `)
      .eq('id', lead_id)
      .single();

    if (leadError) throw leadError;

    // Get auto-reply settings for this organization
    const { data: settings, error: settingsError } = await supabase
      .from('auto_reply_settings')
      .select(`
        is_active, business_hours_start, business_hours_end, business_days,
        auto_reply_delay_minutes, max_replies_per_lead, persona_id, custom_prompt
      `)
      .eq('organization_id', lead.organization_id)
      .eq('is_active', true)
      .single();

    if (settingsError || !settings) {
      console.log('Auto-reply not enabled for this organization');
      return new Response(JSON.stringify({ 
        success: true,
        skipped: true,
        reason: 'Auto-reply not enabled'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check business hours
    const now = new Date();
    const currentTime = now.toTimeString().substring(0, 5);
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    if (!settings.business_days.includes(currentDay)) {
      console.log('Outside business days');
      return new Response(JSON.stringify({ 
        success: true,
        skipped: true,
        reason: 'Outside business days'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (currentTime < settings.business_hours_start || currentTime > settings.business_hours_end) {
      console.log('Outside business hours');
      return new Response(JSON.stringify({ 
        success: true,
        skipped: true,
        reason: 'Outside business hours'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if we've reached max replies for this lead today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: todayReplies, error: repliesError } = await supabase
      .from('communications')
      .select('id')
      .eq('lead_id', lead_id)
      .eq('type', 'auto_reply')
      .gte('created_at', todayStart.toISOString())
      .limit(settings.max_replies_per_lead);

    if (repliesError) throw repliesError;

    if (todayReplies && todayReplies.length >= settings.max_replies_per_lead) {
      console.log('Max replies reached for today');
      return new Response(JSON.stringify({ 
        success: true,
        skipped: true,
        reason: 'Max replies reached for today'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get persona if specified
    let persona = null;
    if (settings.persona_id) {
      const { data: personaData, error: personaError } = await supabase
        .from('ai_personas')
        .select('name, tone, guidelines')
        .eq('id', settings.persona_id)
        .single();
      
      if (!personaError) persona = personaData;
    }

    // Get recent conversation history
    const { data: recentMessages, error: historyError } = await supabase
      .from('communications')
      .select('type, message, created_at')
      .eq('lead_id', lead_id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (historyError) throw historyError;

    // Generate AI response
    const systemPrompt = `Você é um assistente de vendas inteligente respondendo mensagens de WhatsApp.

INFORMAÇÕES DO LEAD:
- Nome: ${lead.name}
- Empresa: ${lead.business}
- Cidade: ${lead.city}
- Nicho: ${lead.niche || 'Não informado'}

${persona ? `
PERSONA ATIVA: ${persona.name}
Tom: ${persona.tone}
Diretrizes: ${persona.guidelines}
` : ''}

${settings.custom_prompt ? `
INSTRUÇÕES PERSONALIZADAS:
${settings.custom_prompt}
` : ''}

HISTÓRICO RECENTE:
${recentMessages?.map(msg => 
  `${msg.type === 'inbound' ? 'Lead' : 'Você'}: ${msg.message}`
).join('\n') || 'Nenhum histórico disponível'}

DIRETRIZES GERAIS:
- Seja profissional mas amigável
- Responda de forma útil e relevante
- Mantenha respostas concisas (máximo 2-3 frases)
- Não mencione que você é um bot
- Foque em ajudar o lead com sua necessidade
- Se apropriado, faça uma pergunta para continuar a conversa

MENSAGEM RECEBIDA: "${inbound_message}"

Responda de forma natural e útil:`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: inbound_message }
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const replyMessage = aiResponse.choices[0].message.content;

    console.log('Generated auto-reply:', replyMessage);

    // Wait for delay before sending (if configured)
    if (settings.auto_reply_delay_minutes > 0) {
      await new Promise(resolve => 
        setTimeout(resolve, settings.auto_reply_delay_minutes * 60 * 1000)
      );
    }

    // Send reply via Evolution API
    const sendResponse = await fetch(`${evolutionApiUrl}/message/sendText/${instance_name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey,
      },
      body: JSON.stringify({
        number: phone_number,
        text: replyMessage,
      }),
    });

    let sendResult = null;
    let sendError = null;

    try {
      sendResult = await sendResponse.json();
      if (!sendResponse.ok) {
        sendError = `Evolution API error: ${sendResponse.status} - ${JSON.stringify(sendResult)}`;
      }
    } catch (e) {
      sendError = `Failed to parse Evolution API response: ${e.message}`;
    }

    // Record the auto-reply communication
    const { error: commError } = await supabase
      .from('communications')
      .insert({
        lead_id: lead.id,
        user_id: lead.user_id,
        organization_id: lead.organization_id,
        type: 'auto_reply',
        channel: 'whatsapp',
        message: replyMessage,
        metadata: {
          instance_name,
          phone_number,
          inbound_message,
          persona_used: persona?.name,
          delay_minutes: settings.auto_reply_delay_minutes,
          send_result: sendResult,
          send_error: sendError
        },
        status: sendError ? 'failed' : 'sent'
      });

    if (commError) throw commError;

    // Update lead's last_contacted_at
    const { error: updateError } = await supabase
      .from('leads')
      .update({ last_contacted_at: new Date().toISOString() })
      .eq('id', lead_id);

    if (updateError) console.error('Failed to update lead last_contacted_at:', updateError);

    if (sendError) {
      console.error('Failed to send auto-reply:', sendError);
      return new Response(JSON.stringify({ 
        success: false,
        error: sendError,
        reply_generated: true,
        reply_message: replyMessage
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      reply_sent: true,
      reply_message: replyMessage,
      lead_id,
      send_result: sendResult
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-auto-reply function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});