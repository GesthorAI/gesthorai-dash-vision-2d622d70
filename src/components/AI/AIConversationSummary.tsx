import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAIConversationSummary } from '@/hooks/useAIConversationSummary';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, MessageSquare, TrendingUp, Target } from 'lucide-react';

interface AIConversationSummaryProps {
  leadId: string;
  messages: Array<{
    id: string;
    type: 'inbound' | 'outbound' | 'auto_reply';
    message: string;
    channel: 'whatsapp' | 'email' | 'phone';
    created_at: string;
  }>;
  onSummaryGenerated?: (summary: any) => void;
}

export const AIConversationSummary: React.FC<AIConversationSummaryProps> = ({ 
  leadId, 
  messages, 
  onSummaryGenerated 
}) => {
  const { toast } = useToast();
  const [summaryType, setSummaryType] = useState<'brief' | 'detailed' | 'action_items'>('brief');
  const [lastSummary, setLastSummary] = useState<any>(null);
  
  const summaryRequest = useAIConversationSummary();

  const handleGenerateSummary = async () => {
    if (messages.length === 0) {
      toast({
        title: "Sem mensagens",
        description: "Não há mensagens para analisar neste lead",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await summaryRequest.mutateAsync({
        lead_id: leadId,
        messages,
        summary_type: summaryType
      });

      setLastSummary(result);
      onSummaryGenerated?.(result);

      toast({
        title: "Resumo Gerado",
        description: `Análise da conversa concluída - Sentimento: ${result.lead_sentiment}`,
      });
    } catch (error) {
      toast({
        title: "Erro na Análise",
        description: "Não foi possível gerar resumo da conversa",
        variant: "destructive",
      });
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'interessado': return 'bg-green-100 text-green-800';
      case 'neutro': return 'bg-gray-100 text-gray-800';
      case 'resistente': return 'bg-yellow-100 text-yellow-800';
      case 'perdido': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStageColor = (stage: string) => {
    const colors = {
      'inicial': 'bg-blue-100 text-blue-800',
      'qualificacao': 'bg-purple-100 text-purple-800',
      'proposta': 'bg-orange-100 text-orange-800',
      'negociacao': 'bg-yellow-100 text-yellow-800',
      'fechamento': 'bg-green-100 text-green-800'
    };
    return colors[stage as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          IA Análise de Conversa
        </CardTitle>
        <CardDescription>
          Análise inteligente das interações com o lead
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">
              Tipo de Resumo
            </label>
            <Select value={summaryType} onValueChange={(value: any) => setSummaryType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brief">Resumo Breve</SelectItem>
                <SelectItem value="detailed">Análise Detalhada</SelectItem>
                <SelectItem value="action_items">Itens de Ação</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="text-sm text-muted-foreground">
            {messages.length} mensagens
          </div>
        </div>

        <Button 
          onClick={handleGenerateSummary}
          disabled={summaryRequest.isPending || messages.length === 0}
          className="w-full"
        >
          {summaryRequest.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analisando conversa...
            </>
          ) : (
            `Gerar ${summaryType === 'brief' ? 'Resumo' : summaryType === 'detailed' ? 'Análise' : 'Ações'}`
          )}
        </Button>

        {lastSummary && (
          <div className="space-y-4 border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  SENTIMENTO
                </label>
                <Badge className={getSentimentColor(lastSummary.lead_sentiment)}>
                  {lastSummary.lead_sentiment}
                </Badge>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  ESTÁGIO
                </label>
                <Badge className={getStageColor(lastSummary.conversation_stage)}>
                  {lastSummary.conversation_stage}
                </Badge>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Score de Prioridade: {lastSummary.priority_score}/10
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${lastSummary.priority_score * 10}%` }}
                ></div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Resumo</h4>
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                {lastSummary.summary}
              </p>
            </div>

            {lastSummary.key_insights.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Insights</h4>
                <ul className="text-sm space-y-1">
                  {lastSummary.key_insights.map((insight: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <TrendingUp className="h-3 w-3 mt-0.5 text-blue-500" />
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {lastSummary.recommended_actions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Ações Recomendadas</h4>
                <ul className="text-sm space-y-1">
                  {lastSummary.recommended_actions.map((action: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <Target className="h-3 w-3 mt-0.5 text-green-500" />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {lastSummary.tags.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Tags</h4>
                <div className="flex flex-wrap gap-1">
                  {lastSummary.tags.map((tag: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};