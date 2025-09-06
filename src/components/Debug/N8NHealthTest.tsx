import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { CheckCircle, XCircle, AlertCircle, Play } from 'lucide-react';

interface HealthStatus {
  timestamp: string;
  environment: Record<string, string>;
  missingVariables: string[];
  n8nWebhook: {
    status: number | string;
    ok: boolean;
    statusText?: string;
    responsePreview?: string;
    error?: string;
    reason?: string;
  };
  overallStatus: 'HEALTHY' | 'UNHEALTHY';
  criticalMissing: string[];
}

export const N8NHealthTest = () => {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testingSearch, setTestingSearch] = useState(false);
  const { toast } = useToast();
  const { currentOrganizationId } = useOrganizationContext();

  const checkHealth = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('start-search-health');
      
      if (error) {
        throw error;
      }
      
      setHealthStatus(data);
      toast({
        title: "Health Check Complete",
        description: `Status: ${data.overallStatus}`,
        variant: data.overallStatus === 'HEALTHY' ? 'default' : 'destructive'
      });
    } catch (error) {
      console.error('Health check failed:', error);
      toast({
        title: "Health Check Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testStartSearch = async () => {
    if (!currentOrganizationId) {
      toast({
        title: "Error",
        description: "No organization selected",
        variant: "destructive"
      });
      return;
    }

    setTestingSearch(true);
    try {
      const { data, error } = await supabase.functions.invoke('start-search', {
        body: {
          niche: 'teste',
          city: 'São Paulo',
          organization_id: currentOrganizationId
        }
      });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Search Test Successful",
        description: `Search ID: ${data.search_id}`,
      });
      
      console.log('Search test result:', data);
    } catch (error) {
      console.error('Search test failed:', error);
      toast({
        title: "Search Test Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setTestingSearch(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SET':
      case 'HEALTHY':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'MISSING':
      case 'UNHEALTHY':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string, isOk?: boolean) => {
    if (status === 'SET' || (isOk && status !== 'ERROR')) {
      return <Badge variant="default" className="bg-green-500">OK</Badge>;
    }
    if (status === 'MISSING' || status === 'ERROR' || isOk === false) {
      return <Badge variant="destructive">ERROR</Badge>;
    }
    return <Badge variant="secondary">UNKNOWN</Badge>;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            N8N Integration Health Check
            {healthStatus && getStatusIcon(healthStatus.overallStatus)}
          </CardTitle>
          <CardDescription>
            Test the N8N webhook integration and environment configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={checkHealth} 
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? 'Checking...' : 'Run Health Check'}
            </Button>
            
            <Button 
              onClick={testStartSearch} 
              disabled={testingSearch || !currentOrganizationId}
              variant="default"
            >
              <Play className="h-4 w-4 mr-2" />
              {testingSearch ? 'Testing...' : 'Test Search'}
            </Button>
          </div>

          {healthStatus && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Overall Status</h4>
                <div className="flex items-center gap-2">
                  {getStatusIcon(healthStatus.overallStatus)}
                  <span className="font-medium">{healthStatus.overallStatus}</span>
                  <span className="text-sm text-muted-foreground">
                    ({new Date(healthStatus.timestamp).toLocaleString()})
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Environment Variables</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Object.entries(healthStatus.environment).map(([key, status]) => (
                    <div key={key} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm font-mono">{key}</span>
                      {getStatusBadge(status)}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">N8N Webhook Test</h4>
                <div className="p-3 border rounded space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status:</span>
                    {getStatusBadge(healthStatus.n8nWebhook.status.toString(), healthStatus.n8nWebhook.ok)}
                  </div>
                  <div className="text-sm">
                    <strong>Response:</strong> {healthStatus.n8nWebhook.status} {healthStatus.n8nWebhook.statusText}
                  </div>
                  {healthStatus.n8nWebhook.responsePreview && (
                    <div className="text-xs text-muted-foreground">
                      <strong>Preview:</strong> {healthStatus.n8nWebhook.responsePreview}
                    </div>
                  )}
                  {healthStatus.n8nWebhook.error && (
                    <div className="text-xs text-red-500">
                      <strong>Error:</strong> {healthStatus.n8nWebhook.error}
                    </div>
                  )}
                  {healthStatus.n8nWebhook.reason && (
                    <div className="text-xs text-yellow-600">
                      <strong>Reason:</strong> {healthStatus.n8nWebhook.reason}
                    </div>
                  )}
                </div>
              </div>

              {healthStatus.missingVariables.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-red-600">Missing Variables</h4>
                  <div className="flex flex-wrap gap-1">
                    {healthStatus.missingVariables.map((variable) => (
                      <Badge key={variable} variant="destructive" className="text-xs">
                        {variable}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};