import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Brain, Calculator, Info } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AIScoreIndicatorProps {
  score: number;
  scoreSource: 'ai' | 'heuristic';
  aiRationale?: string;
  aiConfidence?: number;
  aiModel?: string;
  aiScoredAt?: string;
  className?: string;
}

export const AIScoreIndicator: React.FC<AIScoreIndicatorProps> = ({
  score,
  scoreSource,
  aiRationale,
  aiConfidence,
  aiModel,
  aiScoredAt,
  className = ""
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 7) return "bg-green-500 text-white";
    if (score >= 4) return "bg-yellow-500 text-black";
    return "bg-red-500 text-white";
  };

  const formatScore = (score: number) => {
    return score.toFixed(1);
  };

  const tooltipContent = () => {
    if (scoreSource === 'ai') {
      return (
        <div className="space-y-2 max-w-xs">
          <div className="flex items-center gap-2 font-medium">
            <Brain className="w-4 h-4" />
            Score gerado por IA
          </div>
          
          {aiRationale && (
            <div>
              <p className="text-sm font-medium mb-1">Explicação:</p>
              <p className="text-xs">{aiRationale}</p>
            </div>
          )}
          
          <div className="text-xs text-muted-foreground space-y-1">
            {aiConfidence && (
              <div>Confiança: {Math.round(aiConfidence * 100)}%</div>
            )}
            {aiModel && (
              <div>Modelo: {aiModel}</div>
            )}
            {aiScoredAt && (
              <div>
                Analisado em: {format(new Date(aiScoredAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
              </div>
            )}
          </div>
        </div>
      );
    } else {
      return (
        <div className="space-y-2 max-w-xs">
          <div className="flex items-center gap-2 font-medium">
            <Calculator className="w-4 h-4" />
            Score heurístico
          </div>
          <p className="text-xs">
            Baseado em regras tradicionais: dados de contato, qualidade do negócio, 
            nicho, localização e timing.
          </p>
          <p className="text-xs text-muted-foreground">
            Use IA para análise mais precisa e explicações detalhadas.
          </p>
        </div>
      );
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1 ${className}`}>
            <Badge 
              className={`${getScoreColor(score)} font-medium`}
              variant="secondary"
            >
              {formatScore(score)}
            </Badge>
            
            {scoreSource === 'ai' ? (
              <Brain className="w-3 h-3 text-primary" />
            ) : (
              <Calculator className="w-3 h-3 text-muted-foreground" />
            )}
            
            {scoreSource === 'ai' && aiConfidence && aiConfidence < 0.7 && (
              <Info className="w-3 h-3 text-orange-500" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-sm">
          {tooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};