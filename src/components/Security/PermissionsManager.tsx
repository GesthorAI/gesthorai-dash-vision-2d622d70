import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Lock, Eye, Edit, Trash, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Permission {
  id: string;
  name: string;
  description: string;
  resource_type: string;
  action: string;
}

export const PermissionsManager = () => {
  const { data: permissions, isLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('resource_type', { ascending: true });
      
      if (error) throw error;
      return data as Permission[];
    }
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <Plus className="h-3 w-3" />;
      case 'read':
        return <Eye className="h-3 w-3" />;
      case 'update':
        return <Edit className="h-3 w-3" />;
      case 'delete':
        return <Trash className="h-3 w-3" />;
      case 'manage':
        return <Shield className="h-3 w-3" />;
      default:
        return <Lock className="h-3 w-3" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'text-green-600';
      case 'read':
        return 'text-blue-600';
      case 'update':
        return 'text-yellow-600';
      case 'delete':
        return 'text-red-600';
      case 'manage':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  const groupedPermissions = permissions?.reduce((acc, permission) => {
    if (!acc[permission.resource_type]) {
      acc[permission.resource_type] = [];
    }
    acc[permission.resource_type].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Permissions</CardTitle>
        <CardDescription>Available permissions for role assignment</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {groupedPermissions && Object.entries(groupedPermissions).map(([resourceType, perms]) => (
            <div key={resourceType} className="space-y-3">
              <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                {resourceType.replace('_', ' ')}
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {perms.map((permission) => (
                  <div key={permission.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`${getActionColor(permission.action)}`}>
                        {getActionIcon(permission.action)}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{permission.name}</div>
                        {permission.description && (
                          <div className="text-xs text-muted-foreground">
                            {permission.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {permission.action}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {(!permissions || permissions.length === 0) && (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No Permissions Found</h3>
              <p className="text-muted-foreground">System permissions will be loaded automatically</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};