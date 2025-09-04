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
  message_sequence?: number;
  total_messages?: number;
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

    const body: SendRequest & { instanceName?: string; organizationId?: string } = await req.json();
    const batchSize = body.batchSize || 10;
    const delayMs = body.delayMs || 2000; // 2 second delay between messages
    
    console.log(`Starting WhatsApp sending for run ${body.runId}`);

    // Get the run and its organization_id
    const { data: runData, error: runError } = await supabaseClient
      .from('followup_runs')
      .select('organization_id')
      .eq('id', body.runId)
      .single();

    if (runError || !runData) {
      console.error('Run not found:', body.runId);
      return new Response(
        JSON.stringify({ error: 'Run not found', code: 'RUN_NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const organizationId = runData.organization_id;

    // Validate user belongs to this organization
    const { data: membershipData } = await supabaseClient
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single();

    if (!membershipData) {
      console.error('User not authorized for organization:', organizationId);
      return new Response(
        JSON.stringify({ error: 'User not authorized for this organization', code: 'UNAUTHORIZED_ORG' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve Evolution API settings and instance name by priority:
    // 1. instanceName from body (if passed)
    // 2. evolution_settings.default_instance_name for organization
    // 3. First connected whatsapp instance for organization
    // 4. Fallback to environment secrets
    
    let evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
    let evolutionInstanceName = body.instanceName; // Priority to passed instanceName

    console.log(`Instance name resolution - body.instanceName: ${body.instanceName}, organizationId: ${organizationId}`);

    // Try to get organization-specific settings
    const { data: evolutionSettings } = await supabaseClient
      .from('evolution_settings')
      .select('evolution_api_url, default_instance_name')
      .eq('organization_id', organizationId)
      .single();

    if (evolutionSettings) {
      if (evolutionSettings.evolution_api_url) {
        evolutionApiUrl = evolutionSettings.evolution_api_url;
      }
      if (!evolutionInstanceName && evolutionSettings.default_instance_name) {
        evolutionInstanceName = evolutionSettings.default_instance_name;
        console.log(`Using default_instance_name from evolution_settings: ${evolutionInstanceName}`);
      }
    }

    // If still no instance name, try to get the first connected instance for this organization
    if (!evolutionInstanceName) {
      const { data: connectedInstance } = await supabaseClient
        .from('whatsapp_instances')
        .select('name')
        .eq('organization_id', organizationId)
        .in('last_status', ['open', 'connected'])
        .limit(1)
        .single();

      if (connectedInstance) {
        evolutionInstanceName = connectedInstance.name;
        console.log(`Using connected instance from DB: ${evolutionInstanceName}`);
      }
    }

    // Final fallback to environment secret (but this should be avoided)
    if (!evolutionInstanceName) {
      evolutionInstanceName = Deno.env.get('EVOLUTION_INSTANCE_NAME');
      console.log(`Falling back to EVOLUTION_INSTANCE_NAME: ${evolutionInstanceName}`);
    }

    if (!evolutionApiUrl || !evolutionApiKey || !evolutionInstanceName) {
      console.log('Evolution API not fully configured, running in simulation mode');
    } else {
      // Normalize instance name to lowercase for Evolution API compatibility
      evolutionInstanceName = evolutionInstanceName.toLowerCase();
      
      // Pre-check if instance exists and is connected via Evolution API
      try {
        console.log(`Checking instance '${evolutionInstanceName}' status...`);
        const instanceCheckResponse = await fetch(`${evolutionApiUrl}/instance/fetchInstances`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': evolutionApiKey,
          },
        });

        if (instanceCheckResponse.ok) {
          const instancesData = await instanceCheckResponse.json();
          const instances = Array.isArray(instancesData) ? instancesData : [];
          
          // Log all instances for debugging
          console.log(`Evolution API returned ${instances.length} instances:`, 
            instances.map(inst => {
              const name1 = inst.instance?.instanceName;
              const name2 = inst.instanceName; 
              const name3 = inst.name;
              const status = inst.instance?.connectionStatus || inst.connectionStatus || inst.status;
              return { name1, name2, name3, status };
            })
          );
          
          // Find the instance - try multiple field patterns
          const targetInstance = instances.find(instance => {
            const instanceName1 = instance.instance?.instanceName?.toLowerCase();
            const instanceName2 = instance.instanceName?.toLowerCase();
            const instanceName3 = instance.name?.toLowerCase();
            
            const match = instanceName1 === evolutionInstanceName || 
                         instanceName2 === evolutionInstanceName || 
                         instanceName3 === evolutionInstanceName;
            
            if (match) {
              const usedField = instanceName1 === evolutionInstanceName ? 'instance.instanceName' :
                               instanceName2 === evolutionInstanceName ? 'instanceName' : 'name';
              console.log(`Instance matched using field: ${usedField}`);
            }
            
            return match;
          });
          
          if (!targetInstance) {
            console.error(`Instance '${evolutionInstanceName}' not found in Evolution API`);
            
            // Auto-fallback: try to find any connected instance for this organization
            const connectedInstance = instances.find(instance => {
              const status1 = instance.instance?.connectionStatus;
              const status2 = instance.connectionStatus;
              const status3 = instance.status;
              
              return status1 === 'open' || status1 === 'connecting' ||
                     status2 === 'open' || status2 === 'connecting' ||
                     status3 === 'open' || status3 === 'connecting';
            });
            
            if (connectedInstance) {
              const fallbackName = connectedInstance.instance?.instanceName || 
                                  connectedInstance.instanceName || 
                                  connectedInstance.name;
              
              if (fallbackName) {
                console.log(`Auto-fallback: Using connected instance '${fallbackName}' instead of '${evolutionInstanceName}'`);
                evolutionInstanceName = fallbackName.toLowerCase();
                
                // Update the database record to reflect the correct instance name
                await supabaseClient
                  .from('whatsapp_instances')
                  .update({ name: evolutionInstanceName })
                  .eq('organization_id', organizationId);
              } else {
                return new Response(
                  JSON.stringify({ 
                    error: `Instância '${evolutionInstanceName}' não encontrada e nenhuma instância conectada disponível. Conecte sua instância WhatsApp primeiro.`,
                    code: 'INSTANCE_NOT_FOUND',
                    instanceName: evolutionInstanceName,
                    availableInstances: instances.map(inst => ({
                      instance_name: inst.instance?.instanceName || inst.instanceName || inst.name,
                      status: inst.instance?.connectionStatus || inst.connectionStatus || inst.status
                    }))
                  }),
                  { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
            } else {
              return new Response(
                JSON.stringify({ 
                  error: `Instância '${evolutionInstanceName}' não encontrada e nenhuma instância conectada disponível. Conecte sua instância WhatsApp primeiro.`,
                  code: 'INSTANCE_NOT_FOUND',
                  instanceName: evolutionInstanceName,
                  availableInstances: instances.map(inst => ({
                    instance_name: inst.instance?.instanceName || inst.instanceName || inst.name,
                    status: inst.instance?.connectionStatus || inst.connectionStatus || inst.status
                  }))
                }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }

          // Check if instance is connected - try multiple status fields
          const instanceStatus = targetInstance.instance?.connectionStatus || 
                                 targetInstance.connectionStatus || 
                                 targetInstance.status;
          
          const normalizedStatus = instanceStatus?.toLowerCase();
          const validStatuses = ['open', 'connected', 'connecting'];
          
          if (!validStatuses.includes(normalizedStatus)) {
            console.error(`Instance '${evolutionInstanceName}' is not connected. Status: ${instanceStatus}`);
            return new Response(
              JSON.stringify({ 
                error: `Instância '${evolutionInstanceName}' não está conectada. Status: ${instanceStatus}. Conecte primeiro.`,
                code: 'INSTANCE_NOT_CONNECTED',
                instanceName: evolutionInstanceName,
                currentStatus: instanceStatus
              }),
              { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          console.log(`Instance '${evolutionInstanceName}' is ready. Status: ${instanceStatus}`);
        } else {
          const errorText = await instanceCheckResponse.text();
          console.warn(`Could not check instance status: ${errorText}. Proceeding with send attempt...`);
        }
      } catch (checkError) {
        console.warn(`Could not pre-check instance: ${checkError.message}. Proceeding with send attempt...`);
      }
    }

    // Get pending items for this run (fetch items and leads separately to avoid foreign key constraint)
    const { data: items, error: itemsError } = await supabaseClient
      .from('followup_run_items')
      .select(`
        id,
        lead_id,
        message,
        message_sequence,
        total_messages
      `)
      .eq('run_id', body.runId)
      .eq('status', 'pending')
      .order('lead_id')
      .order('message_sequence')
      .limit(batchSize * 3); // Allow for multiple messages per lead

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

    // Get lead details for the items
    const leadIds = [...new Set(items.map(item => item.lead_id))];
    const { data: leads, error: leadsError } = await supabaseClient
      .from('leads')
      .select('id, name, phone, normalized_phone')
      .in('id', leadIds);

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch lead details' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a lookup map for leads
    const leadsMap = new Map(leads?.map(lead => [lead.id, lead]) || []);

    console.log(`Processing ${items.length} messages`);

    let sentCount = 0;
    let failedCount = 0;

    // Group messages by lead_id for sequential sending
    const messagesByLead = new Map<string, FollowupItem[]>();
    items.forEach(item => {
      if (!messagesByLead.has(item.lead_id)) {
        messagesByLead.set(item.lead_id, []);
      }
      messagesByLead.get(item.lead_id)!.push(item);
    });

    console.log(`Processing messages for ${messagesByLead.size} leads`);

    // Process each lead's messages sequentially
    for (const [leadId, leadMessages] of messagesByLead) {
      console.log(`Processing ${leadMessages.length} messages for lead ${leadId}`);
      
      // Sort messages by sequence to ensure correct order
      leadMessages.sort((a, b) => (a.message_sequence || 1) - (b.message_sequence || 1));

      for (const item of leadMessages) {
        try {
          const lead = leadsMap.get(item.lead_id);
          if (!lead) {
            console.error(`Lead not found for item ${item.id}`);
            continue;
          }
          
          const phone = lead.normalized_phone || lead.phone.replace(/\D/g, '');
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
                console.log(`Message ${item.message_sequence || 1}/${item.total_messages || 1} sent successfully to ${whatsappNumber}`);
              } else {
                const errorData = await evolutionResponse.text();
                let parsedError;
                try {
                  parsedError = JSON.parse(errorData);
                } catch {
                  parsedError = { message: errorData };
                }
                
                // Enhanced error parsing - check nested error structures
                let errorMessage = parsedError.message || parsedError.error?.message || parsedError.error || errorData;
                
                // Check for specific error cases
                if (errorMessage && (
                  errorMessage.includes('does not exist') || 
                  errorMessage.includes('not found') ||
                  errorMessage.includes('não existe') ||
                  errorMessage.includes('não encontrada')
                )) {
                  sendResult = { 
                    success: false, 
                    error: `Instância '${evolutionInstanceName}' não encontrada. Conecte sua instância WhatsApp primeiro.`, 
                    code: 'INSTANCE_NOT_FOUND' 
                  };
                } else if (errorMessage && (
                  errorMessage.includes('not connected') ||
                  errorMessage.includes('disconnected') ||
                  errorMessage.includes('não conectada') ||
                  errorMessage.includes('desconectada')
                )) {
                  sendResult = { 
                    success: false, 
                    error: `Instância '${evolutionInstanceName}' não está conectada. Conecte primeiro.`, 
                    code: 'INSTANCE_NOT_CONNECTED' 
                  };
                } else {
                  sendResult = { success: false, error: `Evolution API error: ${errorMessage}` };
                }
                console.error(`Failed to send message ${item.message_sequence || 1} to ${whatsappNumber}:`, parsedError);
              }
            } catch (evolutionError) {
              sendResult = { success: false, error: `Evolution API request failed: ${evolutionError.message}` };
              console.error('Evolution API request error:', evolutionError);
            }
          } else {
            // Simulation mode - mark as sent
            sendResult = { success: true };
            console.log(`[SIMULATION] Would send message ${item.message_sequence || 1}/${item.total_messages || 1} to ${whatsappNumber}: ${item.message.substring(0, 50)}...`);
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
                organization_id: organizationId,
                lead_id: item.lead_id,
                type: 'follow_up',
                channel: 'whatsapp',
                message: item.message,
                status: 'sent',
                metadata: { 
                  run_id: body.runId, 
                  phone: whatsappNumber,
                  message_sequence: item.message_sequence || 1,
                  total_messages: item.total_messages || 1,
                  instance_name: evolutionInstanceName
                }
              });

            sentCount++;
          } else {
            failedCount++;
          }

          // Add delay between messages within the same lead sequence  
          if (leadMessages.indexOf(item) < leadMessages.length - 1) {
            console.log(`Waiting ${delayMs}ms before next message in sequence...`);
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

      // Update lead's last_contacted_at after all messages are sent for this lead
      const successfulMessages = leadMessages.filter(msg => sentCount > 0);
      if (successfulMessages.length > 0) {
        await supabaseClient
          .from('leads')
          .update({ last_contacted_at: new Date().toISOString() })
          .eq('id', leadId);
      }

      // Add delay between different leads to avoid rate limiting
      const leadIds = Array.from(messagesByLead.keys());
      if (leadIds.indexOf(leadId) < leadIds.length - 1) {
        console.log(`Waiting ${Math.min(delayMs, 1000)}ms before next lead...`);
        await new Promise(resolve => setTimeout(resolve, Math.min(delayMs, 1000)));
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