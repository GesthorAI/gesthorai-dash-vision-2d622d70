import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Users, Target, 
  Clock, Phone, Mail, MessageCircle, MapPin, Building
} from 'lucide-react';
import { Lead } from '@/hooks/useLeads';
import { useLeadScoring } from '@/hooks/useLeadScoring';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AdvancedAnalyticsProps {
  leads: Lead[];
  className?: string;
}

export const AdvancedAnalytics = ({ leads, className }: AdvancedAnalyticsProps) => {
  const { scoredLeads } = useLeadScoring(leads);

  // Performance Metrics
  const totalLeads = scoredLeads.length;
  const highQualityLeads = scoredLeads.filter(lead => lead.score >= 8).length;
  const contactedLeads = scoredLeads.filter(lead => ['contatado', 'qualificado', 'agendado', 'convertido'].includes(lead.status)).length;
  const convertedLeads = scoredLeads.filter(lead => lead.status === 'convertido').length;

  const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
  const contactRate = totalLeads > 0 ? (contactedLeads / totalLeads) * 100 : 0;
  const qualityRate = totalLeads > 0 ? (highQualityLeads / totalLeads) * 100 : 0;

  // Lead Trends (Last 30 days)
  const generateTrendData = () => {
    const days = eachDayOfInterval({
      start: subDays(new Date(), 29),
      end: new Date()
    });

    return days.map(day => {
      const dayLeads = scoredLeads.filter(lead => 
        format(new Date(lead.created_at), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
      );
      
      const dayConverted = dayLeads.filter(lead => lead.status === 'convertido').length;

      return {
        date: format(day, 'dd/MM'),
        leads: dayLeads.length,
        conversions: dayConverted,
        conversionRate: dayLeads.length > 0 ? (dayConverted / dayLeads.length) * 100 : 0
      };
    });
  };

  // Score Distribution
  const scoreDistribution = [
    { range: '9-10', count: scoredLeads.filter(l => l.score >= 9).length, color: '#22c55e' },
    { range: '7-8', count: scoredLeads.filter(l => l.score >= 7 && l.score < 9).length, color: '#eab308' },
    { range: '5-6', count: scoredLeads.filter(l => l.score >= 5 && l.score < 7).length, color: '#f97316' },
    { range: '3-4', count: scoredLeads.filter(l => l.score >= 3 && l.score < 5).length, color: '#ef4444' },
    { range: '0-2', count: scoredLeads.filter(l => l.score < 3).length, color: '#dc2626' }
  ];

  // Source Distribution
  const sources = [...new Set(scoredLeads.map(l => l.source).filter(Boolean))];
  const sourceDistribution = sources.map(source => ({
    name: source || 'Desconhecida',
    value: scoredLeads.filter(l => l.source === source).length,
    percentage: (scoredLeads.filter(l => l.source === source).length / scoredLeads.length) * 100
  }));

  const COLORS = [
    'hsl(var(--primary))', 
    'hsl(var(--accent))', 
    'hsl(var(--success))', 
    'hsl(var(--warning))', 
    'hsl(var(--brand-primary))', 
    'hsl(var(--brand-accent))'
  ];

  // Status Distribution
  const statusDistribution = [
    { status: 'Novo', count: scoredLeads.filter(l => l.status === 'novo').length, color: '#3b82f6' },
    { status: 'Contatado', count: scoredLeads.filter(l => l.status === 'contatado').length, color: '#eab308' },
    { status: 'Qualificado', count: scoredLeads.filter(l => l.status === 'qualificado').length, color: '#22c55e' },
    { status: 'Agendado', count: scoredLeads.filter(l => l.status === 'agendado').length, color: '#8b5cf6' },
    { status: 'Convertido', count: scoredLeads.filter(l => l.status === 'convertido').length, color: '#10b981' },
    { status: 'Perdido', count: scoredLeads.filter(l => l.status === 'perdido').length, color: '#ef4444' }
  ];

  // City/Niche Analysis
  const cityAnalysis = scoredLeads.reduce((acc, lead) => {
    if (!acc[lead.city]) {
      acc[lead.city] = { total: 0, converted: 0, avgScore: 0, scores: [] };
    }
    acc[lead.city].total++;
    acc[lead.city].scores.push(lead.score);
    if (lead.status === 'convertido') acc[lead.city].converted++;
    return acc;
  }, {} as Record<string, { total: number; converted: number; avgScore: number; scores: number[] }>);

  const cityData = Object.entries(cityAnalysis)
    .map(([city, data]) => ({
      city,
      total: data.total,
      converted: data.converted,
      conversionRate: (data.converted / data.total) * 100,
      avgScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const nicheAnalysis = scoredLeads.reduce((acc, lead) => {
    if (!lead.niche) return acc;
    if (!acc[lead.niche]) {
      acc[lead.niche] = { total: 0, converted: 0, avgScore: 0, scores: [] };
    }
    acc[lead.niche].total++;
    acc[lead.niche].scores.push(lead.score);
    if (lead.status === 'convertido') acc[lead.niche].converted++;
    return acc;
  }, {} as Record<string, { total: number; converted: number; avgScore: number; scores: number[] }>);

  const nicheData = Object.entries(nicheAnalysis)
    .map(([niche, data]) => ({
      niche,
      total: data.total,
      converted: data.converted,
      conversionRate: (data.converted / data.total) * 100,
      avgScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Contact Information Completeness
  const contactCompleteness = {
    withPhone: scoredLeads.filter(l => l.phone).length,
    withEmail: scoredLeads.filter(l => l.email).length,
    withBoth: scoredLeads.filter(l => l.phone && l.email).length,
    whatsappVerified: scoredLeads.filter(l => l.whatsapp_verified).length
  };

  const trendData = generateTrendData();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Taxa de Conversão</p>
              <p className="text-2xl font-bold">{conversionRate.toFixed(1)}%</p>
            </div>
            <div className={`p-2 rounded-full ${conversionRate > 5 ? 'bg-green-100' : 'bg-red-100'}`}>
              {conversionRate > 5 ? 
                <TrendingUp className="h-4 w-4 text-green-600" /> : 
                <TrendingDown className="h-4 w-4 text-red-600" />
              }
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Taxa de Contato</p>
              <p className="text-2xl font-bold">{contactRate.toFixed(1)}%</p>
            </div>
            <div className="p-2 rounded-full bg-blue-100">
              <Phone className="h-4 w-4 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Leads de Alta Qualidade</p>
              <p className="text-2xl font-bold">{qualityRate.toFixed(1)}%</p>
            </div>
            <div className="p-2 rounded-full bg-yellow-100">
              <Target className="h-4 w-4 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total de Leads</p>
              <p className="text-2xl font-bold">{totalLeads}</p>
            </div>
            <div className="p-2 rounded-full bg-purple-100">
              <Users className="h-4 w-4 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Advanced Charts */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
          <TabsTrigger value="distribution">Distribuição</TabsTrigger>
          <TabsTrigger value="geographic">Geográfico</TabsTrigger>
          <TabsTrigger value="contact">Informações de Contato</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Tendência de Leads e Conversões (30 dias)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="leads" 
                  stackId="1" 
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  fillOpacity={0.6}
                  name="Leads Captados"
                />
                <Area 
                  type="monotone" 
                  dataKey="conversions" 
                  stackId="2" 
                  stroke="#22c55e" 
                  fill="#22c55e" 
                  fillOpacity={0.8}
                  name="Conversões"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Taxa de Conversão Diária</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value}%`, 'Taxa de Conversão']} />
                <Line 
                  type="monotone" 
                  dataKey="conversionRate" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Score Distribution */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Distribuição de Score</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={scoreDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Source Distribution */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Leads por Origem</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sourceDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${(percentage || 0).toFixed(1)}%`}
                    outerRadius={80}
                    fill="hsl(var(--accent))"
                    dataKey="value"
                  >
                    {sourceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>
          
          {/* Niche Performance */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Performance por Nicho</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={nicheData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="niche" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="hsl(var(--accent))" name="Total de Leads" />
                <Bar dataKey="converted" fill="hsl(var(--success))" name="Convertidos" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="geographic" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Performance por Cidade</h3>
              <div className="space-y-3">
                {cityData.map((city, index) => (
                  <div key={city.city} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{city.city}</p>
                        <p className="text-sm text-muted-foreground">
                          Score médio: {city.avgScore.toFixed(1)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{city.total} leads</p>
                      <Badge variant={city.conversionRate > 5 ? "default" : "secondary"}>
                        {city.conversionRate.toFixed(1)}% conversão
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Performance por Nicho</h3>
              <div className="space-y-3">
                {nicheData.map((niche, index) => (
                  <div key={niche.niche} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                    <div className="flex items-center gap-3">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{niche.niche}</p>
                        <p className="text-sm text-muted-foreground">
                          Score médio: {niche.avgScore.toFixed(1)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{niche.total} leads</p>
                      <Badge variant={niche.conversionRate > 5 ? "default" : "secondary"}>
                        {niche.conversionRate.toFixed(1)}% conversão
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Phone className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{contactCompleteness.withPhone}</p>
                  <p className="text-sm text-muted-foreground">Com telefone</p>
                  <p className="text-xs text-muted-foreground">
                    {((contactCompleteness.withPhone / totalLeads) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Mail className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{contactCompleteness.withEmail}</p>
                  <p className="text-sm text-muted-foreground">Com email</p>
                  <p className="text-xs text-muted-foreground">
                    {((contactCompleteness.withEmail / totalLeads) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <MessageCircle className="h-8 w-8 text-emerald-500" />
                <div>
                  <p className="text-2xl font-bold">{contactCompleteness.whatsappVerified}</p>
                  <p className="text-sm text-muted-foreground">WhatsApp verificado</p>
                  <p className="text-xs text-muted-foreground">
                    {((contactCompleteness.whatsappVerified / totalLeads) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Target className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{contactCompleteness.withBoth}</p>
                  <p className="text-sm text-muted-foreground">Contato completo</p>
                  <p className="text-xs text-muted-foreground">
                    {((contactCompleteness.withBoth / totalLeads) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Completude das Informações de Contato</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[
                { category: 'Telefone', value: (contactCompleteness.withPhone / totalLeads) * 100 },
                { category: 'Email', value: (contactCompleteness.withEmail / totalLeads) * 100 },
                { category: 'Ambos', value: (contactCompleteness.withBoth / totalLeads) * 100 },
                { category: 'WhatsApp', value: (contactCompleteness.whatsappVerified / totalLeads) * 100 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Completude']} />
                <Bar dataKey="value" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};