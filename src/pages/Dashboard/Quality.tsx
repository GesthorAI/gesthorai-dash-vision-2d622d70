import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KPICard } from "@/components/Dashboard/KPICard";
import { useLeads } from "@/hooks/useLeads";
import { 
  Star, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Users,
  Target,
  Award,
  BarChart3
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ScoreBadge = ({ score }: { score: number }) => {
  if (score >= 8) return <Badge className="bg-green-500">Excelente</Badge>;
  if (score >= 6) return <Badge className="bg-yellow-500">Bom</Badge>;
  if (score >= 4) return <Badge variant="secondary">Regular</Badge>;
  return <Badge variant="destructive">Baixo</Badge>;
};

const QualityBar = ({ label, value, color, target }: {
  label: string;
  value: number;
  color: string;
  target?: number;
}) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center">
      <span className="text-sm font-medium">{label}</span>
      <span className="text-sm text-muted-foreground">
        {value.toFixed(1)}%
        {target && ` / ${target}%`}
      </span>
    </div>
    <Progress value={value} className="h-2" style={{ '--progress-foreground': color } as any} />
    {target && value >= target && (
      <div className="flex items-center text-xs text-green-600">
        <CheckCircle className="h-3 w-3 mr-1" />
        Meta atingida
      </div>
    )}
  </div>
);

export const Quality = () => {
  const { data: allLeads = [], isLoading } = useLeads();

  // Calculate quality metrics
  const totalLeads = allLeads.length;
  const averageScore = totalLeads > 0 
    ? allLeads.reduce((sum, lead) => sum + lead.score, 0) / totalLeads 
    : 0;

  // Score distribution
  const excellentLeads = allLeads.filter(lead => lead.score >= 8).length;
  const goodLeads = allLeads.filter(lead => lead.score >= 6 && lead.score < 8).length;
  const regularLeads = allLeads.filter(lead => lead.score >= 4 && lead.score < 6).length;
  const poorLeads = allLeads.filter(lead => lead.score < 4).length;

  // Quality percentages
  const excellentPerc = totalLeads > 0 ? (excellentLeads / totalLeads) * 100 : 0;
  const goodPerc = totalLeads > 0 ? (goodLeads / totalLeads) * 100 : 0;
  const regularPerc = totalLeads > 0 ? (regularLeads / totalLeads) * 100 : 0;
  const poorPerc = totalLeads > 0 ? (poorLeads / totalLeads) * 100 : 0;

  // Quality by source/niche
  const qualityByNiche = allLeads.reduce((acc, lead) => {
    const niche = lead.niche || 'Não definido';
    if (!acc[niche]) {
      acc[niche] = { total: 0, scoreSum: 0 };
    }
    acc[niche].total++;
    acc[niche].scoreSum += lead.score;
    return acc;
  }, {} as Record<string, { total: number; scoreSum: number }>);

  const nicheQuality = Object.entries(qualityByNiche)
    .map(([niche, data]) => ({
      niche,
      avgScore: data.scoreSum / data.total,
      count: data.total,
      percentage: (data.total / totalLeads) * 100
    }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 10);

  // Recent high-quality leads
  const highQualityLeads = allLeads
    .filter(lead => lead.score >= 7)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Qualidade & Score</h1>
        <p className="text-muted-foreground">Carregando dados de qualidade...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Qualidade & Score</h1>
        <p className="text-muted-foreground">
          Análise da qualidade dos leads e distribuição de scores
        </p>
      </div>

      {/* KPIs principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Score Médio Geral"
          value={averageScore.toFixed(1)}
          trend={{
            value: 0,
            isPositive: true,
            period: "período anterior"
          }}
          icon={<Star className="h-4 w-4" />}
          description="Média de todos os leads"
        />
        <KPICard
          title="Leads de Alta Qualidade"
          value={excellentLeads.toString()}
          trend={{
            value: 0,
            isPositive: true,
            period: "período anterior"
          }}
          icon={<Award className="h-4 w-4" />}
          description="Score ≥ 8"
        />
        <KPICard
          title="Taxa de Qualidade"
          value={`${excellentPerc.toFixed(1)}%`}
          trend={{
            value: 0,
            isPositive: true,
            period: "período anterior"
          }}
          icon={<Target className="h-4 w-4" />}
          description="% de leads excelentes"
        />
        <KPICard
          title="Melhor Nicho"
          value={nicheQuality[0]?.niche.substring(0, 10) + '...' || 'N/A'}
          trend={{
            value: 0,
            isPositive: true,
            period: "período anterior"
          }}
          icon={<TrendingUp className="h-4 w-4" />}
          description={`Score: ${nicheQuality[0]?.avgScore.toFixed(1) || 'N/A'}`}
        />
      </div>

      {/* Distribuição de Score */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            Distribuição de Qualidade
          </h3>
          <div className="space-y-4">
            <QualityBar 
              label="Excelente (8-10)" 
              value={excellentPerc} 
              color="#10B981" 
              target={25} 
            />
            <QualityBar 
              label="Bom (6-7)" 
              value={goodPerc} 
              color="#F59E0B" 
              target={40} 
            />
            <QualityBar 
              label="Regular (4-5)" 
              value={regularPerc} 
              color="#6B7280" 
            />
            <QualityBar 
              label="Baixo (0-3)" 
              value={poorPerc} 
              color="#EF4444" 
            />
          </div>
          
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-1">Resumo Atual:</p>
            <p className="text-xs text-muted-foreground">
              {excellentPerc >= 25 ? '✅' : '⚠️'} Meta de leads excelentes: {excellentPerc.toFixed(1)}% / 25%
            </p>
            <p className="text-xs text-muted-foreground">
              {(excellentPerc + goodPerc) >= 65 ? '✅' : '⚠️'} Leads de qualidade: {(excellentPerc + goodPerc).toFixed(1)}% / 65%
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Qualidade por Nicho</h3>
          {nicheQuality.length === 0 ? (
            <p className="text-muted-foreground">Dados insuficientes para análise por nicho.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nicho</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nicheQuality.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium max-w-[150px] truncate">
                      {item.niche}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{item.avgScore.toFixed(1)}</span>
                        <ScoreBadge score={item.avgScore} />
                      </div>
                    </TableCell>
                    <TableCell>{item.count}</TableCell>
                    <TableCell>{item.percentage.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {/* Leads de Alta Qualidade */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Star className="h-4 w-4 mr-2" />
          Leads de Alta Qualidade Recentes
        </h3>
        {highQualityLeads.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum lead de alta qualidade encontrado.</p>
            <p className="text-sm text-muted-foreground">
              Leads com score ≥ 7 aparecerão aqui quando disponíveis.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Negócio</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Nicho</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {highQualityLeads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{lead.business}</TableCell>
                  <TableCell>{lead.city}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">{lead.score}</span>
                      <ScoreBadge score={lead.score} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{lead.niche || 'N/A'}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(lead.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
};