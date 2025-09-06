import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  useAIUsage, 
  useAIQuotas, 
  useAIPerformanceMetrics 
} from '@/hooks/useAIUsage';
import { 
  TrendingUp, 
  DollarSign, 
  Zap, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  BarChart3
} from 'lucide-react';

export const AIUsageDashboard = () => {
  const { data: usage, isLoading: usageLoading } = useAIUsage();
  const { data: quotas } = useAIQuotas();
  const { data: performance } = useAIPerformanceMetrics();

  const currentQuota = quotas?.[0];
  
  // Calculate usage percentages
  const tokenUsagePercent = currentQuota 
    ? (currentQuota.tokens_used / currentQuota.tokens_limit) * 100 
    : 0;
  
  const requestUsagePercent = currentQuota 
    ? (currentQuota.requests_made / currentQuota.requests_limit) * 100 
    : 0;

  // Performance metrics
  const recentPerformance = performance?.slice(0, 10) || [];
  const avgExecutionTime = recentPerformance.length > 0
    ? recentPerformance.reduce((acc, p) => acc + p.execution_time_ms, 0) / recentPerformance.length
    : 0;
  
  const successRate = recentPerformance.length > 0
    ? (recentPerformance.filter(p => p.success).length / recentPerformance.length) * 100
    : 100;

  if (usageLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Uso de IA</CardTitle>
          <CardDescription>Carregando dados...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Daily Usage Summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens Hoje</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usage?.daily?.tokens_used?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              de {currentQuota?.tokens_limit?.toLocaleString() || 'N/A'} disponíveis
            </p>
            {currentQuota && (
              <Progress value={tokenUsagePercent} className="mt-2" />
            )}
          </CardContent>
        </Card>

        {/* Daily Requests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requisições Hoje</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usage?.daily?.requests_made || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              de {currentQuota?.requests_limit || 'N/A'} disponíveis
            </p>
            {currentQuota && (
              <Progress value={requestUsagePercent} className="mt-2" />
            )}
          </CardContent>
        </Card>

        {/* Daily Cost */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Hoje</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${Number(usage?.daily?.cost_incurred || 0).toFixed(4)}
            </div>
            <p className="text-xs text-muted-foreground">
              Custo mensal: ${Number(usage?.monthly?.cost_incurred || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        {/* Performance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {successRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Taxa de sucesso
            </p>
            <div className="text-xs text-muted-foreground mt-1">
              <Clock className="inline w-3 h-3 mr-1" />
              {avgExecutionTime.toFixed(0)}ms médio
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {currentQuota && (
        <div className="space-y-3">
          {tokenUsagePercent > 80 && (
            <Alert variant={tokenUsagePercent > 95 ? "destructive" : "default"}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {tokenUsagePercent > 95 
                  ? "Limite de tokens quase esgotado! Você usou " + tokenUsagePercent.toFixed(1) + "% do seu limite diário."
                  : "Atenção: Você usou " + tokenUsagePercent.toFixed(1) + "% do seu limite diário de tokens."
                }
              </AlertDescription>
            </Alert>
          )}
          
          {requestUsagePercent > 80 && (
            <Alert variant={requestUsagePercent > 95 ? "destructive" : "default"}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {requestUsagePercent > 95 
                  ? "Limite de requisições quase esgotado! Você usou " + requestUsagePercent.toFixed(1) + "% do seu limite diário."
                  : "Atenção: Você usou " + requestUsagePercent.toFixed(1) + "% do seu limite diário de requisições."
                }
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Recent Performance */}
      {recentPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Recente</CardTitle>
            <CardDescription>
              Últimas 10 operações de IA realizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentPerformance.map((metric, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    {metric.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                    <div>
                      <div className="font-medium">{metric.feature}</div>
                      <div className="text-sm text-muted-foreground">
                        {metric.model_used}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {metric.execution_time_ms}ms
                    </div>
                    {metric.tokens_used && (
                      <div className="text-xs text-muted-foreground">
                        {metric.tokens_used} tokens
                      </div>
                    )}
                    {metric.cost_estimate && (
                      <div className="text-xs text-muted-foreground">
                        ${Number(metric.cost_estimate).toFixed(4)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feature Usage Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Uso por Funcionalidade</CardTitle>
          <CardDescription>
            Distribuição de uso de IA por funcionalidade
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentPerformance.length > 0 ? (
            <div className="space-y-2">
              {Object.entries(
                recentPerformance.reduce((acc, metric) => {
                  acc[metric.feature] = (acc[metric.feature] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([feature, count]) => (
                <div key={feature} className="flex items-center justify-between">
                  <span className="font-medium">{feature}</span>
                  <Badge variant="outline">{count} usos</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              Nenhuma atividade de IA registrada ainda.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};