import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-token',
};

interface IncomingLeadData {
  name?: string;
  business?: string;
  city?: string;
  phone?: string;
  email?: string;
  source?: string;
  niche?: string;
  score?: number;
  // WhatsApp specific fields from n8n
  jid?: string;
  exists?: boolean;
  number?: string;
  whatsapp_verified?: boolean;
  collected_at?: string;
}

interface WebhookPayload {
  search_id: string;
  status: 'concluida' | 'falhou' | 'processando';
  leads?: IncomingLeadData[];
  leads_count?: number;
  total_leads?: number;
  webhook_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Webhook received:', req.method);
    
    // Validate webhook token
    const webhookToken = req.headers.get('x-webhook-token');
    const expectedToken = Deno.env.get('WEBHOOK_SHARED_TOKEN');
    
    if (!webhookToken || webhookToken !== expectedToken) {
      console.error('Invalid or missing webhook token');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Environment check:', {
      supabaseUrl: supabaseUrl ? 'SET' : 'MISSING',
      supabaseServiceKey: supabaseServiceKey ? 'SET' : 'MISSING',
      expectedToken: expectedToken ? 'SET' : 'MISSING'
    });
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error - missing environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const payload: WebhookPayload = await req.json();
    console.log('Payload received:', JSON.stringify(payload, null, 2));
    
    const { search_id, status, leads = [], leads_count, total_leads, webhook_id } = payload;
    
    // Use leads_count if total_leads is not provided
    const finalTotalLeads = total_leads ?? leads_count;
    
    // Validate required fields
    if (!search_id) {
      console.error('Missing search_id');
      return new Response(
        JSON.stringify({ error: 'search_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Verify search exists and get user_id
    const { data: searchData, error: searchError } = await supabase
      .from('searches')
      .select('id, niche, city, user_id')
      .eq('id', search_id)
      .single();
      
    if (searchError || !searchData) {
      console.error('Search not found:', searchError);
      return new Response(
        JSON.stringify({ error: 'Search not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Search found:', searchData);
    
    // Update search status and total_leads
    const updateData: any = { status };
    if (finalTotalLeads !== undefined) {
      updateData.total_leads = finalTotalLeads;
    }
    if (webhook_id) {
      updateData.webhook_id = webhook_id;
    }
    
    const { error: updateError } = await supabase
      .from('searches')
      .update(updateData)
      .eq('id', search_id);
      
    if (updateError) {
      console.error('Error updating search:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update search' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Search updated successfully');
    
    // Insert leads if provided and status is concluida
    if (leads.length > 0 && status === 'concluida') {
      console.log(`Processing ${leads.length} leads for insertion`);
      
      // Filter and transform leads data to match database schema
      const validLeads = leads.filter(lead => {
        // Only include leads that have either whatsapp data or basic business info
        return lead.whatsapp_verified || lead.name || lead.business;
      });
      
      console.log(`Found ${validLeads.length} valid leads out of ${leads.length} total leads`);
      
      if (validLeads.length > 0) {
        // Transform leads data with proper field mapping
        const leadsToInsert = validLeads.map((lead, index) => {
          const transformedLead = {
            // Required fields with fallbacks
            name: lead.name || `Lead ${index + 1}`,
            business: lead.business || lead.name || `Business ${index + 1}`,
            city: lead.city || searchData.city,
            
            // Optional basic fields
            phone: lead.phone || lead.number || null,
            email: lead.email || null,
            source: lead.source || 'webhook',
            niche: lead.niche || searchData.niche,
            score: lead.score || Math.floor(Math.random() * 10) + 1,
            status: 'novo',
            
            // WhatsApp specific fields - proper mapping
            whatsapp_jid: lead.jid || null,
            whatsapp_exists: lead.exists ?? null,
            whatsapp_number: lead.number || null,
            whatsapp_verified: lead.whatsapp_verified ?? null,
            collected_at: lead.collected_at || null,
            
            // Metadata
            search_id: search_id,
            user_id: searchData.user_id,
          };
          
          return transformedLead;
        });
        
        console.log('Sample transformed lead:', JSON.stringify(leadsToInsert[0], null, 2));
        console.log(`Inserting ${leadsToInsert.length} transformed leads`);
        
        const { error: leadsError } = await supabase
          .from('leads')
          .insert(leadsToInsert);
          
        if (leadsError) {
          console.error('Error inserting leads:', leadsError);
          return new Response(
            JSON.stringify({ error: 'Failed to insert leads', details: leadsError }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log(`Successfully inserted ${leadsToInsert.length} leads`);
      } else {
        console.log('No valid leads to insert');
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Search ${search_id} updated to ${status}`,
        leads_inserted: status === 'concluida' ? leads.length : 0
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});