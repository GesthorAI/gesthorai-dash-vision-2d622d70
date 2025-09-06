import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAIAnalytics } from '@/hooks/useAIAnalytics';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, BarChart3, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

interface AIAnalyticsProps {
  className?: string;
}

const ANALYSIS_TYPES = [
  { id: 'leads_overview', label: 'Visão Geral dos Leads', description: 'Análise de qualidade e distribuição' },
  { id: 'performance_trends', label: 'Tendências de Performance', description: 'Comunicação e follow-ups' },
  { id: 'conversion_insights', label: 'Insights de Conversão', description: 'Funil e taxa de conversão' },
  { id: 'ai_usage', label: 'Uso de IA', description: 'Eficiência e custos da IA' },
];

const IMPACT_ICONS = {
  alto: <AlertCircle className="h-4 w-4 text-destructive" />,
  medio: <TrendingUp className="h-4 w-4 text-warning" />,
  baixo: <CheckCircle className="h-4 w-4 text-success" />,
};

export const AIAnalyticsPanel: React.FC<AIAnalyticsProps> = ({ className }) => {
  const { toast } = useToast();
  const [selectedAnalysis, setSelectedAnalysis] = useState('leads_overview');
  const [insights, setInsights] = useState<any>(null);
  
  const analyticsRequest = useAIAnalytics();

  const handleAnalyze = async () => {
    try {
      const result = await analyticsRequest.mutateAsync({
        analysis_type: selectedAnalysis as any,
        date_range: {
          start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date().toISOString()
        }
      });

      setInsights(result);

      toast({
        title: "Análise Concluída",
        description: `${result.insights.length} insights gerados`,
      });
    } catch (error) {
      toast({
        title: "Erro na Análise",
        description: "Não foi possível gerar insights",
        variant: "destructive",
      });
    }
  };

  const selectedAnalysisInfo = ANALYSIS_TYPES.find(t => t.id === selectedAnalysis);

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            AI Analytics
          </CardTitle>
          <CardDescription>
            Gere insights inteligentes sobre seus dados de leads e performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de Análise:</label>
            <Select value={selectedAnalysis} onValueChange={setSelectedAnalysis}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANALYSIS_TYPES.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-muted-foreground">{type.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleAnalyze}
            disabled={analyticsRequest.isPending}
            className="w-full"
          >
            {analyticsRequest.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analisando dados...
              </>
            ) : (
              <>
                <BarChart3 className="mr-2 h-4 w-4" />
                Gerar Insights
              </>
            )}
          </Button>

          {insights && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  Análise: {selectedAnalysisInfo?.label}
                </span>
              </div>

              {/* Key Metrics */}
              {insights.key_metrics && Object.keys(insights.key_metrics).length > 0 && (
                <Card className="p-3">
                  <h4 className="text-sm font-medium mb-2">Métricas Principais</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(insights.key_metrics).map(([key, value]) => (
                      <div key={key} className="text-xs">
                        <div className="text-muted-foreground">{key}</div>
                        <div className="font-medium">{value as string}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Insights */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {insights.insights.map((insight: any, index: number) => (
                  <Card key={index} className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {IMPACT_ICONS[insight.impact as keyof typeof IMPACT_ICONS]}
                          <span className="text-sm font-medium">{insight.title}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {insight.category}
                        </Badge>
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        {insight.description}
                      </p>
                      
                      <div className="text-xs">
                        <strong>Recomendação:</strong> {insight.recommendation}
                      </div>
                      
                      {insight.data_supporting && (
                        <div className="text-xs text-muted-foreground">
                          <strong>Dados:</strong> {insight.data_supporting}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              {/* Recommendations */}
              {insights.recommendations.length > 0 && (
                <Card className="p-3">
                  <h4 className="text-sm font-medium mb-2">Recomendações Principais</h4>
                  <ul className="text-xs space-y-1">
                    {insights.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-3 w-3 text-success mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Trends */}
              {insights.trends.length > 0 && (
                <Card className="p-3">
                  <h4 className="text-sm font-medium mb-2">Tendências Identificadas</h4>
                  <ul className="text-xs space-y-1">
                    {insights.trends.map((trend: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <TrendingUp className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                        {trend}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};