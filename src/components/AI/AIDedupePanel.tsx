import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { useAIDedupe } from '@/hooks/useAIDedupe';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Users, AlertTriangle } from 'lucide-react';

interface AIDedupeProps {
  leads: Array<{
    id: string;
    name: string;
    business: string;
    phone?: string;
    email?: string;
    city?: string;
    niche?: string;
  }>;
  onDuplicatesFound?: (duplicateGroups: any[]) => void;
}

export const AIDedupePanel: React.FC<AIDedupeProps> = ({ leads, onDuplicatesFound }) => {
  const { toast } = useToast();
  const [threshold, setThreshold] = useState([0.85]);
  const [duplicateGroups, setDuplicateGroups] = useState<any[]>([]);
  
  const dedupeRequest = useAIDedupe();

  const handleDedupe = async () => {
    try {
      const result = await dedupeRequest.mutateAsync({
        leads,
        similarity_threshold: threshold[0]
      });

      setDuplicateGroups(result.duplicate_groups);
      onDuplicatesFound?.(result.duplicate_groups);

      toast({
        title: "Análise de Duplicatas Concluída",
        description: `${result.total_duplicates_found} duplicatas encontradas em ${result.total_groups} grupos`,
      });
    } catch (error) {
      toast({
        title: "Erro na Análise",
        description: "Não foi possível analisar duplicatas",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            AI Deduplicação
          </CardTitle>
          <CardDescription>
            Use IA para identificar leads duplicados baseado em múltiplos critérios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Limiar de Similaridade: {Math.round(threshold[0] * 100)}%
            </label>
            <Slider
              value={threshold}
              onValueChange={setThreshold}
              min={0.7}
              max={0.95}
              step={0.05}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Maior = mais rigoroso (menos falsos positivos)
            </p>
          </div>

          <Button 
            onClick={handleDedupe}
            disabled={dedupeRequest.isPending || leads.length === 0}
            className="w-full"
          >
            {dedupeRequest.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analisando {leads.length} leads...
              </>
            ) : (
              `Analisar Duplicatas (${leads.length} leads)`
            )}
          </Button>

          {duplicateGroups.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium">
                  {duplicateGroups.length} grupos de duplicatas encontrados
                </span>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {duplicateGroups.map((group, index) => (
                  <Card key={index} className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">
                          Grupo {index + 1}
                        </Badge>
                        <Badge variant="secondary">
                          {Math.round(group.similarity_score * 100)}% similar
                        </Badge>
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        <strong>Critérios:</strong> {group.match_criteria.join(', ')}
                      </p>
                      
                      <p className="text-xs">
                        <strong>Análise:</strong> {group.rationale}
                      </p>
                      
                      <div className="text-xs">
                        <strong>Duplicatas:</strong> {group.duplicates.length + 1} leads
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};