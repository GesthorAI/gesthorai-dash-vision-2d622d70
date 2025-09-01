
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EvolutionInstanceRequest {
  action: 'create' | 'connect' | 'status' | 'qrcode' | 'disconnect' | 'list';
  instanceName?: string;
}

interface EvolutionResponse {
  success: boolean;
  data?: any;
  error?: string;
  qrcode?: string;
  status?: string;
  instances?: any[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { action, instanceName } = await req.json() as EvolutionInstanceRequest;

    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
    const evolutionIntegration = Deno.env.get('EVOLUTION_INTEGRATION') || 'WHATSAPP-BAILEYS';
    const defaultInstanceName = Deno.env.get('EVOLUTION_INSTANCE_NAME');

    if (!evolutionApiUrl || !evolutionApiKey) {
      throw new Error('Evolution API configuration missing');
    }

    // Determine instance name priority: instanceName > defaultInstanceName > user-based fallback
    const targetInstanceName = (instanceName || defaultInstanceName || `instance_${user.id.slice(0, 8)}`).toLowerCase();

    console.log(`Evolution API action: ${action} for instance: ${targetInstanceName}`);

    let response: EvolutionResponse = { success: false };

    switch (action) {
      case 'list': {
        // Get user's instances from database
        const { data: instances, error: dbError } = await supabaseClient
          .from('whatsapp_instances')
          .select('*')
          .order('created_at', { ascending: false });

        if (dbError) {
          throw new Error(`Database error: ${dbError.message}`);
        }

        response = { success: true, instances: instances || [] };
        break;
      }

      case 'create': {
        if (!instanceName) {
          throw new Error('Nome da instância é obrigatório');
        }

        // Create new instance
        const createResponse = await fetch(`${evolutionApiUrl}/instance/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': evolutionApiKey,
          },
          body: JSON.stringify({
            instanceName: targetInstanceName,
            token: evolutionApiKey,
            integration: evolutionIntegration,
            qrcode: true,
          }),
        });

        const createData = await createResponse.json();
        console.log('Create instance response:', createData);
        
        if (createResponse.ok) {
          // Save instance to database
          const { error: dbError } = await supabaseClient
            .from('whatsapp_instances')
            .upsert({
              user_id: user.id,
              name: targetInstanceName,
              last_status: 'created',
              evolution_instance_id: createData.instance?.instanceName || targetInstanceName,
              metadata: { evolutionData: createData }
            }, {
              onConflict: 'user_id,name'
            });

          if (dbError) {
            console.error('Database save error:', dbError);
          }

          response = { success: true, data: createData };
        } else {
          // Handle nested arrays and extract meaningful error messages
          let errorMsg = 'Failed to create instance';
          
          if (createData.message) {
            if (Array.isArray(createData.message)) {
              // Flatten nested arrays and join messages
              const flatMessages = createData.message.flat(2).filter(msg => msg);
              errorMsg = flatMessages.length > 0 ? flatMessages.join(', ') : errorMsg;
            } else {
              errorMsg = createData.message;
            }
          }
          
          // Check for "already in use" messages
          if (errorMsg.includes('already in use') || 
              errorMsg.includes('already exists') || 
              errorMsg.includes('já está em uso') || 
              errorMsg.includes('já existe')) {
            response = { success: false, error: 'Este nome já está em uso na Evolution. Escolha outro nome.' };
          } else {
            response = { success: false, error: errorMsg };
          }
        }
        break;
      }

      case 'connect': {
        // Connect instance (generate QR code)
        const connectResponse = await fetch(`${evolutionApiUrl}/instance/connect/${targetInstanceName}`, {
          method: 'GET',
          headers: {
            'apikey': evolutionApiKey,
          },
        });

        const connectData = await connectResponse.json();
        console.log('Connect instance response:', connectData);
        
        if (connectResponse.ok) {
          // Update instance status in database
          await supabaseClient
            .from('whatsapp_instances')
            .upsert({
              user_id: user.id,
              name: targetInstanceName,
              last_status: 'connecting',
              metadata: { lastQrCode: connectData.base64 || connectData.qrcode }
            }, {
              onConflict: 'user_id,name'
            });

          response = { 
            success: true, 
            data: connectData,
            qrcode: connectData.base64 || connectData.qrcode
          };
        } else {
          const errorMsg = Array.isArray(connectData.message)
            ? connectData.message.join(', ')
            : connectData.message || 'Failed to connect instance';
          response = { success: false, error: errorMsg };
        }
        break;
      }

      case 'status': {
        // Get instance status
        const statusResponse = await fetch(`${evolutionApiUrl}/instance/fetchInstances`, {
          method: 'GET',
          headers: {
            'apikey': evolutionApiKey,
          },
        });

        const statusData = await statusResponse.json();
        console.log('Instance status response:', statusData);
        
        if (statusResponse.ok) {
          let instanceStatus;
          let connectionStatus = 'disconnected';

          // Handle different response formats from Evolution API
          if (Array.isArray(statusData)) {
            instanceStatus = statusData.find(instance => 
              instance.instance?.instanceName === targetInstanceName ||
              instance.instanceName === targetInstanceName
            );
          } else if (statusData.instance?.instanceName === targetInstanceName || statusData.instanceName === targetInstanceName) {
            instanceStatus = statusData;
          }

          if (instanceStatus) {
            // Extract connection status from different possible paths
            connectionStatus = instanceStatus.instance?.connectionStatus || 
                             instanceStatus.connectionStatus || 
                             instanceStatus.status || 
                             'disconnected';

            // Update database with latest status
            await supabaseClient
              .from('whatsapp_instances')
              .upsert({
                user_id: user.id,
                name: targetInstanceName,
                last_status: connectionStatus,
                number: instanceStatus.instance?.number || instanceStatus.number,
                owner_jid: instanceStatus.instance?.ownerJid || instanceStatus.ownerJid,
                profile_name: instanceStatus.instance?.profileName || instanceStatus.profileName,
                metadata: { evolutionData: instanceStatus }
              }, {
                onConflict: 'user_id,name'
              });
          }
          
          response = { 
            success: true, 
            data: instanceStatus,
            status: connectionStatus
          };
        } else {
          const errorMsg = Array.isArray(statusData.message)
            ? statusData.message.join(', ')
            : statusData.message || 'Failed to get instance status';
          response = { success: false, error: errorMsg };
        }
        break;
      }

      case 'qrcode': {
        // Get QR code
        const qrResponse = await fetch(`${evolutionApiUrl}/instance/connect/${targetInstanceName}`, {
          method: 'GET',
          headers: {
            'apikey': evolutionApiKey,
          },
        });

        const qrData = await qrResponse.json();
        console.log('QR code response:', qrData);
        
        if (qrResponse.ok) {
          // Update instance with new QR code
          await supabaseClient
            .from('whatsapp_instances')
            .upsert({
              user_id: user.id,
              name: targetInstanceName,
              last_status: 'qr_generated',
              metadata: { lastQrCode: qrData.base64 || qrData.qrcode }
            }, {
              onConflict: 'user_id,name'
            });

          response = { 
            success: true, 
            data: qrData,
            qrcode: qrData.base64 || qrData.qrcode
          };
        } else {
          const errorMsg = Array.isArray(qrData.message)
            ? qrData.message.join(', ')
            : qrData.message || 'Failed to get QR code';
          response = { success: false, error: errorMsg };
        }
        break;
      }

      case 'disconnect': {
        // Disconnect instance
        const disconnectResponse = await fetch(`${evolutionApiUrl}/instance/logout/${targetInstanceName}`, {
          method: 'DELETE',
          headers: {
            'apikey': evolutionApiKey,
          },
        });

        const disconnectData = await disconnectResponse.json();
        console.log('Disconnect instance response:', disconnectData);
        
        if (disconnectResponse.ok) {
          // Update instance status in database
          await supabaseClient
            .from('whatsapp_instances')
            .update({
              last_status: 'disconnected',
              number: null,
              owner_jid: null,
              profile_name: null
            })
            .eq('user_id', user.id)
            .eq('name', targetInstanceName);

          response = { success: true, data: disconnectData };
        } else {
          const errorMsg = Array.isArray(disconnectData.message)
            ? disconnectData.message.join(', ')
            : disconnectData.message || 'Failed to disconnect instance';
          response = { success: false, error: errorMsg };
        }
        break;
      }

      default:
        throw new Error(`Invalid action: ${action}`);
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in evolution-instance function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
