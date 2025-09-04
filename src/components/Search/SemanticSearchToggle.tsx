import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Brain, Search, Sparkles, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SemanticSearchToggleProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  isAIFeatureEnabled: boolean;
  onEmbedMissingLeads?: () => void;
  isEmbedding?: boolean;
  missingEmbeddingsCount?: number;
}

export const SemanticSearchToggle = ({
  isEnabled,
  onToggle,
  isAIFeatureEnabled,
  onEmbedMissingLeads,
  isEmbedding = false,
  missingEmbeddingsCount = 0
}: SemanticSearchToggleProps) => {
  const { toast } = useToast();
  
  const handleToggle = (checked: boolean) => {
    if (!isAIFeatureEnabled) {
      toast({
        title: "Busca Semântica não disponível",
        description: "Ative a busca semântica nas configurações de IA primeiro",
        variant: "destructive"
      });
      return;
    }
    
    if (checked && missingEmbeddingsCount > 0) {
      toast({
        title: "Processando leads...",
        description: `${missingEmbeddingsCount} leads precisam ser processados para busca semântica`,
      });
    }
    
    onToggle(checked);
  };

  return (
    <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          {isEnabled ? (
            <Brain className="h-4 w-4 text-primary" />
          ) : (
            <Search className="h-4 w-4 text-muted-foreground" />
          )}
          
          <Switch
            checked={isEnabled && isAIFeatureEnabled}
            onCheckedChange={handleToggle}
            disabled={!isAIFeatureEnabled}
          />
          
          <Label className="font-medium">
            Busca Semântica
          </Label>
        </div>

        <Tooltip>
          <TooltipTrigger>
            <Info className="h-4 w-4 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-sm max-w-xs">
              {isAIFeatureEnabled 
                ? "Busque por significado e contexto. Ex: 'médico' encontra 'clínica' e 'consultório'"
                : "Ative a busca semântica nas configurações de IA primeiro"
              }
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {!isAIFeatureEnabled ? (
          <Badge variant="outline" className="text-xs">
            Não configurado
          </Badge>
        ) : isEnabled ? (
          <Badge variant="default" className="text-xs flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            IA Ativa
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">
            Busca Tradicional
          </Badge>
        )}

        {isAIFeatureEnabled && missingEmbeddingsCount > 0 && onEmbedMissingLeads && (
          <Button 
            size="sm" 
            variant="outline"
            onClick={onEmbedMissingLeads}
            disabled={isEmbedding}
            className="text-xs"
          >
            {isEmbedding ? (
              <>
                <Brain className="h-3 w-3 mr-1 animate-pulse" />
                Processando...
              </>
            ) : (
              <>
                <Brain className="h-3 w-3 mr-1" />
                Processar {missingEmbeddingsCount} leads
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};