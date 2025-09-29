import { Resend } from 'https://esm.sh/resend@2.0.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)

interface InviteRequest {
  organizationId: string
  email: string
  role: 'admin' | 'member'
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user from JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const { organizationId, email, role }: InviteRequest = await req.json()

    // Validate input
    if (!organizationId || !email || !role) {
      return new Response('Missing required fields', { status: 400, headers: corsHeaders })
    }

    // Check if user is admin of the organization
    const { data: membershipData, error: membershipError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membershipData || membershipData.role !== 'admin') {
      return new Response('Forbidden: Only admins can send invites', { status: 403, headers: corsHeaders })
    }

    // Get organization details
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single()

    if (orgError || !orgData) {
      return new Response('Organization not found', { status: 404, headers: corsHeaders })
    }

    // Get inviter profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const inviterName = profileData?.full_name || user.email || 'Um membro da equipe'

    // Check if user with this email is already a member
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const userWithEmail = existingUsers.users.find(u => u.email === email);
    
    if (userWithEmail) {
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('user_id', userWithEmail.id)
        .single();
        
      if (existingMember) {
        return new Response(JSON.stringify({ 
          error: 'User is already a member of this organization' 
        }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
    }

    // Check for existing pending invite
    const { data: existingInvite } = await supabase
      .from('organization_invites')
      .select('id, token')
      .eq('organization_id', organizationId)
      .eq('email', email)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    let inviteToken: string

    if (existingInvite) {
      // Use existing invite token
      inviteToken = existingInvite.token
    } else {
      // Generate secure token
      inviteToken = crypto.randomUUID() + '-' + crypto.randomUUID()

      // Create invite record
      const { error: insertError } = await supabase
        .from('organization_invites')
        .insert({
          organization_id: organizationId,
          email,
          role,
          token: inviteToken,
          invited_by: user.id,
        })

      if (insertError) {
        console.error('Error creating invite:', insertError)
        return new Response('Error creating invite', { status: 500, headers: corsHeaders })
      }
    }

    // Create accept URL
    const baseUrl = req.headers.get('origin') || supabaseUrl.replace('//', '//app.')
    const acceptUrl = `${baseUrl}/invite/${inviteToken}`

    // Create HTML template
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f4f4f4; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .content { line-height: 1.6; }
    .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { color: #666; font-size: 14px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Convite para ${orgData.name}</h1>
  </div>
  <div class="content">
    <p>Olá!</p>
    <p><strong>${inviterName}</strong> está convidando você para se juntar à organização <strong>${orgData.name}</strong> como <strong>${role === 'admin' ? 'Administrador' : 'Membro'}</strong>.</p>
    <p>Para aceitar este convite, clique no botão abaixo:</p>
    <a href="${acceptUrl}" class="button">Aceitar Convite</a>
    <p>Ou copie e cole este link no seu navegador:</p>
    <p><a href="${acceptUrl}">${acceptUrl}</a></p>
  </div>
  <div class="footer">
    <p>Se você não esperava este convite, pode ignorar este email com segurança.</p>
  </div>
</body>
</html>`

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Convites <convites@resend.dev>',
      to: [email],
      subject: `Convite para se juntar à ${orgData.name}`,
      html,
    })

    if (emailError) {
      console.error('Error sending email:', emailError)
      return new Response('Error sending email', { status: 500, headers: corsHeaders })
    }

    console.log('Invite sent successfully:', { email, organizationId, emailId: emailData?.id })

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Invite sent successfully',
      emailId: emailData?.id 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in send-invite function:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})