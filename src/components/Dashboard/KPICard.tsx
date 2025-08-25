import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  trend?: {
    value: number;
    isPositive: boolean;
    period?: string;
  };
  icon?: React.ReactNode;
  description?: string;
}

export const KPICard = ({ title, value, trend, icon, description }: KPICardProps) => {
  return (
    <Card className="kpi-card">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon && <div className="text-accent">{icon}</div>}
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${
            trend.isPositive ? "trend-positive" : "trend-negative"
          }`}>
            {trend.isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trend.value > 0 ? "+" : ""}{trend.value}%
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <p className="kpi-value">{value}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend?.period && (
          <p className="text-xs text-muted-foreground">vs {trend.period}</p>
        )}
      </div>
    </Card>
  );
};