import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useLeads, useCreateLead } from "@/hooks/useLeads";
import { useLeadScoring } from "@/hooks/useLeadScoring";
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  X,
  FileSpreadsheet,
  Database,
  Users
} from "lucide-react";

interface ImportResult {
  success: number;
  errors: Array<{
    row: number;
    error: string;
    data: any;
  }>;
  duplicates: number;
}

export const ImportExportPanel = () => {
  const [importResults, setImportResults] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const { data: allLeads = [] } = useLeads();
  const createLead = useCreateLead();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione um arquivo CSV.",
        variant: "destructive"
      });
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    setImportResults(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error("O arquivo deve conter pelo menos uma linha de cabeçalho e uma linha de dados");
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const requiredFields = ['nome', 'empresa', 'cidade'];
      const missingFields = requiredFields.filter(field => !headers.includes(field));
      
      if (missingFields.length > 0) {
        throw new Error(`Campos obrigatórios faltando: ${missingFields.join(', ')}`);
      }

      const results: ImportResult = {
        success: 0,
        errors: [],
        duplicates: 0
      };

      const existingLeads = new Set(
        allLeads.map(lead => `${lead.name.toLowerCase()}-${lead.business.toLowerCase()}`)
      );

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const rowData: any = {};
        
        headers.forEach((header, index) => {
          rowData[header] = values[index] || '';
        });

        // Progress update
        setImportProgress((i / (lines.length - 1)) * 100);

        try {
          // Validate required fields
          if (!rowData.nome || !rowData.empresa || !rowData.cidade) {
            results.errors.push({
              row: i + 1,
              error: "Campos obrigatórios faltando (nome, empresa, cidade)",
              data: rowData
            });
            continue;
          }

          // Check for duplicates
          const leadKey = `${rowData.nome.toLowerCase()}-${rowData.empresa.toLowerCase()}`;
          if (existingLeads.has(leadKey)) {
            results.duplicates++;
            continue;
          }

          // Validate email format if provided
          if (rowData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rowData.email)) {
            results.errors.push({
              row: i + 1,
              error: "Formato de email inválido",
              data: rowData
            });
            continue;
          }

          // Calculate score for the lead
          const mockLead = [{
            id: "temp",
            name: rowData.nome,
            business: rowData.empresa,
            city: rowData.cidade,
            phone: rowData.telefone || null,
            email: rowData.email || null,
            niche: rowData.nicho || null,
            source: rowData.origem || "import",
            status: "novo",
            score: 0,
            user_id: "mock-user-id", // Temporary for scoring
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }];

          const { scoredLeads } = useLeadScoring(mockLead);
          const score = scoredLeads[0]?.score || 5;

          // Create the lead
          const result = await createLead.mutateAsync({
            name: rowData.nome,
            business: rowData.empresa,
            city: rowData.cidade,
            phone: rowData.telefone || undefined,
            email: rowData.email || undefined,
            niche: rowData.nicho || undefined,
            source: rowData.origem || "import",
            status: "novo",
            score
          });

          if (result.isDuplicate) {
            results.duplicates++;
          } else {
            existingLeads.add(leadKey);
            results.success++;
          }

        } catch (error) {
          results.errors.push({
            row: i + 1,
            error: error instanceof Error ? error.message : "Erro desconhecido",
            data: rowData
          });
        }

        // Small delay to prevent overwhelming the API
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setImportResults(results);
      
      toast({
        title: "Importação concluída",
        description: `${results.success} leads importados, ${results.duplicates} duplicados ignorados, ${results.errors.length} erros encontrados.`,
      });

    } catch (error) {
      toast({
        title: "Erro na importação",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
      setImportProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExport = async () => {
    if (allLeads.length === 0) {
      toast({
        title: "Nenhum dado para exportar",
        description: "Não há leads cadastrados para exportar.",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);

    try {
      const headers = [
        'Nome', 'Empresa', 'Cidade', 'Telefone', 'Email', 
        'Status', 'Score', 'Nicho', 'Origem', 'Data de Criação'
      ];
      
      const csvContent = [
        headers.join(','),
        ...allLeads.map(lead => [
          `"${lead.name}"`,
          `"${lead.business}"`,
          `"${lead.city}"`,
          `"${lead.phone || ''}"`,
          `"${lead.email || ''}"`,
          `"${lead.status}"`,
          lead.score,
          `"${lead.niche || ''}"`,
          `"${lead.source || ''}"`,
          `"${new Date(lead.created_at).toLocaleDateString('pt-BR')}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `leads-export-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Exportação concluída",
        description: `${allLeads.length} leads exportados com sucesso.`,
      });

    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os leads.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const downloadTemplate = () => {
    const templateHeaders = [
      'nome', 'empresa', 'cidade', 'telefone', 'email', 'nicho', 'origem'
    ];
    
    const sampleData = [
      'João Silva', 'Restaurante Bom Sabor', 'São Paulo', '11999999999', 
      'joao@bomsabor.com', 'Restaurantes', 'website'
    ];

    const csvContent = [
      templateHeaders.join(','),
      sampleData.map(value => `"${value}"`).join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'template-importacao-leads.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Template baixado",
      description: "Use este arquivo como modelo para importar seus leads.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Import/Export Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Importar Leads
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Importe leads em massa usando um arquivo CSV
            </p>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={downloadTemplate}
                className="flex-1"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Baixar Template
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="w-full"
            >
              {isImporting ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Selecionar Arquivo CSV
                </>
              )}
            </Button>

            {isImporting && (
              <div className="space-y-2">
                <Progress value={importProgress} className="w-full" />
                <p className="text-xs text-center text-muted-foreground">
                  {importProgress.toFixed(0)}% concluído
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Exportar Leads
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Exporte todos os leads cadastrados para CSV
            </p>
            
            <div className="flex items-center gap-2 text-sm">
              <Database className="h-4 w-4" />
              <span>{allLeads.length} leads cadastrados</span>
            </div>

            <Button
              onClick={handleExport}
              disabled={isExporting || allLeads.length === 0}
              className="w-full"
            >
              {isExporting ? (
                <>
                  <Download className="h-4 w-4 mr-2 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar para CSV
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Import Results */}
      {importResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Resultado da Importação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-2xl font-bold text-green-600">
                    {importResults.success}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">Importados</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="text-2xl font-bold text-red-600">
                    {importResults.errors.length}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">Erros</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Users className="h-5 w-5 text-yellow-600" />
                  <span className="text-2xl font-bold text-yellow-600">
                    {importResults.duplicates}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">Duplicados</p>
              </div>
            </div>

            {importResults.errors.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Erros Encontrados</h4>
                <div className="max-h-40 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Linha</TableHead>
                        <TableHead>Erro</TableHead>
                        <TableHead>Dados</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importResults.errors.slice(0, 10).map((error, index) => (
                        <TableRow key={index}>
                          <TableCell>{error.row}</TableCell>
                          <TableCell className="text-red-600 text-xs">
                            {error.error}
                          </TableCell>
                          <TableCell className="text-xs">
                            {JSON.stringify(error.data).substring(0, 50)}...
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {importResults.errors.length > 10 && (
                    <p className="text-xs text-muted-foreground p-2">
                      ... e mais {importResults.errors.length - 10} erros
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Format Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Formato do Arquivo CSV</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              <strong>Campos obrigatórios:</strong> nome, empresa, cidade<br/>
              <strong>Campos opcionais:</strong> telefone, email, nicho, origem<br/>
              <strong>Formato:</strong> Use vírgulas como separador e aspas para textos com vírgulas
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};