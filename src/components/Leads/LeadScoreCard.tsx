import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Lead } from "@/hooks/useLeads";
import { ScoringCriteria, ScoringWeights } from "@/hooks/useLeadScoring";
import { Star, Settings, TrendingUp, Phone, Mail, Building, MapPin, Target, Clock } from "lucide-react";
import { useState } from "react";

interface LeadScoreCardProps {
  lead: Lead & {
    score: number;
    scoringBreakdown?: {
      criteria: ScoringCriteria;
      weights: ScoringWeights;
      totalScore: number;
    };
  };
  onWeightsChange?: (weights: Partial<ScoringWeights>) => void;
  showBreakdown?: boolean;
}

export const LeadScoreCard = ({ 
  lead, 
  onWeightsChange, 
  showBreakdown = true 
}: LeadScoreCardProps) => {
  const [customWeights, setCustomWeights] = useState<ScoringWeights>({
    contactInfo: 0.25,
    businessProfile: 0.30,
    location: 0.15,
    niche: 0.20,
    engagement: 0.10
  });

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-yellow-600";
    if (score >= 4) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 8) return "Excelente";
    if (score >= 6) return "Bom";
    if (score >= 4) return "Médio";
    return "Baixo";
  };

  const getScoreDescription = (score: number) => {
    if (score >= 8) return "Lead de alta qualidade, prioridade máxima para contato";
    if (score >= 6) return "Lead qualificado, boa oportunidade de conversão";
    if (score >= 4) return "Lead com potencial médio, necessita qualificação";
    return "Lead de baixa qualidade, revisar dados";
  };

  const criteriaIcons = {
    hasPhone: Phone,
    hasEmail: Mail,
    businessQuality: Building,
    cityScore: MapPin,
    nicheScore: Target,
    responseTime: Clock,
    engagementLevel: TrendingUp
  };

  const criteriaLabels = {
    hasPhone: "Telefone",
    hasEmail: "E-mail", 
    businessQuality: "Qualidade Empresa",
    cityScore: "Cidade",
    nicheScore: "Nicho",
    responseTime: "Tempo Resposta",
    engagementLevel: "Engajamento"
  };

  const handleWeightChange = (key: keyof ScoringWeights, value: number) => {
    const newWeights = { ...customWeights, [key]: value / 100 };
    setCustomWeights(newWeights);
    onWeightsChange?.(newWeights);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Star className={`h-6 w-6 ${getScoreColor(lead.score)}`} />
            <span className={`text-3xl font-bold ${getScoreColor(lead.score)}`}>
              {lead.score}
            </span>
          </div>
          <div>
            <Badge variant={lead.score >= 7 ? "default" : lead.score >= 4 ? "secondary" : "destructive"}>
              {getScoreLabel(lead.score)}
            </Badge>
            <p className="text-sm text-muted-foreground mt-1">
              {getScoreDescription(lead.score)}
            </p>
          </div>
        </div>
        
        {onWeightsChange && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Configurar Pesos
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Configurar Pesos do Scoring</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {Object.entries(customWeights).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-sm">
                        {key === 'contactInfo' ? 'Informações de Contato' :
                         key === 'businessProfile' ? 'Perfil do Negócio' :
                         key === 'location' ? 'Localização' :
                         key === 'niche' ? 'Nicho' : 'Engajamento'}
                      </Label>
                      <span className="text-sm font-medium">{(value * 100).toFixed(0)}%</span>
                    </div>
                    <Slider
                      value={[value * 100]}
                      onValueChange={(values) => handleWeightChange(key as keyof ScoringWeights, values[0])}
                      max={50}
                      min={0}
                      step={5}
                      className="w-full"
                    />
                  </div>
                ))}
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Total: {(Object.values(customWeights).reduce((sum, val) => sum + val, 0) * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Score Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span>Score Geral</span>
          <span className={getScoreColor(lead.score)}>{lead.score}/10</span>
        </div>
        <Progress value={lead.score * 10} className="h-2" />
      </div>

      {/* Scoring Breakdown */}
      {showBreakdown && lead.scoringBreakdown && (
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Detalhamento do Score</h4>
          <div className="grid gap-3">
            {Object.entries(lead.scoringBreakdown.criteria).map(([key, value]) => {
              const Icon = criteriaIcons[key as keyof ScoringCriteria];
              const label = criteriaLabels[key as keyof ScoringCriteria];
              
              return (
                <div key={key} className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm truncate">{label}</span>
                      <span className="text-sm font-medium">{value.toFixed(1)}</span>
                    </div>
                    <Progress value={value * 10} className="h-1" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quality Indicators */}
          <div className="pt-4 border-t">
            <h5 className="font-medium text-sm mb-2">Indicadores de Qualidade</h5>
            <div className="flex flex-wrap gap-2">
              {lead.phone && (
                <Badge variant="outline" className="text-xs">
                  <Phone className="h-3 w-3 mr-1" />
                  Telefone
                </Badge>
              )}
              {lead.email && (
                <Badge variant="outline" className="text-xs">
                  <Mail className="h-3 w-3 mr-1" />
                  E-mail
                </Badge>
              )}
              {lead.niche && (
                <Badge variant="outline" className="text-xs">
                  <Target className="h-3 w-3 mr-1" />
                  {lead.niche}
                </Badge>
              )}
              {lead.business && lead.business.length > 10 && (
                <Badge variant="outline" className="text-xs">
                  <Building className="h-3 w-3 mr-1" />
                  Empresa Estabelecida
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="mt-6 pt-4 border-t">
        <h5 className="font-medium text-sm mb-2">Recomendações</h5>
        <div className="text-xs text-muted-foreground space-y-1">
          {lead.score >= 8 && (
            <p>• Contactar imediatamente, alta probabilidade de conversão</p>
          )}
          {lead.score >= 6 && lead.score < 8 && (
            <p>• Lead qualificado, incluir em campanha de nurturing</p>
          )}
          {lead.score >= 4 && lead.score < 6 && (
            <p>• Necessita mais qualificação antes do contato direto</p>
          )}
          {lead.score < 4 && (
            <p>• Revisar dados do lead e considerar re-segmentação</p>
          )}
          {!lead.phone && !lead.email && (
            <p>• Buscar informações de contato adicionais</p>
          )}
          {lead.status === 'novo' && (
            <p>• Lead ainda não contactado, ação necessária</p>
          )}
        </div>
      </div>
    </Card>
  );
};