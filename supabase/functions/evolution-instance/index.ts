
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EvolutionSettings {
  evolution_api_url: string;
  default_instance_name: string;
}

interface ApiKey {
  provider: string;
  key_cipher: string;
  iv: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verificar se o usuário está autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('Authentication error:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { action, instanceName } = await req.json()
    console.log(`Evolution API action: ${action} for instance: ${instanceName}`)

    // Buscar configurações do usuário
    const { data: evolutionSettings, error: settingsError } = await supabase
      .from('evolution_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (settingsError) {
      console.error('Error fetching evolution settings:', settingsError)
      return new Response(
        JSON.stringify({ error: 'Evolution settings not configured' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Buscar chave da Evolution API
    const { data: apiKeys, error: keysError } = await supabase
      .from('ai_api_keys')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'evolution_api')
      .single()

    if (keysError) {
      console.error('Error fetching Evolution API key:', keysError)
      return new Response(
        JSON.stringify({ error: 'Evolution API key not configured' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Descriptografar a chave (simplificado para este exemplo)
    const evolutionApiKey = atob(apiKeys.key_cipher)
    
    // Usar configurações do usuário
    const evolutionApiUrl = evolutionSettings.evolution_api_url
    const targetInstanceName = instanceName || evolutionSettings.default_instance_name

    console.log(`Using Evolution API URL: ${evolutionApiUrl}`)
    console.log(`Target instance: ${targetInstanceName}`)

    if (action === 'status') {
      // Buscar status da instância
      const statusResponse = await fetch(`${evolutionApiUrl}/instance/fetchInstances`, {
        method: 'GET',
        headers: {
          'apikey': evolutionApiKey,
          'Content-Type': 'application/json',
        },
      })

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text()
        console.error('Evolution API error:', errorText)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Evolution API error: ${statusResponse.status}`,
            details: errorText
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const statusData = await statusResponse.json()
      console.log('Instance status response:', JSON.stringify(statusData, null, 2))

      let instanceStatus = null

      // Handle different response formats from Evolution API
      if (Array.isArray(statusData)) {
        instanceStatus = statusData.find(instance => {
          const instanceName = instance.instance?.instanceName || 
                             instance.instanceName || 
                             instance.name
          return instanceName?.toLowerCase() === targetInstanceName.toLowerCase()
        })
      } else {
        const instanceName = statusData.instance?.instanceName || 
                           statusData.instanceName || 
                           statusData.name
        if (instanceName?.toLowerCase() === targetInstanceName.toLowerCase()) {
          instanceStatus = statusData
        }
      }

      if (instanceStatus) {
        // Extract status from different possible fields
        const status = instanceStatus.instance?.connectionStatus || 
                      instanceStatus.connectionStatus || 
                      instanceStatus.status || 
                      'unknown'

        return new Response(
          JSON.stringify({ 
            success: true, 
            status: status,
            instance: instanceStatus
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      } else {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Instance ${targetInstanceName} not found` 
          }),
          { 
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    if (action === 'connect') {
      // Criar nova instância
      const connectResponse = await fetch(`${evolutionApiUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'apikey': evolutionApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instanceName: targetInstanceName,
          integration: 'WHATSAPP-BAILEYS'
        })
      })

      if (!connectResponse.ok) {
        const errorText = await connectResponse.text()
        console.error('Evolution API connect error:', errorText)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Evolution API connect error: ${connectResponse.status}`,
            details: errorText
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const connectData = await connectResponse.json()
      console.log('Connect response:', JSON.stringify(connectData, null, 2))

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: connectData 
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (action === 'qr') {
      // Buscar QR code
      const qrResponse = await fetch(`${evolutionApiUrl}/instance/connect/${targetInstanceName}`, {
        method: 'GET',
        headers: {
          'apikey': evolutionApiKey,
          'Content-Type': 'application/json',
        },
      })

      if (!qrResponse.ok) {
        const errorText = await qrResponse.text()
        console.error('Evolution API QR error:', errorText)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Evolution API QR error: ${qrResponse.status}`,
            details: errorText
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const qrData = await qrResponse.json()
      console.log('QR response:', JSON.stringify(qrData, null, 2))

      return new Response(
        JSON.stringify({ 
          success: true, 
          qr: qrData.base64 || qrData.qr || qrData.qrcode 
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
