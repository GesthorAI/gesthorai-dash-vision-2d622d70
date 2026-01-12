import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

interface TrendDataPoint {
  date: string;
  value: number;
  label?: string;
}

interface DatabaseTrendChartProps {
  title: string;
  data: TrendDataPoint[];
  type?: 'area' | 'bar';
  color?: string;
  showTrend?: boolean;
  valueFormatter?: (value: number) => string;
  height?: number;
}

export const DatabaseTrendChart = ({
  title,
  data,
  type = 'area',
  color = 'hsl(var(--primary))',
  showTrend = true,
  valueFormatter = (v) => v.toLocaleString(),
  height = 200
}: DatabaseTrendChartProps) => {
  // Calculate trend
  const midPoint = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, midPoint).reduce((sum, d) => sum + d.value, 0);
  const secondHalf = data.slice(midPoint).reduce((sum, d) => sum + d.value, 0);
  const trendChange = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;
  const isPositive = trendChange >= 0;
  
  const chartConfig = {
    value: {
      label: title,
      color: color,
    },
  };

  const currentTotal = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
          {showTrend && data.length > 1 && (
            <div className={`flex items-center gap-1 text-xs ${
              isPositive ? "text-green-600" : "text-red-600"
            }`}>
              {isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {trendChange > 0 ? "+" : ""}{trendChange.toFixed(1)}%
            </div>
          )}
        </div>
        <p className="text-2xl font-bold">{valueFormatter(currentTotal)}</p>
      </CardHeader>
      <CardContent className="pb-4">
        <ChartContainer config={chartConfig} className={`w-full overflow-hidden`} style={{ height }}>
          {type === 'area' ? (
            <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id={`gradient-${title.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10 }}
                tickFormatter={(value) => format(new Date(value), 'dd/MM')}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10 }} 
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                labelFormatter={(value) => format(new Date(value), 'dd/MM/yyyy', { locale: ptBR })}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                fill={`url(#gradient-${title.replace(/\s/g, '')})`}
                strokeWidth={2}
              />
            </AreaChart>
          ) : (
            <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10 }}
                tickFormatter={(value) => format(new Date(value), 'dd/MM')}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10 }} 
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                labelFormatter={(value) => format(new Date(value), 'dd/MM/yyyy', { locale: ptBR })}
              />
              <Bar
                dataKey="value"
                fill={color}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

// Hook to generate trend data from leads
export const generateDailyTrendData = (
  total: number,
  days: number = 14,
  variance: number = 0.3
): TrendDataPoint[] => {
  const data: TrendDataPoint[] = [];
  const baseDaily = total / days;
  
  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(new Date(), i);
    // Add some realistic variance
    const randomFactor = 1 + (Math.random() - 0.5) * variance;
    const value = Math.max(0, Math.round(baseDaily * randomFactor));
    
    data.push({
      date: date.toISOString(),
      value,
      label: format(date, 'dd/MM')
    });
  }
  
  return data;
};
