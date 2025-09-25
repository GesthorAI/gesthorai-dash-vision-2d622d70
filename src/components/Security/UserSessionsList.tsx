import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Monitor, Smartphone, Tablet, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

interface UserSession {
  id: string;
  user_id: string;
  ip_address: string;
  user_agent: string;
  device_info: any;
  login_at: string;
  last_activity: string;
  is_active: boolean;
  location_info: any;
}

export const UserSessionsList = () => {
  const { currentOrganizationId } = useOrganizationContext();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['user-sessions', currentOrganizationId],
    queryFn: async () => {
      if (!currentOrganizationId) return [];
      
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('organization_id', currentOrganizationId)
        .eq('is_active', true)
        .order('last_activity', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as UserSession[];
    },
    enabled: !!currentOrganizationId
  });

  const getDeviceIcon = (userAgent: string) => {
    if (!userAgent) return <Monitor className="h-4 w-4" />;
    
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <Smartphone className="h-4 w-4" />;
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return <Tablet className="h-4 w-4" />;
    }
    return <Monitor className="h-4 w-4" />;
  };

  const getBrowser = (userAgent: string) => {
    if (!userAgent) return 'Unknown';
    
    const ua = userAgent.toLowerCase();
    if (ua.includes('chrome')) return 'Chrome';
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('safari')) return 'Safari';
    if (ua.includes('edge')) return 'Edge';
    return 'Other';
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active User Sessions</CardTitle>
        <CardDescription>Monitor active login sessions across your organization</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sessions && sessions.length > 0 ? (
            sessions.map((session) => (
              <div key={session.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getDeviceIcon(session.user_agent)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          {getBrowser(session.user_agent)}
                        </span>
                        <Badge variant={session.is_active ? 'secondary' : 'outline'}>
                          {session.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center space-x-4">
                        <span className="flex items-center space-x-1">
                          <Globe className="h-3 w-3" />
                          <span>{session.ip_address || 'Unknown IP'}</span>
                        </span>
                        {session.location_info?.city && (
                          <span>{session.location_info.city}, {session.location_info.country}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right text-sm">
                    <div className="font-medium">
                      {getTimeAgo(session.last_activity)}
                    </div>
                    <div className="text-muted-foreground">
                      Login: {new Date(session.login_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {session.device_info && Object.keys(session.device_info).length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                      {Object.entries(session.device_info).map(([key, value]) => (
                        <div key={key}>
                          <span className="font-medium">{key}:</span> {String(value)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Monitor className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No Active Sessions</h3>
              <p className="text-muted-foreground">No user sessions found for this organization</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};