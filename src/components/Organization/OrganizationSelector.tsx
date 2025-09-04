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
import { useState } from "react";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { useCurrentOrganization } from "@/hooks/useOrganizations";

export const OrganizationSelector = () => {
  const [open, setOpen] = useState(false);
  const { 
    currentOrganizationId, 
    setCurrentOrganizationId, 
    organizations,
    isLoading 
  } = useOrganizationContext();
  
  const { data: currentOrg } = useCurrentOrganization(currentOrganizationId || undefined);

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" className="w-[200px] justify-start">
        <Building2 className="mr-2 h-4 w-4" />
        Carregando...
      </Button>
    );
  }

  return (
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
                  // TODO: Implementar criação de nova organização
                  console.log('Criar nova organização');
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
  );
};