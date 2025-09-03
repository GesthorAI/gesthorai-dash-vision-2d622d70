import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { Menu, LogOut, Settings, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUISettings } from "@/hooks/useUISettings";
import { RealtimeNotifications } from "@/components/Notifications/RealtimeNotifications";

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

const navigationItems = [
  { id: "overview", label: "Visão Geral", icon: BarChart3 },
  { id: "search", label: "Busca de Leads", icon: Search },
  { id: "tasks", label: "Tarefas", icon: CheckSquare },
  { id: "followups", label: "Follow-ups", icon: MessageSquare },
  { id: "funnel", label: "Funil", icon: Filter },
  { id: "quality", label: "Qualidade & Score", icon: Award },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "operations", label: "Operacional", icon: Settings },
  { id: "ai-settings", label: "Configurações IA", icon: Cog },
];

export const DashboardLayout = ({ children, currentPage, onPageChange }: DashboardLayoutProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPagesConfig, setShowPagesConfig] = useState(false);
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { settings, updateSettings } = useUISettings();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro no logout",
        description: "Ocorreu um erro ao fazer logout.",
        variant: "destructive",
      });
    }
  };

  // Filter navigation items based on visibility settings
  const visibleNavigationItems = navigationItems.filter(item => {
    const pageVisibilityMap: Record<string, keyof typeof settings.pagesVisibility> = {
      'overview': 'showOverview',
      'search': 'showSearch', 
      'funnel': 'showFunnel',
      'quality': 'showQuality',
      'analytics': 'showAnalytics',
      'operations': 'showOperations',
      'tasks': 'showTasks',
      'followups': 'showFollowups',
      'ai-settings': 'showAISettings',
    };
    const key = pageVisibilityMap[item.id];
    return key ? settings.pagesVisibility[key] : true;
  });

  const getUserInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-brand-primary to-brand-primary-light">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Gesthor<span className="text-accent">AI</span>
              </h1>
              <p className="text-xs text-muted-foreground">Lead Flow Dashboard</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            <nav className="flex items-center gap-2">
              {visibleNavigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <Button
                    key={item.id}
                    variant={isActive ? "default" : "ghost"}
                    className={`nav-link ${isActive ? "active" : ""}`}
                    onClick={() => onPageChange(item.id)}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Button>
                );
              })}
            </nav>

            {/* Display Settings & User Profile */}
            <div className="flex items-center gap-2">
              <RealtimeNotifications />
              
              {/* Display Settings Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Monitor className="h-4 w-4 mr-2" />
                    Display
                  </Button>
                </DropdownMenuTrigger>
                  <div className="p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Modo Compacto</span>
                      <Switch
                        checked={settings.compactMode}
                        onCheckedChange={(checked) => 
                          updateSettings({ compactMode: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Estatísticas</span>
                      <Switch
                        checked={settings.showStats}
                        onCheckedChange={(checked) => 
                          updateSettings({ showStats: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Progresso</span>
                      <Switch
                        checked={settings.showProgress}
                        onCheckedChange={(checked) => 
                          updateSettings({ showProgress: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Dicas de Ajuda</span>
                      <Switch
                        checked={settings.showHelpHints}
                        onCheckedChange={(checked) => 
                          updateSettings({ showHelpHints: checked })
                        }
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowPagesConfig(true)}
                      className="w-full mt-2"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Configurar Páginas
                    </Button>
                  </div>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user?.email ? getUserInitials(user.email) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex flex-col space-y-1 p-2">
                    <p className="text-sm font-medium leading-none">{user?.email}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      Gestão de Leads
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {user?.email ? getUserInitials(user.email) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium leading-none">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMobileMenu}
            >
              {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-card">
            <nav className="flex flex-col p-4 gap-2">
              {visibleNavigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <Button
                    key={item.id}
                    variant={isActive ? "default" : "ghost"}
                    className={`nav-link ${isActive ? "active" : ""} justify-start`}
                    onClick={() => {
                      onPageChange(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Button>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className={`container mx-auto ${settings.compactMode ? 'p-4' : 'p-6'}`}>
        {children}
      </main>

      {/* Pages Configuration Dialog */}
      <Dialog open={showPagesConfig} onOpenChange={setShowPagesConfig}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar Páginas</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Páginas Principais</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-overview">Visão Geral</Label>
                  <Switch
                    id="show-overview"
                    checked={settings.pagesVisibility.showOverview}
                    onCheckedChange={(checked) => 
                      updateSettings({ 
                        pagesVisibility: { ...settings.pagesVisibility, showOverview: checked } 
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-search">Busca de Leads</Label>
                  <Switch
                    id="show-search"
                    checked={settings.pagesVisibility.showSearch}
                    onCheckedChange={(checked) => 
                      updateSettings({ 
                        pagesVisibility: { ...settings.pagesVisibility, showSearch: checked } 
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-tasks">Tarefas</Label>
                  <Switch
                    id="show-tasks"
                    checked={settings.pagesVisibility.showTasks}
                    onCheckedChange={(checked) => 
                      updateSettings({ 
                        pagesVisibility: { ...settings.pagesVisibility, showTasks: checked } 
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-followups">Follow-ups</Label>
                  <Switch
                    id="show-followups"
                    checked={settings.pagesVisibility.showFollowups}
                    onCheckedChange={(checked) => 
                      updateSettings({ 
                        pagesVisibility: { ...settings.pagesVisibility, showFollowups: checked } 
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-operations">Operações</Label>
                  <Switch
                    id="show-operations"
                    checked={settings.pagesVisibility.showOperations}
                    onCheckedChange={(checked) => 
                      updateSettings({ 
                        pagesVisibility: { ...settings.pagesVisibility, showOperations: checked } 
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-ai-settings">Configuração IA</Label>
                  <Switch
                    id="show-ai-settings"
                    checked={settings.pagesVisibility.showAISettings}
                    onCheckedChange={(checked) => 
                      updateSettings({ 
                        pagesVisibility: { ...settings.pagesVisibility, showAISettings: checked } 
                      })
                    }
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Páginas Avançadas</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-funnel">Funil</Label>
                  <Switch
                    id="show-funnel"
                    checked={settings.pagesVisibility.showFunnel}
                    onCheckedChange={(checked) => 
                      updateSettings({ 
                        pagesVisibility: { ...settings.pagesVisibility, showFunnel: checked } 
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-quality">Qualidade & Score</Label>
                  <Switch
                    id="show-quality"
                    checked={settings.pagesVisibility.showQuality}
                    onCheckedChange={(checked) => 
                      updateSettings({ 
                        pagesVisibility: { ...settings.pagesVisibility, showQuality: checked } 
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-analytics">Analytics</Label>
                  <Switch
                    id="show-analytics"
                    checked={settings.pagesVisibility.showAnalytics}
                    onCheckedChange={(checked) => 
                      updateSettings({ 
                        pagesVisibility: { ...settings.pagesVisibility, showAnalytics: checked } 
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};