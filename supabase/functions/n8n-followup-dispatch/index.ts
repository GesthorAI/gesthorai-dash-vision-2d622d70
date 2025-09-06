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
    // Create authenticated Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const n8nWebhookUrl = Deno.env.get('N8N_FOLLOWUP_WEBHOOK_URL')!;
    const webhookToken = Deno.env.get('WEBHOOK_SHARED_TOKEN')!;
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionInstanceName = Deno.env.get('EVOLUTION_INSTANCE_NAME');
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');

    const { runId, organizationId, templateId, filters, personaConfig } = await req.json();

    console.log('=== N8N FOLLOWUP DISPATCH STARTED ===');
    console.log('📋 Request payload:', { 
      runId, 
      templateId, 
      hasFilters: Object.keys(filters || {}).length > 0,
      hasPersonaConfig: !!personaConfig,
      filtersKeys: Object.keys(filters || {})
    });
    console.log('🔗 N8N Webhook URL:', n8nWebhookUrl);
    console.log('🔐 Using webhook token:', webhookToken ? 'Yes' : 'No');
    console.log('📡 Evolution API URL:', evolutionApiUrl ? 'SET' : 'MISSING');
    console.log('🏷️ Evolution Instance:', evolutionInstanceName ? 'SET' : 'MISSING');
    console.log('🔑 Evolution API Key:', evolutionApiKey ? 'SET' : 'MISSING');

    // Get the followup run details and validate organization membership
    const { data: run, error: runError } = await supabase
      .from('followup_runs')
      .select('*, organization_id')
      .eq('id', runId)
      .single();

    if (runError) {
      console.error('❌ Error fetching run:', runError);
      throw new Error(`Failed to fetch run: ${runError.message}`);
    }

    // Validate user belongs to this organization
    const { data: membershipData } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('organization_id', run.organization_id)
      .single();

    if (!membershipData) {
      console.error('User not authorized for organization:', run.organization_id);
      return new Response(
        JSON.stringify({ error: 'User not authorized for this organization' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Retrieved followup run:', { 
      id: run.id, 
      name: run.name, 
      status: run.status, 
      userId: run.user_id,
      hasTemplateId: !!run.template_id,
      currentTotalLeads: run.total_leads || 0
    });

    // Validate required parameters
    if (!templateId && !run.template_id) {
      console.error('❌ Missing templateId in request and run');
      return new Response(JSON.stringify({ 
        error: 'Template ID is required for n8n dispatch',
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use templateId from request or fallback to run's template_id
    const finalTemplateId = templateId || run.template_id;

    // Get template details - ensure it belongs to the same organization
    const { data: template, error: templateError } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', finalTemplateId)
      .eq('organization_id', run.organization_id)
      .maybeSingle();

    if (templateError) {
      console.error('❌ Error fetching template:', templateError);
      throw new Error(`Failed to fetch template: ${templateError.message}`);
    }

    if (!template) {
      console.error('❌ Template not found:', finalTemplateId);
      return new Response(JSON.stringify({ 
        error: `Template with ID ${finalTemplateId} not found`,
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Retrieved template:', { 
      id: template.id, 
      name: template.name, 
      category: template.category,
      variablesCount: template.variables?.length || 0,
      messageLength: template.message?.length || 0,
      variables: template.variables || []
    });

    // Build filter query for leads - filter by organization instead of user
    let query = supabase
      .from('leads')
      .select('id, name, business, phone, city, niche, score, whatsapp_number')
      .eq('organization_id', run.organization_id)
      .is('archived_at', null);

    // Apply filters
    if (filters) {
      if (filters.search_id) {
        query = query.eq('search_id', filters.search_id);
      }
      if (filters.niche) {
        query = query.ilike('niche', `%${filters.niche}%`);
      }
      if (filters.city) {
        query = query.ilike('city', `%${filters.city}%`);
      }
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
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
    }

    const { data: leads, error: leadsError } = await query;

    if (leadsError) {
      console.error('❌ Error fetching leads:', leadsError);
      throw new Error(`Failed to fetch leads: ${leadsError.message}`);
    }

    console.log(`✅ Found ${leads?.length || 0} leads matching filters:`, {
      appliedFilters: {
        niche: filters.niche || 'Any',
        city: filters.city || 'Any',
        status: filters.status || 'Any',
        minScore: filters.minScore || 'No minimum',
        maxDaysOld: filters.maxDaysOld || 'No limit',
        excludeContacted: filters.excludeContacted || false
      },
      leadsSample: leads?.slice(0, 3).map(l => ({ 
        id: l.id, 
        name: l.name, 
        business: l.business,
        hasWhatsApp: !!l.whatsapp_number 
      })) || []
    });

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
      console.error('❌ Error updating run status:', updateError);
    } else {
      console.log('✅ Updated run status to "sending"', {
        runId,
        totalLeads: leads?.length || 0,
        startedAt: new Date().toISOString()
      });
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
      persona: personaConfig || {
        name: 'Assistente',
        systemPrompt: 'Você é um especialista em follow-up consultivo.',
        useJinaAI: false,
        messageDelay: 3
      },
      leads: leads || [],
      webhookCallbackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/webhook-followup-status`,
      webhookToken: webhookToken,
      URL_EvolutionAPI: evolutionApiUrl,
      Nome_Instancia_EvolutionAPI: evolutionInstanceName,
      Api_Key_EvolutionAPI: evolutionApiKey,
      metadata: {
        dispatchedAt: new Date().toISOString(),
        totalLeads: leads?.length || 0,
        filters
      }
    };

    // Send to n8n webhook
    console.log('🚀 Sending payload to n8n webhook:', n8nWebhookUrl);
    console.log('📦 Payload summary:', {
      payloadSizeBytes: JSON.stringify(n8nPayload).length,
      leadsCount: leads?.length || 0,
      templateVariables: template.variables?.length || 0,
      hasPersonaConfig: !!personaConfig,
      personaName: personaConfig?.name || n8nPayload.persona.name,
      messageDelay: personaConfig?.messageDelay || n8nPayload.persona.messageDelay
    });
    
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
      console.error('❌ N8N webhook error:', {
        status: n8nResponse.status,
        statusText: n8nResponse.statusText,
        error: errorText,
        url: n8nWebhookUrl
      });
      throw new Error(`N8N webhook failed: ${n8nResponse.status} - ${errorText}`);
    }

    const n8nResult = await n8nResponse.json();
    console.log('✅ N8N webhook success:', {
      httpStatus: n8nResponse.status,
      workflowId: n8nResult.workflowId || 'Unknown',
      executionId: n8nResult.executionId || 'Unknown', 
      message: n8nResult.message || 'No message',
      responseSize: JSON.stringify(n8nResult).length,
      processingStarted: !!n8nResult.processingStarted
    });

    console.log('=== N8N FOLLOWUP DISPATCH COMPLETED ===');
    console.log('Final result:', {
      runId,
      totalLeads: leads?.length || 0,
      n8nWorkflowId: n8nResult.workflowId || null,
      dispatchedAt: new Date().toISOString()
    });

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
    console.error('❌ N8N FOLLOWUP DISPATCH FAILED ===');
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});