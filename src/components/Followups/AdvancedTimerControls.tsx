import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Clock, Zap, Users } from 'lucide-react';

interface TimerConfig {
  interLeadDelayMs: number;
  intraLeadDelayMs: number;
  jitterPct: number;
}

interface AdvancedTimerControlsProps {
  config: TimerConfig;
  onChange: (config: TimerConfig) => void;
  leadsCount: number;
}

export const AdvancedTimerControls: React.FC<AdvancedTimerControlsProps> = ({
  config,
  onChange,
  leadsCount
}) => {
  // Calculate estimated duration
  const avgMessagesPerLead = 2; // Estimate
  const totalMessages = leadsCount * avgMessagesPerLead;
  const totalDelay = (leadsCount - 1) * config.interLeadDelayMs + (totalMessages - leadsCount) * config.intraLeadDelayMs;
  const estimatedMinutes = Math.ceil(totalDelay / 60000);

  const formatTime = (ms: number) => {
    if (ms >= 60000) {
      return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
    }
    return `${Math.floor(ms / 1000)}s`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Controles de Timer Avançados
        </CardTitle>
        <CardDescription>
          Configure delays personalizados para envio natural
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Inter-lead delay */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Delay entre leads
            </Label>
            <Badge variant="outline">{formatTime(config.interLeadDelayMs)}</Badge>
          </div>
          
          <Slider
            value={[config.interLeadDelayMs]}
            onValueChange={([value]) => onChange({ ...config, interLeadDelayMs: value })}
            min={1000}
            max={30000}
            step={500}
            className="w-full"
          />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1s (muito rápido)</span>
            <span>30s (muito lento)</span>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Tempo de espera entre o envio para diferentes leads
          </p>
        </div>

        {/* Intra-lead delay */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Delay entre mensagens
            </Label>
            <Badge variant="outline">{formatTime(config.intraLeadDelayMs)}</Badge>
          </div>
          
          <Slider
            value={[config.intraLeadDelayMs]}
            onValueChange={([value]) => onChange({ ...config, intraLeadDelayMs: value })}
            min={500}
            max={10000}
            step={250}
            className="w-full"
          />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0.5s (instantâneo)</span>
            <span>10s (contemplativo)</span>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Tempo entre mensagens sequenciais para o mesmo lead
          </p>
        </div>

        {/* Jitter */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Variação aleatória (Jitter)</Label>
            <Badge variant="outline">{Math.round(config.jitterPct * 100)}%</Badge>
          </div>
          
          <Slider
            value={[config.jitterPct]}
            onValueChange={([value]) => onChange({ ...config, jitterPct: value })}
            min={0}
            max={0.5}
            step={0.05}
            className="w-full"
          />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0% (preciso)</span>
            <span>50% (muito variado)</span>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Adiciona variação aleatória aos delays para parecer mais natural
          </p>
        </div>

        {/* Estimation */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="font-medium">Estimativa de Tempo</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Leads:</span>
              <span className="ml-2 font-medium">{leadsCount}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Duração estimada:</span>
              <span className="ml-2 font-medium">~{estimatedMinutes} min</span>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground mt-2">
            * Estimativa baseada em 2 mensagens por lead em média
          </p>
        </div>
      </CardContent>
    </Card>
  );
};