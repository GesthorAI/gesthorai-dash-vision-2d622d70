import { Card } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Lead } from "@/hooks/useLeads";
import { Star, Target } from "lucide-react";

interface ScoreDistributionChartProps {
  leads: Lead[];
  type?: 'bar' | 'pie';
  title?: string;
}

const SCORE_RANGES = [
  { range: '0-2', min: 0, max: 2, color: '#EF4444', label: 'Muito Baixo' },
  { range: '3-4', min: 3, max: 4, color: '#F97316', label: 'Baixo' },
  { range: '5-6', min: 5, max: 6, color: '#EAB308', label: 'Médio' },
  { range: '7-8', min: 7, max: 8, color: '#22C55E', label: 'Alto' },
  { range: '9-10', min: 9, max: 10, color: '#10B981', label: 'Excelente' }
];

export const ScoreDistributionChart = ({ 
  leads, 
  type = 'bar', 
  title = "Distribuição de Score" 
}: ScoreDistributionChartProps) => {
  
  // Calculate distribution data
  const distributionData = SCORE_RANGES.map(range => {
    const count = leads.filter(lead => 
      lead.score >= range.min && lead.score <= range.max
    ).length;
    
    const percentage = leads.length > 0 ? (count / leads.length) * 100 : 0;
    
    return {
      range: range.range,
      label: range.label,
      count,
      percentage: Math.round(percentage * 10) / 10,
      color: range.color
    };
  });
  
  const totalLeads = leads.length;
  const averageScore = totalLeads > 0 ? 
    leads.reduce((sum, lead) => sum + lead.score, 0) / totalLeads : 0;
  
  const highQualityLeads = leads.filter(lead => lead.score >= 7).length;
  const highQualityPercentage = totalLeads > 0 ? (highQualityLeads / totalLeads) * 100 : 0;

  const chartConfig = {
    count: {
      label: "Leads",
    },
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-primary" />
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Target className="h-3 w-3 text-green-600" />
            <span className="text-muted-foreground">Score médio:</span>
            <span className="font-semibold">{averageScore.toFixed(1)}</span>
          </div>
        </div>
      </div>
      
      <div className="h-[300px]">
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height="100%">
            {type === 'bar' ? (
              <BarChart data={distributionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis 
                  dataKey="range" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <ChartTooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-md">
                          <p className="font-semibold">{`Score ${label} - ${data.label}`}</p>
                          <p className="text-sm">
                            <span className="text-primary">Leads: {data.count}</span>
                          </p>
                          <p className="text-sm">
                            <span className="text-muted-foreground">Percentual: {data.percentage}%</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="count"
                  label={({ range, percentage }) => `${range}: ${percentage}%`}
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-md">
                          <p className="font-semibold">{`${data.label} (${data.range})`}</p>
                          <p className="text-sm text-primary">Leads: {data.count}</p>
                          <p className="text-sm text-muted-foreground">Percentual: {data.percentage}%</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            )}
          </ResponsiveContainer>
        </ChartContainer>
      </div>
      
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">{totalLeads}</p>
          <p className="text-sm text-muted-foreground">Total de leads</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{highQualityLeads}</p>
          <p className="text-sm text-muted-foreground">Alta qualidade (7+)</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-accent">{highQualityPercentage.toFixed(1)}%</p>
          <p className="text-sm text-muted-foreground">% Alta qualidade</p>
        </div>
      </div>
      
      {/* Score quality indicators */}
      <div className="mt-4 pt-4 border-t">
        <div className="flex flex-wrap gap-2">
          {SCORE_RANGES.map((range, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: range.color }}
              />
              <span className="text-muted-foreground">
                {range.range}: {range.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};