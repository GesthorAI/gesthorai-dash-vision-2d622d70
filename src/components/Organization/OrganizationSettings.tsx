import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useCurrentOrganization, useUpdateOrganization } from "@/hooks/useOrganizations";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { Building2, Settings, Crown, Users, Target } from "lucide-react";

export const OrganizationSettings = () => {
  const { currentOrganizationId } = useOrganizationContext();
  const { data: organization, isLoading } = useCurrentOrganization(currentOrganizationId || undefined);
  const updateOrganization = useUpdateOrganization();
  const { toast } = useToast();
  
  const [name, setName] = useState(organization?.name || "");
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async () => {
    if (!currentOrganizationId || !name.trim()) return;
    
    try {
      await updateOrganization.mutateAsync({
        id: currentOrganizationId,
        data: { name: name.trim() }
      });
      
      toast({
        title: "Organização atualizada",
        description: "As alterações foram salvas com sucesso",
      });
      
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Erro ao atualizar organização",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const getPlanBadgeVariant = (plan: string) => {
    switch (plan) {
      case 'pro':
        return 'default' as const;
      case 'enterprise':
        return 'destructive' as const;
      default:
        return 'secondary' as const;
    }
  };

  const getPlanLabel = (plan: string) => {
    switch (plan) {
      case 'pro':
        return 'Plano Pro';
      case 'enterprise':
        return 'Plano Enterprise';
      default:
        return 'Plano Gratuito';
    }
  };

  if (isLoading || !organization) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5 animate-spin" />
            <span>Carregando configurações...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Informações Gerais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Informações da Organização
          </CardTitle>
          <CardDescription>
            Configure as informações básicas da sua organização
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="org-name">Nome da Organização</Label>
              <div className="flex gap-2">
                <Input
                  id="org-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Nome da organização"
                />
                {isEditing ? (
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSave}
                      disabled={updateOrganization.isPending || !name.trim()}
                    >
                      {updateOrganization.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsEditing(false);
                        setName(organization.name);
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    Editar
                  </Button>
                )}
              </div>
            </div>
            
            <div>
              <Label>Identificador</Label>
              <Input value={organization.slug} disabled />
              <p className="text-sm text-muted-foreground mt-1">
                Identificador único da organização (não pode ser alterado)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plano e Limites */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Plano e Limites
          </CardTitle>
          <CardDescription>
            Informações sobre seu plano atual e limites
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <Label>Plano Atual</Label>
                <div className="mt-2">
                  <Badge variant={getPlanBadgeVariant(organization.plan)}>
                    {getPlanLabel(organization.plan)}
                  </Badge>
                </div>
              </div>
              
              <div>
                <Label>Data de Criação</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(organization.created_at).toLocaleDateString('pt-BR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <strong>Usuários:</strong> Até {organization.max_users} membros
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <strong>Leads:</strong> Até {organization.max_leads.toLocaleString()} leads
                </span>
              </div>
            </div>
          </div>
          
          {organization.plan === 'free' && (
            <div className="mt-6 p-4 border rounded-lg bg-muted/50">
              <h4 className="font-medium mb-2">Upgrade para Pro</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Obtenha mais recursos, usuários ilimitados e leads ilimitados
              </p>
              <Button size="sm">
                Fazer Upgrade
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};