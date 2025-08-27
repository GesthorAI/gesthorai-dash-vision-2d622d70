import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendRequest {
  runId: string;
  batchSize?: number;
  delayMs?: number;
}

interface FollowupItem {
  id: string;
  lead_id: string;
  message: string;
  lead: {
    name: string;
    phone: string;
    normalized_phone: string;
  };
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

    const body: SendRequest = await req.json();
    const batchSize = body.batchSize || 10;
    const delayMs = body.delayMs || 2000; // 2 second delay between messages
    
    console.log(`Starting WhatsApp sending for run ${body.runId}`);

    // Get Evolution API credentials
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
    const evolutionInstanceName = Deno.env.get('EVOLUTION_INSTANCE_NAME');

    if (!evolutionApiUrl || !evolutionApiKey || !evolutionInstanceName) {
      console.log('Evolution API not configured, running in simulation mode');
    }

    // Get pending items for this run
    const { data: items, error: itemsError } = await supabaseClient
      .from('followup_run_items')
      .select(`
        id,
        lead_id,
        message,
        leads!inner(name, phone, normalized_phone)
      `)
      .eq('run_id', body.runId)
      .eq('status', 'pending')
      .limit(batchSize);

    if (itemsError) {
      console.error('Error fetching run items:', itemsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch run items' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending items to send' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${items.length} messages`);

    let sentCount = 0;
    let failedCount = 0;

    // Process each item with delay
    for (const item of items) {
      try {
        const phone = item.leads.normalized_phone || item.leads.phone.replace(/\D/g, '');
        const whatsappNumber = phone.startsWith('55') ? phone : `55${phone}`;

        let sendResult = { success: false, error: 'Simulation mode' };

        // Send via Evolution API if configured
        if (evolutionApiUrl && evolutionApiKey && evolutionInstanceName) {
          try {
            const evolutionResponse = await fetch(`${evolutionApiUrl}/message/sendText/${evolutionInstanceName}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': evolutionApiKey,
              },
              body: JSON.stringify({
                number: whatsappNumber,
                text: item.message,
                delay: 1000,
                quoted: {
                  key: {
                    remoteJid: `${whatsappNumber}@s.whatsapp.net`,
                    fromMe: false,
                    id: 'message_id'
                  }
                }
              }),
            });

            if (evolutionResponse.ok) {
              sendResult = { success: true };
              console.log(`Message sent successfully to ${whatsappNumber}`);
            } else {
              const errorData = await evolutionResponse.text();
              sendResult = { success: false, error: `Evolution API error: ${errorData}` };
              console.error(`Failed to send to ${whatsappNumber}:`, errorData);
            }
          } catch (evolutionError) {
            sendResult = { success: false, error: `Evolution API request failed: ${evolutionError.message}` };
            console.error('Evolution API request error:', evolutionError);
          }
        } else {
          // Simulation mode - mark as sent
          sendResult = { success: true };
          console.log(`[SIMULATION] Would send to ${whatsappNumber}: ${item.message.substring(0, 50)}...`);
        }

        // Update item status
        const updateData = {
          status: sendResult.success ? 'sent' : 'failed',
          sent_at: sendResult.success ? new Date().toISOString() : null,
          error_message: sendResult.success ? null : sendResult.error
        };

        await supabaseClient
          .from('followup_run_items')
          .update(updateData)
          .eq('id', item.id);

        // Log communication
        if (sendResult.success) {
          await supabaseClient
            .from('communications')
            .insert({
              user_id: user.id,
              lead_id: item.lead_id,
              type: 'follow_up',
              channel: 'whatsapp',
              message: item.message,
              status: 'sent',
              metadata: { run_id: body.runId, phone: whatsappNumber }
            });

          // Update lead's last_contacted_at
          await supabaseClient
            .from('leads')
            .update({ last_contacted_at: new Date().toISOString() })
            .eq('id', item.lead_id);

          sentCount++;
        } else {
          failedCount++;
        }

        // Add delay between messages (except for the last one)
        if (items.indexOf(item) < items.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }

      } catch (error) {
        console.error(`Error processing item ${item.id}:`, error);
        
        await supabaseClient
          .from('followup_run_items')
          .update({
            status: 'failed',
            error_message: error.message
          })
          .eq('id', item.id);

        failedCount++;
      }
    }

    // Update run counts
    const { data: currentRun } = await supabaseClient
      .from('followup_runs')
      .select('sent_count, failed_count, total_leads')
      .eq('id', body.runId)
      .single();

    const newSentCount = (currentRun?.sent_count || 0) + sentCount;
    const newFailedCount = (currentRun?.failed_count || 0) + failedCount;
    const totalLeads = currentRun?.total_leads || 0;

    const isCompleted = (newSentCount + newFailedCount) >= totalLeads;

    await supabaseClient
      .from('followup_runs')
      .update({
        sent_count: newSentCount,
        failed_count: newFailedCount,
        status: isCompleted ? 'completed' : 'sending',
        completed_at: isCompleted ? new Date().toISOString() : null
      })
      .eq('id', body.runId);

    console.log(`Completed batch: ${sentCount} sent, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sentCount,
        failedCount,
        isCompleted,
        totalSent: newSentCount,
        totalFailed: newFailedCount,
        totalLeads
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in followup-send-whatsapp function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});