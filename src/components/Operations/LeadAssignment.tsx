import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Lead } from "@/hooks/useLeads";
import { useToast } from "@/hooks/use-toast";
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
  const [teamMembers] = useState<TeamMember[]>([
    {
      id: '1',
      name: 'Ana Silva',
      email: 'ana@empresa.com',
      role: 'senior',
      status: 'available',
      assignedLeads: 15,
      capacity: 25,
      conversionRate: 32.5,
      averageResponseTime: 2.5,
      specialties: ['tecnologia', 'saúde']
    },
    {
      id: '2',
      name: 'Carlos Santos',
      email: 'carlos@empresa.com',
      role: 'junior',
      status: 'busy',
      assignedLeads: 22,
      capacity: 20,
      conversionRate: 18.2,
      averageResponseTime: 4.1,
      specialties: ['educação', 'retail']
    },
    {
      id: '3',
      name: 'Marina Costa',
      email: 'marina@empresa.com',
      role: 'senior',
      status: 'available',
      assignedLeads: 18,
      capacity: 30,
      conversionRate: 41.8,
      averageResponseTime: 1.8,
      specialties: ['financeiro', 'b2b']
    },
    {
      id: '4',
      name: 'João Oliveira',
      email: 'joao@empresa.com',
      role: 'manager',
      status: 'available',
      assignedLeads: 8,
      capacity: 15,
      conversionRate: 58.3,
      averageResponseTime: 1.2,
      specialties: ['enterprise', 'high-value']
    }
  ]);

  const [assignmentRules] = useState<AssignmentRule[]>([
    {
      id: '1',
      name: 'Leads Premium',
      criteria: {
        scoreRange: [8, 10],
        sources: ['website', 'referral'],
        niches: ['tecnologia', 'financeiro']
      },
      assignTo: ['4'], // Manager
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
      assignTo: ['1', '3'], // Seniors
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
      assignTo: ['2'], // Junior
      isActive: true
    }
  ]);

  const [selectedMember, setSelectedMember] = useState<string>("");
  const [assignmentMode, setAssignmentMode] = useState<'manual' | 'automatic'>('automatic');
  
  const { toast } = useToast();

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

  const handleAutoAssign = () => {
    toast({
      title: "Atribuição Automática",
      description: "12 leads foram distribuídos automaticamente baseado nas regras configuradas",
    });
  };

  const handleRebalance = () => {
    toast({
      title: "Redistribuição Realizada",
      description: "Leads foram redistribuídos para balancear a carga de trabalho",
    });
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
              {(teamMembers.reduce((acc, m) => acc + m.conversionRate, 0) / teamMembers.length).toFixed(1)}%
            </div>
            <p className="text-sm text-muted-foreground">Taxa Média de Conversão</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold">
              {(teamMembers.reduce((acc, m) => acc + m.averageResponseTime, 0) / teamMembers.length).toFixed(1)}h
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
                        value={(member.assignedLeads / member.capacity) * 100} 
                        className="h-1"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={member.assignedLeads >= member.capacity ? "destructive" : 
                               member.assignedLeads > member.capacity * 0.8 ? "secondary" : "outline"}
                    >
                      {((member.assignedLeads / member.capacity) * 100).toFixed(0)}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-green-600" />
                      <span className="font-medium">{member.conversionRate}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span>{member.averageResponseTime}h</span>
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