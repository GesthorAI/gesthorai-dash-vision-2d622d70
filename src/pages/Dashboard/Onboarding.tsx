import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { useOrganizations, useOrganizationMembers } from "@/hooks/useOrganizations";
import { useWhatsAppInstances } from "@/hooks/useWhatsAppInstances";
import { useAIPersonas } from "@/hooks/useAIPersonas";
import { useAISettings } from "@/hooks/useAISettings";
import { useMessageTemplates } from "@/hooks/useFollowups";
import { useLeads } from "@/hooks/useLeads";
import { useFollowupRuns } from "@/hooks/useFollowups";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  CheckCircle2,
  Circle,
  Building2,
  MessageSquare,
  Brain,
  Users,
  Send,
  BarChart3,
  Settings,
  ArrowRight,
  Target,
  Workflow,
  Zap
} from "lucide-react";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  route: string;
  completed: boolean;
}

export const Onboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentOrganizationId, organizations } = useOrganizationContext();
  
  // Data fetching for completion checks
  const { data: orgData } = useOrganizations();
  const { data: members } = useOrganizationMembers(currentOrganizationId || undefined);
  const { data: whatsappInstances } = useWhatsAppInstances();
  const { data: personas } = useAIPersonas();
  const { data: aiSettings } = useAISettings();
  const { data: templates } = useMessageTemplates();
  const { data: leads } = useLeads();
  const { data: followupRuns } = useFollowupRuns();

  // Fetch assignment rules and workflows
  const { data: assignmentRules } = useQuery({
    queryKey: ['assignment-rules', currentOrganizationId],
    queryFn: async () => {
      if (!currentOrganizationId) return [];
      const { data } = await supabase
        .from('assignment_rules')
        .select('*')
        .eq('organization_id', currentOrganizationId);
      return data || [];
    },
    enabled: !!currentOrganizationId
  });

  const { data: workflows } = useQuery({
    queryKey: ['workflows', currentOrganizationId],
    queryFn: async () => {
      if (!currentOrganizationId) return [];
      const { data } = await supabase
        .from('workflows')
        .select('*')
        .eq('organization_id', currentOrganizationId);
      return data || [];
    },
    enabled: !!currentOrganizationId
  });

  // Define onboarding steps with completion logic
  const steps: OnboardingStep[] = [
    {
      id: "organization",
      title: "Organização",
      description: "Configurar informações da organização",
      icon: Building2,
      route: "/dashboard/organization",
      completed: !!organizations?.length && !!currentOrganizationId
    },
    {
      id: "whatsapp",
      title: "WhatsApp",
      description: "Conectar instância do WhatsApp",
      icon: MessageSquare,
      route: "/dashboard/organization",
      completed: !!(whatsappInstances?.length && whatsappInstances.some(w => 
        (w as any).organization_id === currentOrganizationId && 
        ['open', 'connected'].includes(w.last_status || '')
      ))
    },
    {
      id: "ai",
      title: "Configuração de IA",
      description: "Configurar IA e criar personas",
      icon: Brain,
      route: "/dashboard/settings/ai",
      completed: !!(aiSettings && personas?.length && personas.some(p => p.is_active))
    },
    {
      id: "templates",
      title: "Templates de Mensagem",
      description: "Criar templates para follow-ups",
      icon: Send,
      route: "/dashboard/followups",
      completed: !!(templates?.length && templates.some(t => 
        (t as any).organization_id === currentOrganizationId
      ))
    },
    {
      id: "leads",
      title: "Leads",
      description: "Importar ou capturar leads",
      icon: Target,
      route: "/dashboard/search",
      completed: !!(leads?.length && leads.some(l => l.organization_id === currentOrganizationId))
    },
    {
      id: "team",
      title: "Equipe",
      description: "Convidar membros para a organização",
      icon: Users,
      route: "/dashboard/organization",
      completed: !!(members?.length && members.length > 1) // More than admin
    },
    {
      id: "rules",
      title: "Regras de Atribuição",
      description: "Configurar regras automáticas",
      icon: Settings,
      route: "/dashboard/operations",
      completed: !!(assignmentRules?.length)
    },
    {
      id: "workflows",
      title: "Workflows",
      description: "Criar automações",
      icon: Workflow,
      route: "/dashboard/operations",
      completed: !!(workflows?.length)
    },
    {
      id: "followups",
      title: "Primeiro Follow-up",
      description: "Executar sua primeira campanha",
      icon: Zap,
      route: "/dashboard/followups",
      completed: !!(followupRuns?.length)
    },
    {
      id: "analytics",
      title: "Acompanhar Métricas",
      description: "Ver relatórios e analytics",
      icon: BarChart3,
      route: "/dashboard/analytics",
      completed: !!(followupRuns?.length) // Same as followups for simplicity
    }
  ];

  const completedSteps = steps.filter(step => step.completed).length;
  const totalSteps = steps.length;
  const progressPercentage = Math.round((completedSteps / totalSteps) * 100);

  const handleStepClick = (route: string) => {
    navigate(route);
  };

  const currentOrg = organizations?.find(org => org.id === currentOrganizationId);

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Bem-vindo ao GesthorAI! 
          </h1>
          <p className="text-lg text-muted-foreground">
            Configure sua organização seguindo este guia passo a passo
          </p>
        </div>

        {/* Progress Overview */}
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Progresso do Onboarding</CardTitle>
                <CardDescription className="text-base">
                  {currentOrg?.name || "Sua Organização"} • {completedSteps} de {totalSteps} etapas concluídas
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-primary">{progressPercentage}%</div>
                <div className="text-sm text-muted-foreground">Completo</div>
              </div>
            </div>
            <Progress value={progressPercentage} className="h-3 mt-4" />
          </CardHeader>
        </Card>
      </div>

      {/* Steps Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = step.completed;
          
          return (
            <Card 
              key={step.id}
              className={`transition-all duration-200 hover:shadow-lg cursor-pointer ${
                isCompleted 
                  ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' 
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => handleStepClick(step.route)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      isCompleted 
                        ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Etapa {index + 1}
                        </span>
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <CardTitle className="text-base">{step.title}</CardTitle>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  {step.description}
                </p>
                <Badge 
                  variant={isCompleted ? "default" : "secondary"}
                  className={isCompleted ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" : ""}
                >
                  {isCompleted ? "Concluído" : "Pendente"}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Next Steps */}
      {progressPercentage < 100 && (
        <Card>
          <CardHeader>
            <CardTitle>Próximos Passos</CardTitle>
            <CardDescription>
              Continue configurando sua organização para aproveitar todos os recursos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {steps.filter(step => !step.completed).slice(0, 3).map(step => {
                const Icon = step.icon;
                return (
                  <div key={step.id} className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{step.title}</span>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleStepClick(step.route)}
                    >
                      Configurar
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {progressPercentage === 100 && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
              <div>
                <h3 className="text-2xl font-bold text-green-800 dark:text-green-100">
                  Parabéns! 🎉
                </h3>
                <p className="text-green-700 dark:text-green-200 mt-2">
                  Sua organização está totalmente configurada e pronta para usar!
                </p>
              </div>
              <Button 
                onClick={() => navigate('/dashboard')}
                className="bg-green-600 hover:bg-green-700"
              >
                Ir para Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};