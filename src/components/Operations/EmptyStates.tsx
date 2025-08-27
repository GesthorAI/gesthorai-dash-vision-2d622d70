import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Search, FileText, Zap } from "lucide-react";

export const EmptyLeadsState = ({ onCreateSearch }: { onCreateSearch?: () => void }) => {
  return (
    <Card className="p-8 text-center">
      <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">Nenhum lead encontrado</h3>
      <p className="text-muted-foreground mb-6">
        Não encontramos leads com os filtros aplicados. Tente ajustar os filtros ou criar uma nova busca.
      </p>
      {onCreateSearch && (
        <Button onClick={onCreateSearch}>
          <Search className="h-4 w-4 mr-2" />
          Nova Busca
        </Button>
      )}
    </Card>
  );
};

export const EmptyTeamState = ({ onAddMember }: { onAddMember?: () => void }) => {
  return (
    <Card className="p-8 text-center">
      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">Nenhum membro da equipe</h3>
      <p className="text-muted-foreground mb-6">
        Adicione membros à sua equipe para começar a atribuir leads e automatizar processos.
      </p>
      {onAddMember && (
        <Button onClick={onAddMember}>
          <Users className="h-4 w-4 mr-2" />
          Adicionar Membro
        </Button>
      )}
    </Card>
  );
};

export const EmptyWorkflowsState = ({ onCreateWorkflow }: { onCreateWorkflow?: () => void }) => {
  return (
    <Card className="p-8 text-center">
      <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">Nenhum workflow configurado</h3>
      <p className="text-muted-foreground mb-6">
        Crie workflows automatizados para otimizar seus processos de vendas e follow-up.
      </p>
      {onCreateWorkflow && (
        <Button onClick={onCreateWorkflow}>
          <Zap className="h-4 w-4 mr-2" />
          Criar Workflow
        </Button>
      )}
    </Card>
  );
};

export const EmptyTemplatesState = ({ onCreateTemplate }: { onCreateTemplate?: () => void }) => {
  return (
    <Card className="p-8 text-center">
      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">Nenhum template criado</h3>
      <p className="text-muted-foreground mb-6">
        Crie templates de mensagem para padronizar seus follow-ups e melhorar a eficiência.
      </p>
      {onCreateTemplate && (
        <Button onClick={onCreateTemplate}>
          <FileText className="h-4 w-4 mr-2" />
          Criar Template
        </Button>
      )}
    </Card>
  );
};