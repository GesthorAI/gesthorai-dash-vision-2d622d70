import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EvolutionInstanceRequest {
  action: 'create' | 'connect' | 'status' | 'qrcode' | 'disconnect';
  instanceName?: string;
}

interface EvolutionResponse {
  success: boolean;
  data?: any;
  error?: string;
  qrcode?: string;
  status?: string;
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
    const defaultInstanceName = Deno.env.get('EVOLUTION_INSTANCE_NAME') || instanceName || `instance_${user.id.slice(0, 8)}`;

    if (!evolutionApiUrl || !evolutionApiKey) {
      throw new Error('Evolution API configuration missing');
    }

    console.log(`Evolution API action: ${action} for instance: ${defaultInstanceName}`);

    let response: EvolutionResponse = { success: false };

    switch (action) {
      case 'create': {
        // Create new instance
        const createResponse = await fetch(`${evolutionApiUrl}/instance/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': evolutionApiKey,
          },
          body: JSON.stringify({
            instanceName: defaultInstanceName,
            token: evolutionApiKey,
            qrcode: true,
            number: false,
            webhook: false,
          }),
        });

        const createData = await createResponse.json();
        console.log('Create instance response:', createData);
        
        if (createResponse.ok) {
          response = { success: true, data: createData };
        } else {
          response = { success: false, error: createData.message || 'Failed to create instance' };
        }
        break;
      }

      case 'connect': {
        // Connect instance (generate QR code)
        const connectResponse = await fetch(`${evolutionApiUrl}/instance/connect/${defaultInstanceName}`, {
          method: 'GET',
          headers: {
            'apikey': evolutionApiKey,
          },
        });

        const connectData = await connectResponse.json();
        console.log('Connect instance response:', connectData);
        
        if (connectResponse.ok) {
          response = { 
            success: true, 
            data: connectData,
            qrcode: connectData.base64 || connectData.qrcode
          };
        } else {
          response = { success: false, error: connectData.message || 'Failed to connect instance' };
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
          const instanceStatus = Array.isArray(statusData) 
            ? statusData.find(instance => instance.instance?.instanceName === defaultInstanceName)
            : statusData;
          
          response = { 
            success: true, 
            data: instanceStatus,
            status: instanceStatus?.instance?.connectionStatus || 'disconnected'
          };
        } else {
          response = { success: false, error: statusData.message || 'Failed to get instance status' };
        }
        break;
      }

      case 'qrcode': {
        // Get QR code
        const qrResponse = await fetch(`${evolutionApiUrl}/instance/connect/${defaultInstanceName}`, {
          method: 'GET',
          headers: {
            'apikey': evolutionApiKey,
          },
        });

        const qrData = await qrResponse.json();
        console.log('QR code response:', qrData);
        
        if (qrResponse.ok) {
          response = { 
            success: true, 
            data: qrData,
            qrcode: qrData.base64 || qrData.qrcode
          };
        } else {
          response = { success: false, error: qrData.message || 'Failed to get QR code' };
        }
        break;
      }

      case 'disconnect': {
        // Disconnect instance
        const disconnectResponse = await fetch(`${evolutionApiUrl}/instance/logout/${defaultInstanceName}`, {
          method: 'DELETE',
          headers: {
            'apikey': evolutionApiKey,
          },
        });

        const disconnectData = await disconnectResponse.json();
        console.log('Disconnect instance response:', disconnectData);
        
        if (disconnectResponse.ok) {
          response = { success: true, data: disconnectData };
        } else {
          response = { success: false, error: disconnectData.message || 'Failed to disconnect instance' };
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