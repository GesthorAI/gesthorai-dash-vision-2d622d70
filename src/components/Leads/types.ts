import { Lead } from "@/hooks/useLeads";

export interface LeadNote {
  id: string;
  leadId: string;
  note: string;
  createdAt: string;
}

export interface StatusOption {
  value: string;
  label: string;
  colorClass: string;
}

export const STATUS_OPTIONS: StatusOption[] = [
  { value: "novo", label: "Novo", colorClass: "bg-status-new" },
  { value: "contatado", label: "Contatado", colorClass: "bg-status-contacted" },
  { value: "qualificado", label: "Qualificado", colorClass: "bg-status-qualified" },
  { value: "agendado", label: "Agendado", colorClass: "bg-status-scheduled" },
  { value: "convertido", label: "Convertido", colorClass: "bg-status-converted" },
  { value: "perdido", label: "Perdido", colorClass: "bg-status-lost" }
];

export interface ScoredLead extends Lead {
  score: number;
  scoreSource?: string;
  aiRationale?: string;
  aiConfidence?: number;
  aiModel?: string;
  aiScoredAt?: string;
}

export const getScoreColor = (score: number): string => {
  if (score >= 8) return "text-score-excellent";
  if (score >= 6) return "text-score-good"; 
  if (score >= 4) return "text-score-medium";
  return "text-score-low";
};

export const getScoreBadge = (score: number) => {
  if (score >= 8) return { variant: "default" as const, label: "Excelente" };
  if (score >= 6) return { variant: "secondary" as const, label: "Bom" };
  if (score >= 4) return { variant: "outline" as const, label: "Médio" };
  return { variant: "destructive" as const, label: "Baixo" };
};

export const getStatusOption = (status: string | null | undefined) => {
  return STATUS_OPTIONS.find(opt => opt.value === status);
};
