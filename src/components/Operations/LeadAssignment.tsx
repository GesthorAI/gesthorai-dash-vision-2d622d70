import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Lead, useLeads } from "@/hooks/useLeads";
import { useToast } from "@/hooks/use-toast";
import { useTeamMembers } from "@/hooks/useTeam";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  UserPlus, 
  BarChart3, 
  Clock, 
  Target,
  Trophy,
  TrendingUp,
  UserCheck,
  AlertCircle,
  Settings
} from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'junior' | 'senior' | 'manager';
  status: 'available' | 'busy' | 'offline';
  assignedLeads: number;
  capacity: number;
  conversionRate: number;
  averageResponseTime: number; // in hours
  specialties: string[];
}

interface AssignmentRule {
  id: string;
  name: string;
  criteria: {
    scoreRange: [number, number];
    sources: string[];
    niches: string[];
  };
  assignTo: string[];
  isActive: boolean;
}

export const LeadAssignment = () => {
  const { data: teamMembersData = [] } = useTeamMembers();
  const { data: allLeads = [] } = useLeads();
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [assignmentMode, setAssignmentMode] = useState<'manual' | 'automatic'>('automatic');
  
  const { toast } = useToast();

  // Calculate real statistics for each team member
  const teamMembers = teamMembersData.map(member => {
    const assignedLeads = allLeads.filter(lead => lead.assigned_to === member.id);
    const assignedCount = assignedLeads.length;
    
    return {
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role as 'junior' | 'senior' | 'manager',
      status: member.status as 'available' | 'busy' | 'offline',
      assignedLeads: assignedCount,
      capacity: member.capacity,
      conversionRate: Math.random() * 50 + 10, // Mock for now
      averageResponseTime: Math.random() * 5 + 1, // Mock for now
      specialties: member.specialties
    };
  });

  // Mock assignment rules for now - these could be fetched from assignment_rules table
  const assignmentRules: AssignmentRule[] = [
    {
      id: '1',
      name: 'Leads Premium',
      criteria: {
        scoreRange: [8, 10],
        sources: ['website', 'referral'],
        niches: ['tecnologia', 'financeiro']
      },
      assignTo: teamMembers.filter(m => m.role === 'manager').map(m => m.id),
      isActive: true
    },
    {
      id: '2',
      name: 'Leads Qualificados',
      criteria: {
        scoreRange: [6, 7],
        sources: ['all'],
        niches: ['all']
      },
      assignTo: teamMembers.filter(m => m.role === 'senior').map(m => m.id),
      isActive: true
    },
    {
      id: '3',
      name: 'Leads Iniciantes',
      criteria: {
        scoreRange: [3, 5],
        sources: ['all'],
        niches: ['all']
      },
      assignTo: teamMembers.filter(m => m.role === 'junior').map(m => m.id),
      isActive: true
    }
  ];

  const getStatusColor = (status: TeamMember['status']) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: TeamMember['status']) => {
    switch (status) {
      case 'available': return 'Disponível';
      case 'busy': return 'Ocupado';
      case 'offline': return 'Offline';
      default: return 'Desconhecido';
    }
  };

  const getRoleLabel = (role: TeamMember['role']) => {
    switch (role) {
      case 'junior': return 'Júnior';
      case 'senior': return 'Sênior';
      case 'manager': return 'Manager';
      default: return role;
    }
  };

  const getRoleBadgeVariant = (role: TeamMember['role']) => {
    switch (role) {
      case 'junior': return 'secondary' as const;
      case 'senior': return 'default' as const;
      case 'manager': return 'destructive' as const;
      default: return 'outline' as const;
    }
  };

  const handleAutoAssign = async () => {
    try {
      // Get unassigned leads
      const unassignedLeads = allLeads.filter(lead => !lead.assigned_to);
      let assignedCount = 0;

      for (const lead of unassignedLeads) {
        // Find matching rule
        const matchingRule = assignmentRules.find(rule => {
          if (!rule.isActive) return false;
          
          const score = lead.score || 0;
          const scoreInRange = score >= rule.criteria.scoreRange[0] && score <= rule.criteria.scoreRange[1];
          
          return scoreInRange;
        });

        if (matchingRule && matchingRule.assignTo.length > 0) {
          // Find team member with lowest current load
          const availableMembers = teamMembers.filter(m => 
            matchingRule.assignTo.includes(m.id) && 
            m.assignedLeads < m.capacity
          );
          
          if (availableMembers.length > 0) {
            const bestMember = availableMembers.reduce((prev, curr) => 
              (prev.assignedLeads / prev.capacity) < (curr.assignedLeads / curr.capacity) ? prev : curr
            );

            // Assign lead
            await supabase
              .from('leads')
              .update({ assigned_to: bestMember.id })
              .eq('id', lead.id);

            // Create assignment record
            await supabase
              .from('lead_assignments')
              .insert({
                lead_id: lead.id,
                team_member_id: bestMember.id,
                assigned_by: (await supabase.auth.getUser()).data.user?.id
              });

            assignedCount++;
          }
        }
      }

      toast({
        title: "Atribuição Automática",
        description: `${assignedCount} leads foram distribuídos automaticamente baseado nas regras configuradas`,
      });
    } catch (error) {
      console.error('Erro na atribuição automática:', error);
      toast({
        title: "Erro",
        description: "Não foi possível executar a atribuição automática",
        variant: "destructive"
      });
    }
  };

  const handleRebalance = async () => {
    try {
      // Get all assigned leads
      const assignedLeads = allLeads.filter(lead => lead.assigned_to);
      let rebalancedCount = 0;

      // Calculate average load
      const totalCapacity = teamMembers.reduce((acc, member) => acc + member.capacity, 0);
      const totalAssigned = teamMembers.reduce((acc, member) => acc + member.assignedLeads, 0);
      const targetLoad = totalAssigned / teamMembers.length;

      // Redistribute from overloaded to underloaded members
      const overloadedMembers = teamMembers.filter(m => m.assignedLeads > targetLoad);
      const underloadedMembers = teamMembers.filter(m => m.assignedLeads < m.capacity);

      for (const overloadedMember of overloadedMembers) {
        const excess = Math.floor(overloadedMember.assignedLeads - targetLoad);
        const memberLeads = assignedLeads.filter(lead => lead.assigned_to === overloadedMember.id);

        for (let i = 0; i < Math.min(excess, memberLeads.length); i++) {
          const availableUnderloaded = underloadedMembers.filter(m => m.assignedLeads < m.capacity);
          if (availableUnderloaded.length === 0) break;

          const targetMember = availableUnderloaded[0];
          
          // Reassign lead
          await supabase
            .from('leads')
            .update({ assigned_to: targetMember.id })
            .eq('id', memberLeads[i].id);

          // Create new assignment record
          await supabase
            .from('lead_assignments')
            .insert({
              lead_id: memberLeads[i].id,
              team_member_id: targetMember.id,
              assigned_by: (await supabase.auth.getUser()).data.user?.id
            });

          rebalancedCount++;
          targetMember.assignedLeads++;
        }
      }

      toast({
        title: "Redistribuição Realizada",
        description: `${rebalancedCount} leads foram redistribuídos para balancear a carga de trabalho`,
      });
    } catch (error) {
      console.error('Erro no rebalanceamento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível executar o rebalanceamento",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestão de Equipe</h2>
          <p className="text-muted-foreground">
            Distribua leads e monitore performance da equipe
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRebalance}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Rebalancear
          </Button>
          <Button onClick={handleAutoAssign}>
            <UserPlus className="h-4 w-4 mr-2" />
            Atribuir Automaticamente
          </Button>
        </div>
      </div>

      {/* Team Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{teamMembers.length}</div>
            <p className="text-sm text-muted-foreground">Membros da Equipe</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Target className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold">
              {teamMembers.reduce((acc, m) => acc + m.assignedLeads, 0)}
            </div>
            <p className="text-sm text-muted-foreground">Leads Atribuídos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
            <div className="text-2xl font-bold">
              {teamMembers.length > 0 ? (teamMembers.reduce((acc, m) => acc + m.conversionRate, 0) / teamMembers.length).toFixed(1) : '0'}%
            </div>
            <p className="text-sm text-muted-foreground">Taxa Média de Conversão</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold">
              {teamMembers.length > 0 ? (teamMembers.reduce((acc, m) => acc + m.averageResponseTime, 0) / teamMembers.length).toFixed(1) : '0'}h
            </div>
            <p className="text-sm text-muted-foreground">Tempo Médio de Resposta</p>
          </CardContent>
        </Card>
      </div>

      {/* Team Members List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Membros da Equipe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membro</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Leads Atribuídos</TableHead>
                <TableHead>Capacidade</TableHead>
                <TableHead>Taxa de Conversão</TableHead>
                <TableHead>Tempo de Resposta</TableHead>
                <TableHead>Especialidades</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getRoleBadgeVariant(member.role)}>
                            {getRoleLabel(member.role)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(member.status)}`} />
                      <span className="text-sm">{getStatusLabel(member.status)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{member.assignedLeads}/{member.capacity}</div>
                      <Progress 
                        value={member.capacity > 0 ? (member.assignedLeads / member.capacity) * 100 : 0} 
                        className="h-1"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={member.assignedLeads >= member.capacity ? "destructive" : 
                               member.assignedLeads > member.capacity * 0.8 ? "secondary" : "outline"}
                    >
                      {member.capacity > 0 ? ((member.assignedLeads / member.capacity) * 100).toFixed(0) : '0'}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-green-600" />
                      <span className="font-medium">{member.conversionRate.toFixed(1)}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span>{member.averageResponseTime.toFixed(1)}h</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {member.specialties.slice(0, 2).map((specialty) => (
                        <Badge key={specialty} variant="outline" className="text-xs">
                          {specialty}
                        </Badge>
                      ))}
                      {member.specialties.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{member.specialties.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Assignment Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Regras de Atribuição
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {assignmentRules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{rule.name}</h4>
                    <Badge variant={rule.isActive ? "default" : "secondary"}>
                      {rule.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Score: {rule.criteria.scoreRange[0]}-{rule.criteria.scoreRange[1]} • 
                    Atribuído para: {rule.assignTo.length} membro(s)
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};