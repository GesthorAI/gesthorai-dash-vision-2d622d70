import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/Auth/AuthProvider";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";

// Loading component for route transitions
const RouteLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
  </div>
);

// Lazy load all routes for better code splitting
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth").then(module => ({ default: module.Auth })));
const ResetPassword = lazy(() => import("./pages/ResetPassword").then(module => ({ default: module.ResetPassword })));
const NotFound = lazy(() => import("./pages/NotFound"));
const InviteAccept = lazy(() => import("./pages/InviteAccept").then(module => ({ default: module.InviteAccept })));

// Dashboard pages - lazy loaded
const Overview = lazy(() => import("./pages/Dashboard/Overview").then(module => ({ default: module.Overview })));
const Analytics = lazy(() => import("./pages/Dashboard/Analytics").then(module => ({ default: module.Analytics })));
const LeadSearch = lazy(() => import("./pages/Dashboard/LeadSearch").then(module => ({ default: module.LeadSearch })));
const Followups = lazy(() => import("./pages/Dashboard/Followups").then(module => ({ default: module.Followups })));
const Tasks = lazy(() => import("./pages/Dashboard/Tasks").then(module => ({ default: module.Tasks })));
const Operations = lazy(() => import("./pages/Dashboard/Operations"));
const Organization = lazy(() => import("./pages/Dashboard/Organization").then(module => ({ default: module.Organization })));
const Quality = lazy(() => import("./pages/Dashboard/Quality").then(module => ({ default: module.Quality })));
const Funnel = lazy(() => import("./pages/Dashboard/Funnel").then(module => ({ default: module.Funnel })));
const Security = lazy(() => import("./pages/Dashboard/Security"));
const Onboarding = lazy(() => import("./pages/Dashboard/Onboarding").then(module => ({ default: module.Onboarding })));

// Settings pages - lazy loaded
const AISettings = lazy(() => import("./pages/Settings/AISettings").then(module => ({ default: module.AISettings })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <OrganizationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<RouteLoader />}>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/reset-password" element={<ResetPassword />} />
                <Route path="/invite/:token" element={<InviteAccept />} />
                <Route path="/" element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                }>
                  <Route index element={<Overview />} />
                  <Route path="dashboard" element={<Overview />} />
                  <Route path="dashboard/analytics" element={<Analytics />} />
                  <Route path="dashboard/search" element={<LeadSearch />} />
                  <Route path="dashboard/followups" element={<Followups />} />
                  <Route path="dashboard/tasks" element={<Tasks />} />
                  <Route path="dashboard/operations" element={<Operations />} />
                  <Route path="dashboard/organization" element={<Organization />} />
                  <Route path="dashboard/quality" element={<Quality />} />
                  <Route path="dashboard/funnel" element={<Funnel />} />
                  <Route path="dashboard/settings/ai" element={<AISettings />} />
                  <Route path="dashboard/security" element={<Security />} />
                  <Route path="dashboard/onboarding" element={<Onboarding />} />
                </Route>
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </OrganizationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
