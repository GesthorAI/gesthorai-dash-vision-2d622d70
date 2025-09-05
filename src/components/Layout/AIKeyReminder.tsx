import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Brain, X } from "lucide-react";
import { useUserAPIKeyStatus } from "@/hooks/useUserAPIKeys";
import { useNavigate } from "react-router-dom";

export const AIKeyReminder = () => {
  const [dismissed, setDismissed] = useState(false);
  const { data: keyStatus, isLoading } = useUserAPIKeyStatus();
  const navigate = useNavigate();

  useEffect(() => {
    const dismissed = localStorage.getItem('ai-key-reminder-dismissed');
    if (dismissed === 'true') {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('ai-key-reminder-dismissed', 'true');
  };

  const handleConfigureAI = () => {
    navigate("/dashboard/ai-settings");
  };

  // Don't show if loading, dismissed, or if user has a key
  if (isLoading || dismissed || keyStatus?.hasAnyOpenAIKey) {
    return null;
  }

  return (
    <Alert className="mb-6 border-warning bg-warning/10">
      <Brain className="h-4 w-4" />
      <div className="flex items-center justify-between w-full">
        <AlertDescription className="flex-1">
          <strong>Configuração de IA necessária:</strong> Para usar as funcionalidades de IA (scoring, follow-ups, busca semântica), 
          configure sua chave OpenAI nas configurações.
        </AlertDescription>
        <div className="flex items-center gap-2 ml-4">
          <Button
            size="sm"
            variant="outline"
            onClick={handleConfigureAI}
          >
            Configurar IA
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </Alert>
  );
};