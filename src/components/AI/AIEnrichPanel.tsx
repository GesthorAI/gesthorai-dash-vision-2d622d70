import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useAIEnrich } from '@/hooks/useAIEnrich';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Brain, Sparkles } from 'lucide-react';

interface AIEnrichProps {
  leads: Array<{
    id: string;
    name: string;
    business: string;
    phone?: string;
    email?: string;
    city?: string;
    niche?: string;
  }>;
  onEnrichmentComplete?: (enrichedLeads: any[]) => void;
}

const ENRICHMENT_FIELDS = [
  { id: 'niche', label: 'Nicho/Segmento', description: 'Inferir setor de atuação' },
  { id: 'business_size', label: 'Porte da Empresa', description: 'MEI, Micro, Pequena, Média' },
  { id: 'potential_value', label: 'Valor Potencial', description: 'Estimativa de valor do lead' },
  { id: 'contact_preference', label: 'Preferência de Contato', description: 'WhatsApp, Email, Telefone' },
  { id: 'urgency', label: 'Urgência', description: 'Baixa, Média, Alta' },
  { id: 'ideal_time', label: 'Horário Ideal', description: 'Melhor período para contato' },
];

export const AIEnrichPanel: React.FC<AIEnrichProps> = ({ leads, onEnrichmentComplete }) => {
  const { toast } = useToast();
  const [selectedFields, setSelectedFields] = useState<string[]>(['niche', 'business_size', 'potential_value']);
  const [enrichedLeads, setEnrichedLeads] = useState<any[]>([]);
  
  const enrichRequest = useAIEnrich();

  const handleFieldToggle = (fieldId: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const handleEnrich = async () => {
    if (selectedFields.length === 0) {
      toast({
        title: "Selecione Campos",
        description: "Escolha pelo menos um campo para enriquecimento",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await enrichRequest.mutateAsync({
        leads,
        enrichment_fields: selectedFields
      });

      setEnrichedLeads(result.enriched_leads);
      onEnrichmentComplete?.(result.enriched_leads);

      toast({
        title: "Enriquecimento Concluído",
        description: `${result.total_enriched} leads enriquecidos com sucesso`,
      });
    } catch (error) {
      toast({
        title: "Erro no Enriquecimento",
        description: "Não foi possível enriquecer os leads",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Enriquecimento
          </CardTitle>
          <CardDescription>
            Use IA para inferir informações adicionais sobre seus leads
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <label className="text-sm font-medium">Campos para Enriquecer:</label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ENRICHMENT_FIELDS.map((field) => (
                <div key={field.id} className="flex items-start space-x-2">
                  <Checkbox
                    id={field.id}
                    checked={selectedFields.includes(field.id)}
                    onCheckedChange={() => handleFieldToggle(field.id)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor={field.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {field.label}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {field.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button 
            onClick={handleEnrich}
            disabled={enrichRequest.isPending || leads.length === 0 || selectedFields.length === 0}
            className="w-full"
          >
            {enrichRequest.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enriquecendo {leads.length} leads...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Enriquecer Leads ({leads.length})
              </>
            )}
          </Button>

          {enrichedLeads.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  {enrichedLeads.length} leads enriquecidos
                </span>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {enrichedLeads.slice(0, 5).map((enriched, index) => (
                  <Card key={index} className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">
                          Lead {index + 1}
                        </Badge>
                        <Badge variant="secondary">
                          {Math.round(enriched.enriched_data.confidence_score * 100)}% confiança
                        </Badge>
                      </div>
                      
                      <div className="text-xs space-y-1">
                        {Object.entries(enriched.enriched_data).map(([key, value]) => {
                          if (key === 'confidence_score') return null;
                          return (
                            <div key={key}>
                              <strong>{key}:</strong> {value as string}
                            </div>
                          );
                        })}
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        <strong>Análise:</strong> {enriched.rationale}
                      </p>
                    </div>
                  </Card>
                ))}
                
                {enrichedLeads.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    E mais {enrichedLeads.length - 5} leads enriquecidos...
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};