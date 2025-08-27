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
    const n8nWebhookUrl = Deno.env.get('N8N_FOLLOWUP_WEBHOOK_URL')!;
    const webhookToken = Deno.env.get('WEBHOOK_SHARED_TOKEN')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { runId, templateId, filters } = await req.json();

    console.log('Dispatching to n8n:', { runId, templateId, filters });

    // Get the followup run details
    const { data: run, error: runError } = await supabase
      .from('followup_runs')
      .select('*')
      .eq('id', runId)
      .single();

    if (runError) {
      console.error('Error fetching run:', runError);
      throw new Error(`Failed to fetch run: ${runError.message}`);
    }

    // Get template details
    const { data: template, error: templateError } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError) {
      console.error('Error fetching template:', templateError);
      throw new Error(`Failed to fetch template: ${templateError.message}`);
    }

    // Build filter query for leads
    let query = supabase
      .from('leads')
      .select('id, name, business, phone, city, niche, score, whatsapp_number')
      .eq('user_id', run.user_id)
      .is('archived_at', null);

    // Apply filters
    if (filters.niche) {
      query = query.ilike('niche', `%${filters.niche}%`);
    }
    if (filters.city) {
      query = query.ilike('city', `%${filters.city}%`);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.minScore) {
      query = query.gte('score', filters.minScore);
    }
    if (filters.maxDaysOld) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - filters.maxDaysOld);
      query = query.gte('created_at', cutoffDate.toISOString());
    }
    if (filters.excludeContacted) {
      query = query.is('last_contacted_at', null);
    }

    const { data: leads, error: leadsError } = await query;

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      throw new Error(`Failed to fetch leads: ${leadsError.message}`);
    }

    console.log(`Found ${leads?.length || 0} leads for n8n dispatch`);

    // Update run status to sending
    const { error: updateError } = await supabase
      .from('followup_runs')
      .update({ 
        status: 'sending',
        started_at: new Date().toISOString(),
        total_leads: leads?.length || 0 
      })
      .eq('id', runId);

    if (updateError) {
      console.error('Error updating run status:', updateError);
    }

    // Prepare payload for n8n
    const n8nPayload = {
      runId,
      runName: run.name,
      template: {
        id: template.id,
        name: template.name,
        message: template.message,
        variables: template.variables
      },
      leads: leads || [],
      webhookCallbackUrl: `${supabaseUrl}/functions/v1/webhook-followup-status`,
      webhookToken: webhookToken,
      metadata: {
        dispatchedAt: new Date().toISOString(),
        totalLeads: leads?.length || 0,
        filters
      }
    };

    // Send to n8n webhook
    console.log('Sending to n8n webhook:', n8nWebhookUrl);
    
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${webhookToken}`
      },
      body: JSON.stringify(n8nPayload)
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error('N8N webhook error:', errorText);
      throw new Error(`N8N webhook failed: ${n8nResponse.status} - ${errorText}`);
    }

    const n8nResult = await n8nResponse.json();
    console.log('N8N response:', n8nResult);

    return new Response(JSON.stringify({
      success: true,
      runId,
      totalLeads: leads?.length || 0,
      n8nWorkflowId: n8nResult.workflowId || null,
      message: 'Follow-up dispatched to n8n successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in n8n-followup-dispatch:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});