import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MessageSquare, Clock, Settings, Save } from "lucide-react";
import { useAutoReplySettings, useUpdateAutoReplySettings } from "@/hooks/useAutoReplySettings";
import { useAIPersonas } from "@/hooks/useAIPersonas";

const WEEKDAYS = [
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

export const AutoReplySettings = () => {
  const { toast } = useToast();
  const { data: settings, isLoading } = useAutoReplySettings();
  const { data: personas = [] } = useAIPersonas();
  const updateSettings = useUpdateAutoReplySettings();
  
  const [formData, setFormData] = useState(settings);

  // Update form data when settings load
  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleSave = async () => {
    if (!formData) return;
    
    try {
      await updateSettings.mutateAsync(formData);
      toast({
        title: "Configurações salvas",
        description: "As configurações de resposta automática foram atualizadas",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações",
        variant: "destructive",
      });
    }
  };

  const toggleWeekday = (day: number) => {
    if (!formData) return;
    
    const newDays = formData.business_days.includes(day)
      ? formData.business_days.filter(d => d !== day)
      : [...formData.business_days, day].sort();
      
    setFormData({ ...formData, business_days: newDays });
  };

  if (isLoading || !formData) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-brand-primary to-brand-primary-light rounded-lg">
          <MessageSquare className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Respostas Automáticas</h2>
          <p className="text-muted-foreground">Configure respostas inteligentes para mensagens recebidas</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Status and Basic Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações Gerais
            </CardTitle>
            <CardDescription>
              Ativar e configurar o comportamento básico
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Respostas Automáticas</Label>
                <p className="text-sm text-muted-foreground">
                  Ativar resposta automática a mensagens
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Atraso antes de responder (minutos)</Label>
              <Input
                type="number"
                value={formData.auto_reply_delay_minutes}
                onChange={(e) => 
                  setFormData({ ...formData, auto_reply_delay_minutes: parseInt(e.target.value) })
                }
                min={0}
                max={60}
              />
              <p className="text-xs text-muted-foreground">
                Tempo de espera antes de enviar a resposta automática
              </p>
            </div>

            <div className="space-y-2">
              <Label>Máximo de respostas por lead por dia</Label>
              <Input
                type="number"
                value={formData.max_replies_per_lead}
                onChange={(e) => 
                  setFormData({ ...formData, max_replies_per_lead: parseInt(e.target.value) })
                }
                min={1}
                max={10}
              />
              <p className="text-xs text-muted-foreground">
                Evita spam limitando respostas automáticas por lead
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Business Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Horário Comercial
            </CardTitle>
            <CardDescription>
              Definir quando as respostas automáticas devem funcionar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Horário de Início</Label>
                <Input
                  type="time"
                  value={formData.business_hours_start}
                  onChange={(e) => 
                    setFormData({ ...formData, business_hours_start: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Horário de Fim</Label>
                <Input
                  type="time"
                  value={formData.business_hours_end}
                  onChange={(e) => 
                    setFormData({ ...formData, business_hours_end: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dias da Semana</Label>
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map((day) => (
                  <Button
                    key={day.value}
                    variant={formData.business_days.includes(day.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleWeekday(day.value)}
                    className="text-xs"
                  >
                    {day.label.substring(0, 3)}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Clique nos dias para ativar/desativar
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração da IA</CardTitle>
          <CardDescription>
            Escolha a persona e instruções personalizadas para as respostas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Persona de IA</Label>
            <Select 
              value={formData.persona_id || ""} 
              onValueChange={(value) => 
                setFormData({ ...formData, persona_id: value || undefined })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma persona (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhuma persona específica</SelectItem>
                {personas.map((persona) => (
                  <SelectItem key={persona.id} value={persona.id}>
                    <div className="flex items-center gap-2">
                      {persona.name}
                      <Badge variant="outline" className="text-xs">
                        {persona.tone}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Instruções Personalizadas</Label>
            <Textarea
              value={formData.custom_prompt || ""}
              onChange={(e) => 
                setFormData({ ...formData, custom_prompt: e.target.value })
              }
              placeholder="Instruções específicas para as respostas automáticas..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Instruções adicionais que a IA deve seguir ao responder
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={updateSettings.isPending}
          size="lg"
        >
          {updateSettings.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
};