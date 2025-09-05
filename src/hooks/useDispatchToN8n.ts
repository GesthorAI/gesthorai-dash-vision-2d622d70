import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

interface DispatchRequest {
  runId: string;
  organizationId: string;
}

export const useDispatchToN8n = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ runId, organizationId }: DispatchRequest) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase.functions.invoke("n8n-followup-dispatch", {
        body: { runId, organizationId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Mensagens disparadas",
        description: "As mensagens foram enviadas para processamento no N8N",
      });
    },
    onError: (error: any) => {
      console.error("Dispatch error:", error);
      toast({
        title: "Erro ao disparar mensagens",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    },
  });
};