import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useTeamMembers } from "@/hooks/useTeam";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Settings, Plus, X, Target, Users } from "lucide-react";

interface AssignmentRule {
  id?: string;
  name: string;
  criteria: {
    scoreRange: [number, number];
    sources: string[];
    niches: string[];
    cities: string[];
  };
  assign_to: string[];
  is_active: boolean;
}

interface AssignmentRulesManagerProps {
  rules: AssignmentRule[];
  onRulesChange: () => void;
}

export const AssignmentRulesManager = ({ rules, onRulesChange }: AssignmentRulesManagerProps) => {
  const [showCreateRule, setShowCreateRule] = useState(false);
  const [editingRule, setEditingRule] = useState<AssignmentRule | null>(null);
  const [newRule, setNewRule] = useState<AssignmentRule>({
    name: "",
    criteria: {
      scoreRange: [0, 10],
      sources: [],
      niches: [],
      cities: []
    },
    assign_to: [],
    is_active: false
  });

  const { data: teamMembers = [] } = useTeamMembers();
  const { user } = useAuth();
  const { toast } = useToast();

  const sourceOptions = ['website', 'facebook', 'instagram', 'google', 'referral', 'cold_outreach'];
  const nicheOptions = ['tecnologia', 'financeiro', 'saude', 'educacao', 'ecommerce', 'servicos'];
  const cityOptions = ['sao-paulo', 'rio-de-janeiro', 'belo-horizonte', 'brasilia', 'salvador', 'fortaleza'];

  const handleCreateRule = async () => {
    if (!newRule.name || newRule.assign_to.length === 0) {
      toast({
        title: "Erro",
        description: "Preencha o nome e selecione pelo menos um membro da equipe",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('assignment_rules')
        .insert({
          user_id: user?.id,
          name: newRule.name,
          criteria: newRule.criteria,
          assign_to: newRule.assign_to,
          is_active: newRule.is_active
        });

      if (error) throw error;

      toast({
        title: "Regra Criada",
        description: "Nova regra de atribuição foi criada com sucesso",
      });

      setNewRule({
        name: "",
        criteria: {
          scoreRange: [0, 10],
          sources: [],
          niches: [],
          cities: []
        },
        assign_to: [],
        is_active: false
      });
      setShowCreateRule(false);
      onRulesChange();
    } catch (error) {
      console.error('Erro ao criar regra:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a regra",
        variant: "destructive"
      });
    }
  };

  const handleToggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('assignment_rules')
        .update({ is_active: isActive })
        .eq('id', ruleId);

      if (error) throw error;

      toast({
        title: "Regra Atualizada",
        description: `Regra foi ${isActive ? 'ativada' : 'desativada'} com sucesso`,
      });

      onRulesChange();
    } catch (error) {
      console.error('Erro ao atualizar regra:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a regra",
        variant: "destructive"
      });
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from('assignment_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      toast({
        title: "Regra Excluída",
        description: "Regra foi excluída com sucesso",
      });

      onRulesChange();
    } catch (error) {
      console.error('Erro ao excluir regra:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a regra",
        variant: "destructive"
      });
    }
  };

  const toggleArrayItem = (array: string[], item: string, setter: (newArray: string[]) => void) => {
    if (array.includes(item)) {
      setter(array.filter(i => i !== item));
    } else {
      setter([...array, item]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Regras de Atribuição</h3>
          <p className="text-sm text-muted-foreground">
            Configure como leads são automaticamente distribuídos para a equipe
          </p>
        </div>
        <Button onClick={() => setShowCreateRule(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Regra
        </Button>
      </div>

      {rules.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma regra configurada</h3>
            <p className="text-muted-foreground mb-4">
              Crie regras para distribuir leads automaticamente baseado em critérios específicos
            </p>
            <Button onClick={() => setShowCreateRule(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Regra
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">{rule.name}</CardTitle>
                    <Badge variant={rule.is_active ? "default" : "secondary"}>
                      {rule.is_active ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={(checked) => rule.id && handleToggleRule(rule.id, checked)}
                    />
                    <Button variant="ghost" size="sm" onClick={() => rule.id && handleDeleteRule(rule.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Score: {rule.criteria.scoreRange[0]} - {rule.criteria.scoreRange[1]}</Label>
                  </div>
                  
                  {rule.criteria.sources.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">Fontes:</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {rule.criteria.sources.map(source => (
                          <Badge key={source} variant="outline" className="text-xs">
                            {source}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {rule.criteria.niches.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">Nichos:</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {rule.criteria.niches.map(niche => (
                          <Badge key={niche} variant="outline" className="text-xs">
                            {niche}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className="text-sm font-medium">Atribuído para:</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {rule.assign_to.map(memberId => {
                        const member = teamMembers.find(m => m.id === memberId);
                        return member ? (
                          <Badge key={memberId} variant="secondary" className="text-xs gap-1">
                            <Users className="h-3 w-3" />
                            {member.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Rule Dialog */}
      <Dialog open={showCreateRule} onOpenChange={setShowCreateRule}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Regra de Atribuição</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div>
              <Label htmlFor="rule-name">Nome da Regra</Label>
              <Input
                id="rule-name"
                placeholder="Ex: Leads Premium"
                value={newRule.name}
                onChange={(e) => setNewRule({...newRule, name: e.target.value})}
              />
            </div>

            <div>
              <Label>Faixa de Score: {newRule.criteria.scoreRange[0]} - {newRule.criteria.scoreRange[1]}</Label>
              <Slider
                value={newRule.criteria.scoreRange}
                onValueChange={(value) => setNewRule({
                  ...newRule, 
                  criteria: {...newRule.criteria, scoreRange: value as [number, number]}
                })}
                max={10}
                min={0}
                step={1}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Fontes (Opcional)</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {sourceOptions.map(source => (
                  <label key={source} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRule.criteria.sources.includes(source)}
                      onChange={() => toggleArrayItem(
                        newRule.criteria.sources, 
                        source, 
                        (sources) => setNewRule({
                          ...newRule, 
                          criteria: {...newRule.criteria, sources}
                        })
                      )}
                      className="rounded"
                    />
                    <span className="text-sm">{source}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label>Nichos (Opcional)</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {nicheOptions.map(niche => (
                  <label key={niche} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRule.criteria.niches.includes(niche)}
                      onChange={() => toggleArrayItem(
                        newRule.criteria.niches, 
                        niche, 
                        (niches) => setNewRule({
                          ...newRule, 
                          criteria: {...newRule.criteria, niches}
                        })
                      )}
                      className="rounded"
                    />
                    <span className="text-sm">{niche}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label>Atribuir para *</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {teamMembers.map(member => (
                  <label key={member.id} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRule.assign_to.includes(member.id)}
                      onChange={() => toggleArrayItem(
                        newRule.assign_to, 
                        member.id, 
                        (assign_to) => setNewRule({...newRule, assign_to})
                      )}
                      className="rounded"
                    />
                    <span className="text-sm">{member.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={newRule.is_active}
                onCheckedChange={(checked) => setNewRule({...newRule, is_active: checked})}
              />
              <Label>Ativar regra imediatamente</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateRule(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateRule}>
                Criar Regra
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};