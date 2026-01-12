import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate webhook token for security
    const webhookToken = req.headers.get('x-webhook-token');
    const expectedToken = Deno.env.get('WEBHOOK_SHARED_TOKEN');
    
    if (!expectedToken) {
      console.error('WEBHOOK_SHARED_TOKEN not configured');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (webhookToken !== expectedToken) {
      console.error('Invalid webhook token provided');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Received webhook request');
    
    const body = await req.json();
    console.log('Webhook body:', JSON.stringify(body, null, 2));

    // Extract message data based on Evolution API format
    const { 
      instance_name,
      data: {
        key: messageKey,
        message: messageData,
        pushName,
        participant
      } = {}
    } = body;

    if (!messageData || messageData.messageType !== 'conversation') {
      console.log('Ignoring non-text message');
      return new Response(JSON.stringify({ success: true, ignored: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const phoneNumber = messageKey?.remoteJid?.replace('@s.whatsapp.net', '');
    const messageText = messageData.conversation;

    if (!phoneNumber || !messageText) {
      throw new Error('Missing required message data');
    }

    console.log(`Processing message from ${phoneNumber}: ${messageText}`);

    // Find lead by phone number
    const { data: leads, error: leadError } = await supabase
      .from('leads')
      .select(`
        id, name, business, user_id, organization_id,
        whatsapp_number, phone, normalized_phone
      `)
      .or(`whatsapp_number.eq.${phoneNumber},phone.eq.${phoneNumber},normalized_phone.eq.${phoneNumber}`)
      .limit(1);

    if (leadError) throw leadError;

    let lead = leads?.[0];
    let isNewLead = false;

    // If no lead found, create a new one
    if (!lead) {
      console.log('Creating new lead from inbound message');
      
      // Get WhatsApp instance to find organization
      const { data: whatsappInstance, error: instanceError } = await supabase
        .from('whatsapp_instances')
        .select('user_id, organization_id, name')
        .eq('evolution_instance_id', instance_name)
        .single();

      if (instanceError) throw instanceError;

      const { data: newLead, error: createError } = await supabase
        .from('leads')
        .insert({
          name: pushName || `Contato ${phoneNumber}`,
          business: `Negócio do ${pushName || phoneNumber}`,
          city: 'Não informado',
          phone: phoneNumber,
          whatsapp_number: phoneNumber,
          normalized_phone: phoneNumber.replace(/\D/g, ''),
          status: 'novo',
          source: 'whatsapp_inbound',
          score: 5,
          user_id: whatsappInstance.user_id,
          organization_id: whatsappInstance.organization_id
        })
        .select()
        .single();

      if (createError) throw createError;
      lead = newLead;
      isNewLead = true;
    }

    // Record the inbound communication
    const { error: commError } = await supabase
      .from('communications')
      .insert({
        lead_id: lead.id,
        user_id: lead.user_id,
        organization_id: lead.organization_id,
        type: 'inbound',
        channel: 'whatsapp',
        message: messageText,
        metadata: {
          instance_name,
          message_key: messageKey,
          push_name: pushName,
          is_new_lead: isNewLead
        },
        status: 'received'
      });

    if (commError) throw commError;

    // Trigger auto-reply if enabled
    try {
      const autoReplyResponse = await supabase.functions.invoke('ai-auto-reply', {
        body: {
          lead_id: lead.id,
          inbound_message: messageText,
          instance_name,
          phone_number: phoneNumber
        }
      });
      
      console.log('Auto-reply triggered:', autoReplyResponse);
    } catch (autoReplyError) {
      console.error('Failed to trigger auto-reply:', autoReplyError);
      // Don't fail the main request if auto-reply fails
    }

    return new Response(JSON.stringify({ 
      success: true,
      lead_id: lead.id,
      is_new_lead: isNewLead,
      message: 'Inbound message processed successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing inbound message:', error);
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});