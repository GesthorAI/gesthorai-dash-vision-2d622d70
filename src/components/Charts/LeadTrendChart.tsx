import { Card } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, AreaChart, Area } from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Lead } from "@/hooks/useLeads";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";

interface LeadTrendChartProps {
  leads: Lead[];
  days?: number;
  type?: 'line' | 'area';
  title?: string;
  showComparison?: boolean;
}

export const LeadTrendChart = ({ 
  leads, 
  days = 30, 
  type = 'area', 
  title = "Tendência de Leads",
  showComparison = true 
}: LeadTrendChartProps) => {
  
  // Generate data for the chart
  const chartData = generateTrendData(leads, days);
  const previousPeriodData = showComparison ? generateTrendData(leads, days, days) : null;
  
  // Calculate trend metrics
  const currentTotal = chartData.reduce((sum, day) => sum + day.leads, 0);
  const previousTotal = previousPeriodData ? 
    previousPeriodData.reduce((sum, day) => sum + day.leads, 0) : 0;
  
  const trendChange = previousTotal > 0 ? 
    ((currentTotal - previousTotal) / previousTotal) * 100 : 0;
  
  const isPositiveTrend = trendChange >= 0;
  
  const chartConfig = {
    leads: {
      label: "Leads",
      color: "hsl(var(--primary))",
    },
    conversions: {
      label: "Conversões",
      color: "hsl(var(--secondary))",
    },
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        {showComparison && (
          <div className={`flex items-center gap-1 text-sm ${
            isPositiveTrend ? "text-green-600" : "text-red-600"
          }`}>
            {isPositiveTrend ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trendChange > 0 ? "+" : ""}{trendChange.toFixed(1)}%
            <span className="text-muted-foreground ml-1">vs período anterior</span>
          </div>
        )}
      </div>
      
      <div className="h-[300px]">
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height="100%">
            {type === 'area' ? (
              <AreaChart data={chartData}>
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => format(new Date(value), 'dd/MM')}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  labelFormatter={(value) => format(new Date(value), 'dd/MM/yyyy', { locale: ptBR })}
                />
                <Area
                  type="monotone"
                  dataKey="leads"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary) / 0.1)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="conversions"
                  stroke="hsl(var(--secondary))"
                  fill="hsl(var(--secondary) / 0.1)"
                  strokeWidth={2}
                />
              </AreaChart>
            ) : (
              <LineChart data={chartData}>
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => format(new Date(value), 'dd/MM')}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  labelFormatter={(value) => format(new Date(value), 'dd/MM/yyyy', { locale: ptBR })}
                />
                <Line
                  type="monotone"
                  dataKey="leads"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="conversions"
                  stroke="hsl(var(--secondary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--secondary))", strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </ChartContainer>
      </div>
      
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">{currentTotal}</p>
          <p className="text-sm text-muted-foreground">Total de leads</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-secondary">
            {chartData.reduce((sum, day) => sum + day.conversions, 0)}
          </p>
          <p className="text-sm text-muted-foreground">Conversões</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-accent">
            {currentTotal > 0 ? 
              ((chartData.reduce((sum, day) => sum + day.conversions, 0) / currentTotal) * 100).toFixed(1) 
              : 0}%
          </p>
          <p className="text-sm text-muted-foreground">Taxa conversão</p>
        </div>
      </div>
    </Card>
  );
};

function generateTrendData(leads: Lead[], days: number, offset: number = 0) {
  const data = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = startOfDay(subDays(today, i + offset));
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    
    const dayLeads = leads.filter(lead => {
      const leadDate = new Date(lead.created_at);
      return leadDate >= date && leadDate < nextDate;
    });
    
    const conversions = dayLeads.filter(lead => 
      lead.status.toLowerCase() === 'convertido'
    ).length;
    
    data.push({
      date: date.toISOString(),
      leads: dayLeads.length,
      conversions,
      conversionRate: dayLeads.length > 0 ? (conversions / dayLeads.length) * 100 : 0
    });
  }
  
  return data;
}