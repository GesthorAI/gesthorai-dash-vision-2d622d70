import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookToken = Deno.env.get('WEBHOOK_SHARED_TOKEN')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify webhook token
    const authHeader = req.headers.get('Authorization');
    const providedToken = authHeader?.replace('Bearer ', '');
    
    if (providedToken !== webhookToken) {
      console.error('Invalid webhook token provided');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.json();
    console.log('📨 Received webhook from n8n:', {
      runId: payload.runId,
      status: payload.status,
      resultsCount: payload.results?.length || 0,
      hasTotals: !!(payload.totalSent || payload.totalFailed),
      payloadSize: JSON.stringify(payload).length
    });
    
    // Log full payload only in development/debug mode
    if (payload.debug) {
      console.log('🔍 Full payload debug:', JSON.stringify(payload, null, 2));
    }

    const { runId, status, results, totalSent, totalFailed, error } = payload;

    if (!runId) {
      throw new Error('runId is required');
    }

    // Update followup run status
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (status === 'completed') {
      updateData.status = 'completed';
      updateData.completed_at = new Date().toISOString();
      updateData.sent_count = totalSent || 0;
      updateData.failed_count = totalFailed || 0;
    } else if (status === 'failed') {
      updateData.status = 'failed';
    } else if (status === 'processing') {
      updateData.status = 'sending';
    }

    const { error: updateError } = await supabase
      .from('followup_runs')
      .update(updateData)
      .eq('id', runId);

    if (updateError) {
      console.error('Error updating run:', updateError);
      throw updateError;
    }

    // Process individual results if provided
    if (results && Array.isArray(results)) {
      console.log(`📋 Processing ${results.length} individual results:`, {
        statusBreakdown: results.reduce((acc, r) => {
          acc[r.status] = (acc[r.status] || 0) + 1;
          return acc;
        }, {}),
        hasMessages: results.filter(r => r.message).length,
        hasErrors: results.filter(r => r.errorMessage).length
      });

      for (const result of results) {
        const { leadId, status: itemStatus, message, errorMessage, sentAt } = result;

        if (!leadId) continue;

        // Create or update followup run item
        const itemData = {
          run_id: runId,
          lead_id: leadId,
          status: itemStatus,
          message: message || '',
          error_message: errorMessage || null,
          sent_at: sentAt ? new Date(sentAt).toISOString() : null,
          updated_at: new Date().toISOString()
        };

        const { error: itemError } = await supabase
          .from('followup_run_items')
          .upsert(itemData, { 
            onConflict: 'run_id,lead_id' 
          });

        if (itemError) {
          console.error(`❌ Error updating item for lead ${leadId}:`, itemError);
        } else {
          console.log(`✅ Updated item for lead ${leadId}:`, { status: itemStatus, hasMessage: !!message });
        }

        // Create communication record if message was sent
        if (itemStatus === 'sent') {
          // Get the user_id from the run
          const { data: run } = await supabase
            .from('followup_runs')
            .select('user_id')
            .eq('id', runId)
            .single();

          if (run) {
            const { error: commError } = await supabase
              .from('communications')
              .insert({
                user_id: run.user_id,
                lead_id: leadId,
                type: 'followup',
                channel: 'whatsapp',
                message: message || '',
                status: 'sent',
                metadata: {
                  runId,
                  source: 'n8n',
                  sentAt: sentAt || new Date().toISOString()
                }
              });

            if (commError) {
              console.error(`Error creating communication for lead ${leadId}:`, commError);
            }

            // Update lead's last_contacted_at and status to "contatado" if applicable
            const { error: leadUpdateError } = await supabase
              .from('leads')
              .update({ 
                last_contacted_at: new Date().toISOString(),
                status: 'contatado'
              })
              .eq('id', leadId)
              .in('status', ['novo', 'contatado']); // Only update if current status allows it

            if (leadUpdateError) {
              console.error(`Error updating lead contact time and status ${leadId}:`, leadUpdateError);
            }
          }
        }
      }
    }

    console.log(`✅ Successfully processed webhook for run ${runId}:`, {
      finalStatus: status,
      resultsProcessed: results?.length || 0,
      totalSent: totalSent || 0,
      totalFailed: totalFailed || 0,
      communicationsCreated: results?.filter(r => r.status === 'sent').length || 0
    });

    return new Response(JSON.stringify({
      success: true,
      runId,
      processedResults: results?.length || 0,
      message: 'Webhook processed successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in webhook-followup-status:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});