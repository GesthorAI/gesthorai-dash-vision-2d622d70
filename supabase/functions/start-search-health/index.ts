import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    console.log('Health check request received:', req.method);
    
    // Check all environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
    const callbackToken = Deno.env.get('WEBHOOK_SHARED_TOKEN');
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionInstanceName = Deno.env.get('EVOLUTION_INSTANCE_NAME');
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
    
    const environmentStatus = {
      supabaseUrl: supabaseUrl ? 'SET' : 'MISSING',
      supabaseServiceKey: supabaseServiceKey ? 'SET' : 'MISSING', 
      n8nWebhookUrl: n8nWebhookUrl ? 'SET' : 'MISSING',
      callbackToken: callbackToken ? 'SET' : 'MISSING',
      evolutionApiUrl: evolutionApiUrl ? 'SET' : 'MISSING',
      evolutionInstanceName: evolutionInstanceName ? 'SET' : 'MISSING',
      evolutionApiKey: evolutionApiKey ? 'SET' : 'MISSING'
    };

    // Check for missing variables
    const missingVars = Object.entries(environmentStatus)
      .filter(([_, status]) => status === 'MISSING')
      .map(([key, _]) => key);

    console.log('Environment status:', environmentStatus);
    
    let n8nTestResult = null;
    
    // Test N8N webhook if URL is available
    if (n8nWebhookUrl && callbackToken) {
      try {
        console.log('Testing N8N webhook:', n8nWebhookUrl);
        
        const testPayload = {
          test: true,
          timestamp: new Date().toISOString(),
          healthCheck: true
        };
        
        const n8nResponse = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-webhook-token': callbackToken,
            'Authorization': `Bearer ${callbackToken}`
          },
          body: JSON.stringify(testPayload)
        });
        
        const responseText = await n8nResponse.text();
        
        n8nTestResult = {
          status: n8nResponse.status,
          ok: n8nResponse.ok,
          statusText: n8nResponse.statusText,
          responsePreview: responseText.substring(0, 200) + (responseText.length > 200 ? '...' : '')
        };
        
        console.log('N8N test result:', n8nTestResult);
        
      } catch (error) {
        n8nTestResult = {
          status: 'ERROR',
          error: error instanceof Error ? error.message : 'Unknown error',
          ok: false
        };
        console.error('N8N test failed:', error);
      }
    } else {
      n8nTestResult = {
        status: 'SKIPPED',
        reason: 'Missing N8N_WEBHOOK_URL or WEBHOOK_SHARED_TOKEN',
        ok: false
      };
    }

    const healthStatus = {
      timestamp: new Date().toISOString(),
      environment: environmentStatus,
      missingVariables: missingVars,
      n8nWebhook: n8nTestResult,
      overallStatus: missingVars.length === 0 && n8nTestResult?.ok ? 'HEALTHY' : 'UNHEALTHY',
      criticalMissing: missingVars.filter(v => ['supabaseUrl', 'supabaseServiceKey', 'n8nWebhookUrl', 'callbackToken'].includes(v))
    };

    console.log('Health check completed:', healthStatus.overallStatus);

    return new Response(
      JSON.stringify(healthStatus, null, 2),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('Health check error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Health check failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});