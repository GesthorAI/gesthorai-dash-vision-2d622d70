import { Check, ChevronsUpDown, Plus, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { useCurrentOrganization, useCreateOrganization } from "@/hooks/useOrganizations";
import { useToast } from "@/hooks/use-toast";

export const OrganizationSelector = () => {
  const [open, setOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  
  const { 
    currentOrganizationId, 
    setCurrentOrganizationId, 
    organizations,
    isLoading 
  } = useOrganizationContext();
  
  const { data: currentOrg } = useCurrentOrganization(currentOrganizationId || undefined);
  const { mutate: createOrganization, isPending: isCreating } = useCreateOrganization();
  const { toast } = useToast();

  const handleCreateOrganization = () => {
    if (!orgName.trim() || !orgSlug.trim()) {
      toast({
        title: "Erro",
        description: "Nome e slug são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    createOrganization(
      { name: orgName.trim(), slug: orgSlug.trim() },
      {
        onSuccess: (newOrg) => {
          setCurrentOrganizationId(newOrg.id);
          setCreateDialogOpen(false);
          setOrgName('');
          setOrgSlug('');
          setOpen(false);
          toast({
            title: "Sucesso",
            description: "Organização criada com sucesso"
          });
        },
        onError: (error) => {
          toast({
            title: "Erro",
            description: `Erro ao criar organização: ${error.message}`,
            variant: "destructive"
          });
        }
      }
    );
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleNameChange = (value: string) => {
    setOrgName(value);
    if (!orgSlug || orgSlug === generateSlug(orgName)) {
      setOrgSlug(generateSlug(value));
    }
  };

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" className="w-[200px] justify-start">
        <Building2 className="mr-2 h-4 w-4" />
        Carregando...
      </Button>
    );
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            className="w-[200px] justify-between"
          >
            <div className="flex items-center">
              <Building2 className="mr-2 h-4 w-4" />
              <span className="truncate">
                {currentOrg?.name || "Selecionar organização"}
              </span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput placeholder="Buscar organização..." />
            <CommandList>
              <CommandEmpty>Nenhuma organização encontrada.</CommandEmpty>
              <CommandGroup>
                {organizations.map((org) => (
                  <CommandItem
                    key={org.id}
                    value={org.id}
                    onSelect={() => {
                      setCurrentOrganizationId(org.id === currentOrganizationId ? null : org.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        currentOrganizationId === org.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{org.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {org.plan === 'free' ? 'Plano Gratuito' : 'Plano Pro'}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    setCreateDialogOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Criar organização
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Create Organization Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Criar Nova Organização</DialogTitle>
            <DialogDescription>
              Crie uma nova organização para gerenciar seus leads e equipe.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="org-name">Nome da Organização</Label>
              <Input
                id="org-name"
                value={orgName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ex: Minha Empresa"
                disabled={isCreating}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="org-slug">Identificador (Slug)</Label>
              <Input
                id="org-slug"
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value)}
                placeholder="minha-empresa"
                disabled={isCreating}
              />
              <p className="text-xs text-muted-foreground">
                Este será usado na URL da sua organização
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setOrgName('');
                setOrgSlug('');
              }}
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateOrganization} disabled={isCreating}>
              {isCreating ? "Criando..." : "Criar Organização"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};