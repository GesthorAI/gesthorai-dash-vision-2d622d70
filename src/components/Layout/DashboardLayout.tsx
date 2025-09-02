import {
  BarChart3,
  CheckSquare,
  Filter,
  Home,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  Search,
  Settings,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/Auth/AuthProvider";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  path: string;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const menuItems = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart3, path: '/' },
    { id: 'lead-search', label: 'Busca de Leads', icon: Search, path: '/?tab=lead-search' },
    { id: 'operations', label: 'Operações', icon: Users, path: '/?tab=operations' },
    { id: 'followups', label: 'Follow-ups', icon: MessageSquare, path: '/?tab=followups' },
    { id: 'tasks', label: 'Tarefas', icon: CheckSquare, path: '/?tab=tasks' },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp, path: '/?tab=analytics' },
    { id: 'quality', label: 'Qualidade', icon: Shield, path: '/?tab=quality' },
    { id: 'funnel', label: 'Funil', icon: Filter, path: '/?tab=funnel' },
    { id: 'integrations', label: 'Integrações', icon: Settings, path: '/settings/integrations' },
  ];

  return (
    <div className="flex h-screen bg-gray-100 text-gray-700">
      {/* Mobile Menu */}
      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            className="md:hidden absolute top-4 left-4 z-50"
            onClick={toggleMenu}
          >
            Menu
          </Button>
        </SheetTrigger>
        <SheetContent className="w-64">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription>Navegação</SheetDescription>
          </SheetHeader>
          <ScrollArea className="my-4">
            <div className="flex flex-col space-y-1">
              {menuItems.map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  className="flex items-center space-x-2 rounded-md p-2 hover:bg-gray-200"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:flex-col md:w-64 md:border-r md:border-gray-200">
        <div className="flex items-center justify-center h-16 border-b border-gray-200">
          <span className="font-bold text-lg">Gesthor AI</span>
        </div>
        <ScrollArea className="flex-1">
          <div className="flex flex-col space-y-1 p-2">
            {menuItems.map((item) => (
              <Link
                key={item.id}
                to={item.path}
                className="flex items-center space-x-2 rounded-md p-2 hover:bg-gray-200"
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </ScrollArea>
        <div className="p-2 border-t border-gray-200">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <div className="flex flex-col text-left">
                  <span>{user?.email}</span>
                  <span className="text-sm text-gray-500">
                    {user?.id ? "Admin" : "Guest"}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Perfil</DropdownMenuItem>
              <DropdownMenuItem>Configurações</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 p-4 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
