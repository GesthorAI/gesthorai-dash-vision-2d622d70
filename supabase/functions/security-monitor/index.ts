import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    console.log('Starting security monitoring analysis...');

    // 1. Executar análise de padrões de segurança
    const { error: patternsError } = await supabase.rpc('analyze_security_patterns');
    
    if (patternsError) {
      console.error('Error analyzing security patterns:', patternsError);
    } else {
      console.log('Security patterns analysis completed');
    }

    // 2. Verificar organizações com alta atividade
    const { data: highActivityOrgs, error: activityError } = await supabase
      .from('ai_usage_quotas')
      .select(`
        organization_id,
        tokens_used,
        tokens_limit,
        requests_made,
        requests_limit
      `)
      .gte('period_start', new Date().toISOString().split('T')[0])
      .gt('tokens_used', 45000); // Mais de 90% do limite padrão

    if (activityError) {
      console.error('Error checking high activity orgs:', activityError);
    } else if (highActivityOrgs && highActivityOrgs.length > 0) {
      console.log(`Found ${highActivityOrgs.length} organizations with high AI usage`);
      
      for (const org of highActivityOrgs) {
        const usagePercentage = (org.tokens_used / org.tokens_limit) * 100;
        
        if (usagePercentage > 95) {
          // Criar alerta crítico
          await supabase.rpc('create_security_alert', {
            p_organization_id: org.organization_id,
            p_alert_type: 'ai_quota_critical',
            p_severity: 'critical',
            p_title: 'AI quota critically low',
            p_description: `Organization has used ${usagePercentage.toFixed(1)}% of daily AI quota`,
            p_metadata: {
              usage_percentage: usagePercentage,
              tokens_used: org.tokens_used,
              tokens_limit: org.tokens_limit,
              auto_generated: true
            }
          });
        }
      }
    }

    // 3. Verificar sessões suspeitas (múltiplas sessões ativas)
    const { data: suspiciousSessions, error: sessionsError } = await supabase
      .from('user_sessions')
      .select(`
        user_id,
        organization_id,
        count:id
      `)
      .eq('is_active', true)
      .gte('login_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .group('user_id, organization_id')
      .having('count(id) > 5');

    if (suspiciousSessions && suspiciousSessions.length > 0) {
      for (const session of suspiciousSessions) {
        await supabase.rpc('create_security_alert', {
          p_organization_id: session.organization_id,
          p_alert_type: 'multiple_active_sessions',
          p_severity: 'medium',
          p_title: 'Multiple active sessions detected',
          p_description: `User has ${session.count} active sessions in the last 24 hours`,
          p_metadata: {
            user_id: session.user_id,
            session_count: session.count,
            auto_generated: true
          }
        });
      }
    }

    // 4. Executar limpeza segura de dados expirados
    const { data: cleanupCount, error: cleanupError } = await supabase.rpc('secure_cleanup_expired_data');
    
    if (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    } else {
      console.log(`Cleanup completed. Removed ${cleanupCount} expired records`);
    }

    // 5. Verificar alertas ativos por organização
    const { data: activeAlertsCount, error: alertsError } = await supabase
      .from('security_alerts')
      .select(`
        organization_id,
        severity,
        count:id
      `)
      .eq('status', 'active')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .group('organization_id, severity');

    let totalCritical = 0;
    let totalHigh = 0;
    let totalMedium = 0;

    if (activeAlertsCount) {
      activeAlertsCount.forEach(alert => {
        switch (alert.severity) {
          case 'critical': totalCritical += alert.count; break;
          case 'high': totalHigh += alert.count; break;
          case 'medium': totalMedium += alert.count; break;
        }
      });
    }

    // 6. Verificar integridade dos dados principais
    const { data: dataIntegrityIssues, error: integrityError } = await supabase.rpc('verify_data_integrity');
    
    let integrityProblems = 0;
    if (dataIntegrityIssues && dataIntegrityIssues.length > 0) {
      integrityProblems = dataIntegrityIssues.reduce((sum, issue) => sum + Number(issue.issue_count), 0);
      
      if (integrityProblems > 0) {
        console.warn(`Data integrity issues found: ${integrityProblems} total issues`);
        
        // Criar alerta para problemas de integridade críticos
        const criticalIssues = dataIntegrityIssues.filter(issue => 
          issue.issue_type === 'orphaned_records' && Number(issue.issue_count) > 10
        );
        
        if (criticalIssues.length > 0) {
          await supabase.rpc('create_security_alert', {
            p_organization_id: null, // Alert do sistema
            p_alert_type: 'data_integrity_critical',
            p_severity: 'high',
            p_title: 'Critical data integrity issues detected',
            p_description: `Found ${integrityProblems} data integrity issues requiring attention`,
            p_metadata: {
              issues: dataIntegrityIssues,
              auto_generated: true
            }
          });
        }
      }
    }

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        high_activity_organizations: highActivityOrgs?.length || 0,
        suspicious_sessions: suspiciousSessions?.length || 0,
        cleanup_records_removed: cleanupCount || 0,
        active_alerts: {
          critical: totalCritical,
          high: totalHigh,
          medium: totalMedium
        },
        data_integrity_issues: integrityProblems
      },
      actions_taken: [
        'Security patterns analyzed',
        'High usage organizations monitored',
        'Suspicious sessions detected',
        'Expired data cleaned up',
        'Data integrity verified'
      ]
    };

    console.log('Security monitoring completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in security monitoring:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});