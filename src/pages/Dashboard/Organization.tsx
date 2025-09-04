import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MembersManagement } from "@/components/Organization/MembersManagement";
import { OrganizationSettings } from "@/components/Organization/OrganizationSettings";
import { Building2, Users, Settings } from "lucide-react";

export const Organization = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organização</h1>
        <p className="text-muted-foreground">
          Gerencie sua organização, membros e configurações
        </p>
      </div>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Membros
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <OrganizationSettings />
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <MembersManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};