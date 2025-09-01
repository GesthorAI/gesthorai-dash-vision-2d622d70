import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Plus, 
  MessageSquare, 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle, 
  Clock,
  Users,
  Send,
  Eye,
  MoreVertical,
  Edit,
  Copy,
  Trash2
} from 'lucide-react';
import { FollowupWizard } from '@/components/Followups/FollowupWizard';
import { 
  useFollowupRuns, 
  useMessageTemplates, 
  useCreateDefaultTemplates,
  useFollowupRunItems,
  useSendFollowupMessages,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate
} from '@/hooks/useFollowups';
import { TemplateForm } from '@/components/Followups/TemplateForm';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export const Followups: React.FC = () => {
  const [showWizard, setShowWizard] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<string>('');

  const { data: runs, isLoading: runsLoading } = useFollowupRuns();
  const { data: templates } = useMessageTemplates();
  const { data: runItems } = useFollowupRunItems(selectedRunId);
  const createDefaultTemplates = useCreateDefaultTemplates();
  const sendMessages = useSendFollowupMessages();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  // Create default templates if none exist
  useEffect(() => {
    if (templates && templates.length === 0) {
      createDefaultTemplates.mutate();
    }
  }, [templates, createDefaultTemplates]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'sending': return 'bg-blue-500';
      case 'prepared': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'preparing': return 'Preparando';
      case 'prepared': return 'Preparado';
      case 'sending': return 'Enviando';
      case 'completed': return 'Concluído';
      case 'failed': return 'Falhado';
      default: return status;
    }
  };

  const handleContinueSending = async (runId: string) => {
    try {
      await sendMessages.mutateAsync({
        runId,
        batchSize: 10,
        delayMs: 2000
      });
    } catch (error) {
      console.error('Error continuing send:', error);
    }
  };

  const handleTemplateSubmit = async (templateData: any) => {
    if (editingTemplate) {
      await updateTemplate.mutateAsync({
        id: editingTemplate.id,
        template: templateData
      });
    } else {
      await createTemplate.mutateAsync(templateData);
    }
    setShowTemplateForm(false);
    setEditingTemplate(null);
  };

  const handleEditTemplate = (template: any) => {
    setEditingTemplate(template);
    setShowTemplateForm(true);
  };

  const handleDuplicateTemplate = (template: any) => {
    setEditingTemplate({
      ...template,
      name: `${template.name} (Cópia)`,
      id: null
    });
    setShowTemplateForm(true);
  };

  const handleDeleteTemplate = async () => {
    if (deletingTemplate) {
      await deleteTemplate.mutateAsync(deletingTemplate);
      setDeletingTemplate('');
    }
  };

  if (runsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Follow-ups WhatsApp</h1>
          <p className="text-muted-foreground">
            Automatize e monitore seus follow-ups via WhatsApp
          </p>
        </div>
        
        <Dialog open={showWizard} onOpenChange={setShowWizard}>
          <DialogTrigger asChild>
            <Button size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Novo Follow-up
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Follow-up</DialogTitle>
              <DialogDescription>
                Configure filtros, selecione templates de mensagem e envie follow-ups automatizados via WhatsApp
              </DialogDescription>
            </DialogHeader>
            <FollowupWizard onClose={() => setShowWizard(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="runs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="runs">Campanhas</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="runs" className="space-y-4">
          {runs && runs.length > 0 ? (
            <div className="grid gap-4">
              {runs.map((run) => {
                const progress = run.total_leads > 0 
                  ? ((run.sent_count + run.failed_count) / run.total_leads) * 100 
                  : 0;

                return (
                  <Card key={run.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {run.name}
                            <Badge 
                              variant="secondary" 
                              className={`${getStatusColor(run.status)} text-white`}
                            >
                              {getStatusLabel(run.status)}
                            </Badge>
                          </CardTitle>
                          <CardDescription>
                            Criado {formatDistanceToNow(new Date(run.created_at), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </CardDescription>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => setSelectedRunId(run.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            {run.status === 'prepared' && (
                              <DropdownMenuItem onClick={() => handleContinueSending(run.id)}>
                                <Play className="h-4 w-4 mr-2" />
                                Iniciar Envio
                              </DropdownMenuItem>
                            )}
                            {run.status === 'sending' && (
                              <DropdownMenuItem onClick={() => handleContinueSending(run.id)}>
                                <Send className="h-4 w-4 mr-2" />
                                Continuar Envio
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>Total: {run.total_leads}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>Enviados: {run.sent_count}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-500" />
                            <span>Falharam: {run.failed_count}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>Pendentes: {run.total_leads - run.sent_count - run.failed_count}</span>
                          </div>
                        </div>

                        {run.total_leads > 0 && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Progresso</span>
                              <span>{progress.toFixed(0)}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </div>
                        )}

                        {run.status === 'prepared' && (
                          <Button 
                            onClick={() => handleContinueSending(run.id)}
                            disabled={sendMessages.isPending}
                            size="sm"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            {sendMessages.isPending ? 'Iniciando...' : 'Iniciar Envio'}
                          </Button>
                        )}

                        {run.status === 'sending' && (
                          <Button 
                            onClick={() => handleContinueSending(run.id)}
                            disabled={sendMessages.isPending}
                            size="sm"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            {sendMessages.isPending ? 'Enviando...' : 'Continuar Envio'}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum follow-up criado</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Crie seu primeiro follow-up automatizado para começar a engajar com seus leads
                </p>
                <Button onClick={() => setShowWizard(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Follow-up
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Templates de Mensagem</h2>
            <Button onClick={() => setShowTemplateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Template
            </Button>
          </div>

          {templates && templates.length > 0 ? (
            <div className="grid gap-4">
              {templates.map((template) => (
                <Card key={template.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {template.name}
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{template.category}</Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateTemplate(template)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => setDeletingTemplate(template.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      {template.message}
                    </p>
                    <div className="flex gap-1 flex-wrap">
                      {template.variables.map((variable) => (
                        <Badge key={variable} variant="secondary" className="text-xs">
                          {variable}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum template encontrado</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Templates padrão serão criados automaticamente
                </p>
                <Button 
                  onClick={() => createDefaultTemplates.mutate()}
                  disabled={createDefaultTemplates.isPending}
                >
                  {createDefaultTemplates.isPending ? 'Criando...' : 'Criar Templates Padrão'}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Run Details Dialog */}
      {selectedRunId && runItems && (
        <Dialog open={!!selectedRunId} onOpenChange={() => setSelectedRunId('')}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes da Campanha</DialogTitle>
              <DialogDescription>
                Visualize o status e progresso de cada mensagem enviada nesta campanha
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {runItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{(item as any).leads?.name || 'Lead'}</span>
                      <Badge 
                        variant={item.status === 'sent' ? 'default' : 
                                item.status === 'failed' ? 'destructive' : 'secondary'}
                      >
                        {item.status === 'sent' ? 'Enviado' :
                         item.status === 'failed' ? 'Falhado' : 'Pendente'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {(item as any).leads?.business || 'Negócio'} • {(item as any).leads?.phone || 'Telefone'}
                    </p>
                    <p className="text-sm border-l-2 border-muted pl-3">
                      {item.message}
                    </p>
                    {item.error_message && (
                      <p className="text-xs text-red-500 mt-2">
                        Erro: {item.error_message}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Template Form Dialog */}
      <Dialog open={showTemplateForm} onOpenChange={(open) => {
        setShowTemplateForm(open);
        if (!open) setEditingTemplate(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Editar Template' : 'Novo Template'}
            </DialogTitle>
          </DialogHeader>
          <TemplateForm
            template={editingTemplate}
            onSubmit={handleTemplateSubmit}
            onCancel={() => {
              setShowTemplateForm(false);
              setEditingTemplate(null);
            }}
            isLoading={createTemplate.isPending || updateTemplate.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingTemplate} onOpenChange={() => setDeletingTemplate('')}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este template? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};