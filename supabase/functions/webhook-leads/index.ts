
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
    
    // Validate webhook token - accept both x-webhook-token and Authorization Bearer
    const webhookToken = req.headers.get('x-webhook-token');
    const authHeader = req.headers.get('authorization');
    const expectedToken = Deno.env.get('WEBHOOK_SHARED_TOKEN');
    
    let isValidToken = false;
    let authMethod = '';
    
    // Check x-webhook-token header
    if (webhookToken && webhookToken === expectedToken) {
      isValidToken = true;
      authMethod = 'x-webhook-token';
    }
    
    // Check Authorization Bearer header as fallback
    if (!isValidToken && authHeader) {
      const bearerToken = authHeader.replace('Bearer ', '');
      if (bearerToken === expectedToken) {
        isValidToken = true;
        authMethod = 'authorization-bearer';
      }
    }
    
    if (!isValidToken) {
      console.error('Invalid or missing webhook token. Checked x-webhook-token and Authorization Bearer headers');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Valid token received via ${authMethod}`);
    
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
    
    // Update search status initially (will update total_leads after processing leads)
    const initialUpdateData: any = { status };
    if (webhook_id) {
      initialUpdateData.webhook_id = webhook_id;
    }
    
    const { error: initialUpdateError } = await supabase
      .from('searches')
      .update(initialUpdateData)
      .eq('id', search_id);
      
    if (initialUpdateError) {
      console.error('Error updating search status:', initialUpdateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update search status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Search status updated successfully');
    
    // Insert leads if provided and status is concluida
    let insertedCount = 0;
    let duplicateCount = 0;
    let skippedCount = 0;
    
    if (leads.length > 0 && status === 'concluida') {
      console.log(`Processing ${leads.length} leads for insertion`);
      
      // Filter leads - accept leads with at least one contact information
      const validLeads = leads.filter(lead => {
        // Skip WhatsApp verification objects without business data
        if (lead.jid && !lead.name && !lead.business && !lead.phone && !lead.email) {
          return false;
        }
        
        // Accept leads that have at least one piece of useful contact information
        const hasContactInfo = lead.name || lead.business || lead.phone || lead.email;
        if (!hasContactInfo) {
          console.log('Skipping lead without contact info:', JSON.stringify(lead, null, 2));
          skippedCount++;
        }
        return hasContactInfo;
      });
      
      console.log(`Found ${validLeads.length} valid leads out of ${leads.length} total leads (${skippedCount} skipped)`);
      
      if (validLeads.length > 0) {
        // Transform leads data
        const leadsToInsert = validLeads.map((lead) => {
          // Ensure we have a name - use business as fallback, then a default
          const leadName = lead.name || lead.business || 'Contato';
          const leadBusiness = lead.business || lead.name || leadName;
          
          return {
            // Required fields - ensure name is never empty
            name: leadName,
            business: leadBusiness,
            city: lead.city || searchData.city,
            
            // Optional basic fields
            phone: lead.phone || lead.number || null,
            email: lead.email || null,
            source: lead.source || 'webhook',
            niche: lead.niche || searchData.niche,
            status: 'novo',
            
            // WhatsApp specific fields
            whatsapp_jid: lead.jid || null,
            whatsapp_exists: lead.exists ?? null,
            whatsapp_number: lead.number || null,
            whatsapp_verified: lead.whatsapp_verified ?? null,
            collected_at: lead.collected_at || null,
            
            // Metadata
            search_id: search_id,
            user_id: searchData.user_id,
          };
        });
        
        console.log('Sample transformed lead:', JSON.stringify(leadsToInsert[0], null, 2));
        console.log(`Inserting ${leadsToInsert.length} transformed leads`);
        
        // Insert leads using the new unique indexes for conflict resolution
        // Note: normalized_phone and normalized_email will be set automatically by the trigger
        for (const lead of leadsToInsert) {
          try {
            // Try direct insert first - let the unique constraints handle duplicates
            const { data, error } = await supabase
              .from('leads')
              .insert(lead)
              .select();

            if (error) {
              if (error.code === '23505') {
                // Unique constraint violation - this is a duplicate
                duplicateCount++;
                console.log('Duplicate lead ignored:', lead.name, error.details);
              } else {
                console.error('Error inserting lead:', lead.name, error);
              }
            } else if (data && data.length > 0) {
              insertedCount++;
              console.log('Lead successfully inserted:', lead.name);
            }
          } catch (error) {
            console.error('Exception processing lead:', lead.name, error);
            continue;
          }
        }

        console.log(`Processing complete: ${insertedCount} inserted, ${duplicateCount} duplicates ignored, ${skippedCount} skipped`);
      } else {
        console.log('No valid leads to insert');
      }
    }
    
    // Update total_leads with the actual inserted count for completed searches
    if (status === 'concluida') {
      const { error: finalUpdateError } = await supabase
        .from('searches')
        .update({ total_leads: insertedCount })
        .eq('id', search_id);
        
      if (finalUpdateError) {
        console.error('Error updating total_leads:', finalUpdateError);
      } else {
        console.log(`Updated total_leads to ${insertedCount} for search ${search_id}`);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Search ${search_id} updated to ${status}`,
        leads_inserted: status === 'concluida' ? insertedCount : 0,
        duplicates_ignored: status === 'concluida' ? duplicateCount : 0,
        leads_skipped: status === 'concluida' ? skippedCount : 0
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
