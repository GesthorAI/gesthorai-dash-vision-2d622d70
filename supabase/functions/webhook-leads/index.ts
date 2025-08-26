import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeadData {
  name: string;
  business: string;
  city: string;
  phone?: string;
  email?: string;
  source?: string;
  niche?: string;
  score?: number;
}

interface WebhookPayload {
  search_id: string;
  status: 'concluida' | 'falhou' | 'processando';
  leads?: LeadData[];
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
    
    // Initialize Supabase client
    const supabaseUrl = 'https://xpgazdzcbtjqivbsunvh.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwZ2F6ZHpjYnRqcWl2YnN1bnZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjYxODksImV4cCI6MjA3MTcwMjE4OX0.59lJ1yOZr4D0tcSgxSAtGQiYb2FT3q_LUooNOaCG67o';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const payload: WebhookPayload = await req.json();
    console.log('Payload received:', JSON.stringify(payload, null, 2));
    
    const { search_id, status, leads = [], total_leads, webhook_id } = payload;
    
    // Validate required fields
    if (!search_id) {
      console.error('Missing search_id');
      return new Response(
        JSON.stringify({ error: 'search_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Verify search exists
    const { data: searchData, error: searchError } = await supabase
      .from('searches')
      .select('id, niche, city')
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
    if (total_leads !== undefined) {
      updateData.total_leads = total_leads;
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
      console.log(`Inserting ${leads.length} leads`);
      
      // Prepare leads data with search_id and defaults
      const leadsToInsert = leads.map(lead => ({
        ...lead,
        search_id: search_id,
        niche: lead.niche || searchData.niche,
        city: lead.city || searchData.city,
        score: lead.score || Math.floor(Math.random() * 10) + 1, // Random score if not provided
        status: 'novo'
      }));
      
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
      
      console.log('Leads inserted successfully');
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