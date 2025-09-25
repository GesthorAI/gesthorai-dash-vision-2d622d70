import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Plus, Edit, Trash, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

interface Role {
  id: string;
  name: string;
  description: string;
  is_system_role: boolean;
  permissions: string[];
  created_at: string;
}

export const RolesManager = () => {
  const { currentOrganizationId } = useOrganizationContext();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [newRole, setNewRole] = useState({ name: '', description: '' });
  const queryClient = useQueryClient();

  const { data: roles, isLoading } = useQuery({
    queryKey: ['roles', currentOrganizationId],
    queryFn: async () => {
      if (!currentOrganizationId) return [];
      
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('organization_id', currentOrganizationId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as Role[];
    },
    enabled: !!currentOrganizationId
  });

  const createRole = useMutation({
    mutationFn: async (roleData: { name: string; description: string }) => {
      if (!currentOrganizationId) throw new Error('No organization selected');
      
      const { error } = await supabase
        .from('roles')
        .insert({
          organization_id: currentOrganizationId,
          name: roleData.name,
          description: roleData.description,
          permissions: []
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setIsCreateOpen(false);
      setNewRole({ name: '', description: '' });
      toast.success('Role created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create role: ' + error.message);
    }
  });

  const deleteRole = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete role: ' + error.message);
    }
  });

  const handleCreateRole = () => {
    if (!newRole.name.trim()) {
      toast.error('Role name is required');
      return;
    }
    createRole.mutate(newRole);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
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
    <Card>
      <CardHeader>
        <CardTitle>Organization Roles</CardTitle>
        <CardDescription>Manage roles and their permissions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Role
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Role</DialogTitle>
                <DialogDescription>
                  Create a new role for your organization members
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Role Name</label>
                  <Input
                    value={newRole.name}
                    onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                    placeholder="Enter role name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={newRole.description}
                    onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                    placeholder="Describe this role's responsibilities"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateRole} disabled={createRole.isPending}>
                    Create Role
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <div className="space-y-3">
            {roles && roles.length > 0 ? (
              roles.map((role) => (
                <div key={role.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Shield className="h-4 w-4 text-primary" />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{role.name}</span>
                          {role.is_system_role && (
                            <Badge variant="secondary" className="text-xs">
                              System
                            </Badge>
                          )}
                        </div>
                        {role.description && (
                          <p className="text-sm text-muted-foreground">
                            {role.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {role.permissions?.length || 0} permissions
                      </Badge>
                      {!role.is_system_role && (
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingRole(role)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteRole.mutate(role.id)}
                            disabled={deleteRole.isPending}
                          >
                            <Trash className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {role.permissions && role.permissions.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.slice(0, 5).map((permission) => (
                          <Badge key={permission} variant="outline" className="text-xs">
                            {permission}
                          </Badge>
                        ))}
                        {role.permissions.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{role.permissions.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold">No Roles Found</h3>
                <p className="text-muted-foreground">Create your first role to get started</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};