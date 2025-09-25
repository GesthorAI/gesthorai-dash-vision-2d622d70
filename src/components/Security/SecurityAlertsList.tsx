import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Clock, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

interface SecurityAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  metadata: any;
}

export const SecurityAlertsList = () => {
  const { currentOrganizationId } = useOrganizationContext();
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);
  const queryClient = useQueryClient();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['security-alerts-full', currentOrganizationId],
    queryFn: async () => {
      if (!currentOrganizationId) return [];
      
      const { data, error } = await supabase
        .from('security_alerts')
        .select('*')
        .eq('organization_id', currentOrganizationId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as SecurityAlert[];
    },
    enabled: !!currentOrganizationId
  });

  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('security_alerts')
        .update({ 
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', alertId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-alerts-full'] });
      queryClient.invalidateQueries({ queryKey: ['security-alerts'] });
      toast.success('Alert resolved successfully');
    },
    onError: (error) => {
      toast.error('Failed to resolve alert: ' + error.message);
    }
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Eye className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Security Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Security Alerts</CardTitle>
          <CardDescription>Monitor and manage security events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alerts && alerts.length > 0 ? (
              alerts.map((alert) => (
                <div key={alert.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getSeverityIcon(alert.severity)}
                      <div>
                        <h4 className="font-semibold">{alert.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {alert.alert_type} • {new Date(alert.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getSeverityVariant(alert.severity) as any}>
                        {alert.severity}
                      </Badge>
                      <Badge variant={alert.status === 'active' ? 'destructive' : 'secondary'}>
                        {alert.status}
                      </Badge>
                    </div>
                  </div>
                  
                  {alert.description && (
                    <p className="text-sm">{alert.description}</p>
                  )}

                  {alert.metadata && Object.keys(alert.metadata).length > 0 && (
                    <div className="bg-muted rounded p-3">
                      <h5 className="text-xs font-semibold mb-2 uppercase tracking-wide">Details</h5>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {Object.entries(alert.metadata).map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium">{key}:</span> {String(value)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-2">
                    {alert.status === 'active' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => resolveAlert.mutate(alert.id)}
                        disabled={resolveAlert.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Resolve
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => setSelectedAlert(alert)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Details
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold">No Security Alerts</h3>
                <p className="text-muted-foreground">Your organization is secure</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};