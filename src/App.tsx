import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/Auth/AuthProvider";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import Index from "./pages/Index";
import { Auth } from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard/Overview";
import Operations from "./pages/Dashboard/Operations";
import { Organization } from "./pages/Dashboard/Organization";
import { Quality } from "./pages/Dashboard/Quality";
import { Funnel } from "./pages/Dashboard/Funnel";
import { AISettings } from "./pages/Settings/AISettings";
import { Onboarding } from "./pages/Dashboard/Onboarding";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <OrganizationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="dashboard/analytics" element={<Analytics />} />
                <Route path="dashboard/search" element={<LeadSearch />} />
                <Route path="dashboard/followups" element={<Followups />} />
                <Route path="dashboard/tasks" element={<Tasks />} />
                <Route path="dashboard/operations" element={<Operations />} />
                <Route path="dashboard/organization" element={<Organization />} />
                <Route path="dashboard/quality" element={<Quality />} />
                <Route path="dashboard/funnel" element={<Funnel />} />
                <Route path="dashboard/settings/ai" element={<AISettings />} />
                <Route path="dashboard/onboarding" element={<Onboarding />} />
              </Route>
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </OrganizationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
