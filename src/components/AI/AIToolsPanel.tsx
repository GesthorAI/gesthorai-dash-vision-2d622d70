import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Users, MessageSquare, BarChart3 } from "lucide-react";
import { AIDedupePanel } from "./AIDedupePanel";
import { AIEnrichPanel } from "./AIEnrichPanel";
import { AIConversationSummary } from "./AIConversationSummary";
import { AIAnalyticsPanel } from "./AIAnalyticsPanel";

interface AIToolsPanelProps {
  leads: Array<{
    id: string;
    name: string;
    business: string;
    phone?: string;
    email?: string;
    city?: string;
    niche?: string;
  }>;
  onDataUpdate?: () => void;
}

export function AIToolsPanel({ leads, onDataUpdate }: AIToolsPanelProps) {
  const [activeTab, setActiveTab] = useState("dedupe");

  const sampleMessages = [
    {
      id: "1",
      type: "inbound" as const,
      message: "Olá, gostaria de saber mais sobre os seus serviços",
      channel: "whatsapp" as const,
      created_at: new Date().toISOString()
    },
    {
      id: "2", 
      type: "outbound" as const,
      message: "Olá! Ficamos felizes com seu interesse. Podemos agendar uma conversa?",
      channel: "whatsapp" as const,
      created_at: new Date().toISOString()
    }
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Ferramentas de IA
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dedupe" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Dedupe
            </TabsTrigger>
            <TabsTrigger value="enrich" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Enriquecer
            </TabsTrigger>
            <TabsTrigger value="conversation" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Resumo
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dedupe" className="mt-4">
            <AIDedupePanel 
              leads={leads}
              onDuplicatesFound={(duplicates) => {
                console.log('Duplicates found:', duplicates);
                onDataUpdate?.();
              }}
            />
          </TabsContent>

          <TabsContent value="enrich" className="mt-4">
            <AIEnrichPanel 
              leads={leads}
              onEnrichmentComplete={(enrichedData) => {
                console.log('Enrichment completed:', enrichedData);
                onDataUpdate?.();
              }}
            />
          </TabsContent>

          <TabsContent value="conversation" className="mt-4">
            <AIConversationSummary
              leadId={leads[0]?.id || ""}
              messages={sampleMessages}
              onSummaryGenerated={(summary) => {
                console.log('Summary generated:', summary);
              }}
            />
          </TabsContent>

          <TabsContent value="analytics" className="mt-4">
            <AIAnalyticsPanel />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}