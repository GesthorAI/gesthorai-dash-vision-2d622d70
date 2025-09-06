import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, XCircle, Eye } from 'lucide-react';

interface SearchTestResultsDialogProps {
  testResults: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SearchTestResultsDialog = ({ testResults, open, onOpenChange }: SearchTestResultsDialogProps) => {
  if (!testResults) return null;

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Search Test Results
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded">
            <span className="font-medium">Overall Status</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(testResults.success)}
              <Badge variant={testResults.success ? "default" : "destructive"}>
                {testResults.success ? "SUCCESS" : "FAILED"}
              </Badge>
            </div>
          </div>

          {testResults.search_id && (
            <div className="p-3 border rounded">
              <h4 className="font-medium mb-2">Search Information</h4>
              <div className="text-sm text-muted-foreground">
                <strong>Search ID:</strong> {testResults.search_id}
              </div>
              {testResults.status && (
                <div className="text-sm text-muted-foreground">
                  <strong>Status:</strong> {testResults.status}
                </div>
              )}
            </div>
          )}

          {testResults.error && (
            <div className="p-3 border border-red-200 rounded bg-red-50">
              <h4 className="font-medium mb-2 text-red-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Error Details
              </h4>
              <div className="text-sm text-red-700 space-y-1">
                <div><strong>Message:</strong> {testResults.error}</div>
                {testResults.details && (
                  <div><strong>Details:</strong> {testResults.details}</div>
                )}
                {testResults.n8nUrl && (
                  <div><strong>N8N URL:</strong> {testResults.n8nUrl}</div>
                )}
                {testResults.troubleshooting && (
                  <div><strong>Troubleshooting:</strong> {testResults.troubleshooting}</div>
                )}
              </div>
            </div>
          )}

          {testResults.message && (
            <div className="p-3 border border-green-200 rounded bg-green-50">
              <div className="text-sm text-green-700">
                <strong>Message:</strong> {testResults.message}
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Test performed at: {new Date().toLocaleString()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};