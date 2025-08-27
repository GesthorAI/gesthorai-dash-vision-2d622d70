import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export const LeadsTableSkeleton = () => {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export const KPICardsSkeleton = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="p-4">
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-48 mb-4" />
          <Skeleton className="h-8 w-16" />
        </Card>
      ))}
    </div>
  );
};

export const BulkOperationProgress = ({ 
  current, 
  total, 
  operation 
}: { 
  current: number; 
  total: number; 
  operation: string; 
}) => {
  const percentage = Math.round((current / total) * 100);
  
  return (
    <Card className="p-4 border-blue-200 bg-blue-50">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-medium">{operation}</span>
          <span className="text-sm text-muted-foreground">
            {current} / {total}
          </span>
        </div>
        <div className="w-full bg-background rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {percentage}% concluído
        </p>
      </div>
    </Card>
  );
};