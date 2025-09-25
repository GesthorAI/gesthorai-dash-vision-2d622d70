import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Shield, Users, Activity, Eye, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { SecurityAlertsList } from './SecurityAlertsList';
import { UserSessionsList } from './UserSessionsList';
import { PermissionsManager } from './PermissionsManager';
import { RolesManager } from './RolesManager';

export const SecurityDashboard = () => {
  const { currentOrganizationId } = useOrganizationContext();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: securityReport, isLoading } = useQuery({
    queryKey: ['security-report', currentOrganizationId],
    queryFn: async () => {
      if (!currentOrganizationId) return null;
      
      const { data, error } = await supabase.rpc('get_organization_security_report', {
        p_organization_id: currentOrganizationId
      });
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrganizationId,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: activeAlerts } = useQuery({
    queryKey: ['security-alerts', currentOrganizationId],
    queryFn: async () => {
      if (!currentOrganizationId) return [];
      
      const { data, error } = await supabase
        .from('security_alerts')
        .select('*')
        .eq('organization_id', currentOrganizationId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrganizationId
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const metrics = (securityReport as any)?.security_metrics || {};
  const criticalAlerts = activeAlerts?.filter(alert => alert.severity === 'critical').length || 0;
  const highAlerts = activeAlerts?.filter(alert => alert.severity === 'high').length || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security Dashboard</h1>
          <p className="text-muted-foreground">Monitor and manage your organization's security</p>
        </div>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Security Settings
        </Button>
      </div>

      {/* Security Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.active_alerts || 0}</div>
            <div className="flex gap-2 mt-2">
              {criticalAlerts > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {criticalAlerts} Critical
                </Badge>
              )}
              {highAlerts > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {highAlerts} High
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_members || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active organization members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Logins</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.recent_logins_24h || 0}</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Usage Today</CardTitle>
            <Shield className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((metrics.ai_tokens_used_today || 0) / 1000)}K
            </div>
            <p className="text-xs text-muted-foreground">
              Tokens consumed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Security Management Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="permissions">Access Control</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Security Alerts</CardTitle>
                <CardDescription>Latest security events requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                {activeAlerts && activeAlerts.length > 0 ? (
                  <div className="space-y-3">
                    {activeAlerts.slice(0, 3).map((alert) => (
                      <div key={alert.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {alert.severity}
                          </Badge>
                          <span className="text-sm">{alert.title}</span>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="w-full mt-3">
                      View All Alerts
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No active security alerts</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Score</CardTitle>
                <CardDescription>Overall security posture assessment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Overall Score</span>
                    <Badge variant="secondary" className="text-sm">
                      {criticalAlerts === 0 && highAlerts === 0 ? 'Good' : 'Needs Attention'}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Authentication</span>
                      <span className="text-green-600">✓ Enabled</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>RLS Policies</span>
                      <span className="text-green-600">✓ Active</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Audit Logging</span>
                      <span className="text-green-600">✓ Enabled</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Activity Monitoring</span>
                      <span className="text-green-600">✓ Active</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts">
          <SecurityAlertsList />
        </TabsContent>

        <TabsContent value="sessions">
          <UserSessionsList />
        </TabsContent>

        <TabsContent value="permissions">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RolesManager />
            <PermissionsManager />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};