import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useOrganizationMembers, useInviteMember, useCurrentOrganization } from "@/hooks/useOrganizations";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { Users, UserPlus, Crown, Shield, User } from "lucide-react";

export const MembersManagement = () => {
  const { currentOrganizationId } = useOrganizationContext();
  const { data: organization } = useCurrentOrganization(currentOrganizationId || undefined);
  const { data: members = [], isLoading } = useOrganizationMembers(currentOrganizationId || undefined);
  const inviteMember = useInviteMember();
  const { toast } = useToast();
  
  const [inviteDialog, setInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  const handleInvite = async () => {
    if (!currentOrganizationId || !inviteEmail.trim()) return;
    
    try {
      await inviteMember.mutateAsync({
        organizationId: currentOrganizationId,
        email: inviteEmail.trim(),
        role: inviteRole
      });
      
      toast({
        title: "Convite enviado",
        description: `Convite foi enviado para ${inviteEmail}`,
      });
      
      setInviteDialog(false);
      setInviteEmail("");
      setInviteRole("member");
    } catch (error) {
      toast({
        title: "Erro ao enviar convite",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4" />;
      case 'manager':
        return <Shield className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'manager':
        return 'Gerente';
      default:
        return 'Membro';
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive' as const;
      case 'manager':
        return 'default' as const;
      default:
        return 'secondary' as const;
    }
  };

  if (isLoading || !organization) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 animate-spin" />
            <span>Carregando membros...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Membros da Organização
            </CardTitle>
            <CardDescription>
              Gerencie os membros de {organization.name}
            </CardDescription>
          </div>
          
          <Dialog open={inviteDialog} onOpenChange={setInviteDialog}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Convidar Membro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Convidar Novo Membro</DialogTitle>
                <DialogDescription>
                  Envie um convite para alguém se juntar à organização
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@exemplo.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="role">Função</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Membro</SelectItem>
                      <SelectItem value="manager">Gerente</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setInviteDialog(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleInvite}
                    disabled={!inviteEmail.trim() || inviteMember.isPending}
                  >
                    {inviteMember.isPending ? "Enviando..." : "Enviar Convite"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum membro encontrado</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {getRoleIcon(member.role)}
                    </div>
                    <div>
                      <p className="font-medium">{member.user_id}</p>
                      <p className="text-sm text-muted-foreground">
                        Entrou em {new Date(member.joined_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  
                  <Badge variant={getRoleBadgeVariant(member.role)}>
                    {getRoleLabel(member.role)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
          
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Total de membros: {members.length}</span>
              <span>Limite: {organization.max_users}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mt-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all" 
                style={{ width: `${Math.min((members.length / organization.max_users) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};