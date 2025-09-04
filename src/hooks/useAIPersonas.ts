import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useOrganizationContext } from "@/contexts/OrganizationContext";

export interface AIPersona {
  id: string;
  user_id: string;
  organization_id: string;
  name: string;
  description?: string;
  tone: string;
  guidelines?: string;
  language: string;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePersonaData {
  name: string;
  description?: string;
  tone: string;
  guidelines?: string;
  language?: string;
  is_active?: boolean;
}

export const useAIPersonas = () => {
  const { user } = useAuth();
  const { currentOrganizationId } = useOrganizationContext();
  
  return useQuery({
    queryKey: ["ai-personas", currentOrganizationId],
    queryFn: async () => {
      if (!user || !currentOrganizationId) throw new Error("User not authenticated or organization not selected");
      
      const { data, error } = await supabase
        .from("ai_personas")
        .select("*")
        .eq("organization_id", currentOrganizationId)
        .eq("is_active", true)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data as AIPersona[];
    },
    enabled: !!user && !!currentOrganizationId,
  });
};

export const useCreatePersona = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentOrganizationId } = useOrganizationContext();
  
  return useMutation({
    mutationFn: async (data: CreatePersonaData) => {
      if (!user || !currentOrganizationId) throw new Error("User not authenticated or organization not selected");
      
      const { data: persona, error } = await supabase
        .from("ai_personas")
        .insert({
          user_id: user.id,
          organization_id: currentOrganizationId,
          ...data,
        })
        .select()
        .single();
      
      if (error) throw error;
      return persona as AIPersona;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-personas", currentOrganizationId] });
    },
  });
};

export const useUpdatePersona = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<AIPersona> & { id: string }) => {
      const { data: persona, error } = await supabase
        .from("ai_personas")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return persona as AIPersona;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-personas", user?.id] });
    },
  });
};

export const useAISettings = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["ai-settings", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from("ai_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (error) {
        // Se não encontrar configurações, criar padrão
        if (error.code === 'PGRST116') {
          const { data: newSettings, error: createError } = await supabase
            .from("ai_settings")
            .insert({
              user_id: user.id,
              feature_flags: {
                followup_ai: true,
                lead_scoring_ai: true,
                auto_dedupe: false,
                semantic_search: false,
                auto_reply: false
              },
              limits: {
                daily_tokens: 50000,
                weekly_tokens: 300000,
                max_concurrent_requests: 5
              }
            })
            .select()
            .single();
          
          if (createError) throw createError;
          return newSettings;
        }
        throw error;
      }
      
      return data;
    },
    enabled: !!user,
  });
};

export const useCreateDefaultPersonas = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentOrganizationId } = useOrganizationContext();

  return useMutation({
    mutationFn: async () => {
      // Get current user
      if (!user || !currentOrganizationId) throw new Error('User not authenticated or organization not selected');

      // Check if organization already has personas
      const { data: existingPersonas } = await supabase
        .from('ai_personas')
        .select('id')
        .eq('organization_id', currentOrganizationId)
        .limit(1);

      if (existingPersonas && existingPersonas.length > 0) {
        return existingPersonas;
      }

      // Create default personas for the organization
      const defaultPersonas = [
        {
          user_id: user.id,
          organization_id: currentOrganizationId,
          name: 'Profissional',
          description: 'Persona profissional para contatos corporativos',
          tone: 'professional',
          guidelines: 'Mantenha tom profissional e direto. Foque em benefícios do negócio e resultados concretos.',
          language: 'pt-BR',
          is_active: true
        },
        {
          user_id: user.id,
          organization_id: currentOrganizationId,
          name: 'Consultivo',
          description: 'Persona consultiva para vendas complexas',
          tone: 'friendly',
          guidelines: 'Seja consultivo e educativo. Faça perguntas que despertem interesse e demonstre expertise.',
          language: 'pt-BR',
          is_active: true
        },
        {
          user_id: user.id,
          organization_id: currentOrganizationId,
          name: 'Amigável',
          description: 'Persona casual para contatos mais próximos',
          tone: 'casual',
          guidelines: 'Use linguagem mais descontraída e próxima. Crie conexão pessoal antes de apresentar soluções.',
          language: 'pt-BR',
          is_active: true
        }
      ];

      const { data, error } = await supabase
        .from('ai_personas')
        .insert(defaultPersonas)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-personas", currentOrganizationId] });
    },
  });
};