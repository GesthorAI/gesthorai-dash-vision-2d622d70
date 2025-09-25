import { useEffect } from "react";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";
import { useNavigation } from "@/hooks/useNavigation";
import { useUISettings } from "@/hooks/useUISettings";
import { Overview } from "@/pages/Dashboard/Overview";
import { LeadSearch } from "@/pages/Dashboard/LeadSearch";
import { Funnel } from "@/pages/Dashboard/Funnel";
import { Quality } from "@/pages/Dashboard/Quality";
import Operations from "@/pages/Dashboard/Operations";
import { Analytics } from "@/pages/Dashboard/Analytics";
import { Tasks } from "@/pages/Dashboard/Tasks";
import { Followups } from "@/pages/Dashboard/Followups";
import { Organization } from "@/pages/Dashboard/Organization";
import Security from "@/pages/Dashboard/Security";
import { AISettings } from "@/pages/Settings/AISettings";

// Placeholder components for other pages are now replaced with real implementations

const Index = () => {
  const { currentPage, navigateToPage } = useNavigation();
  const { settings } = useUISettings();

  // Redirect to overview if current page is hidden
  useEffect(() => {
    const pageVisibilityMap: Record<string, keyof typeof settings.pagesVisibility> = {
      'overview': 'showOverview',
      'search': 'showSearch', 
      'tasks': 'showTasks',
      'followups': 'showFollowups',
      'operations': 'showOperations',
      'organization': 'showOrganization',
      'security': 'showSecurity',
      'ai-settings': 'showAISettings',
      'funnel': 'showFunnel',
      'quality': 'showQuality',
      'analytics': 'showAnalytics',
    };

    const visibilityKey = pageVisibilityMap[currentPage];
    if (visibilityKey && !settings.pagesVisibility[visibilityKey]) {
      navigateToPage('overview');
    }
  }, [currentPage, settings.pagesVisibility, navigateToPage]);

  const renderCurrentPage = () => {
    switch (currentPage) {
      case "overview":
        return <Overview />;
      case "funnel":
        return <Funnel />;
      case "quality":
        return <Quality />;
      case "operations":
        return <Operations />;
      case "search":
        return <LeadSearch />;
      case "tasks":
        return <Tasks />;
      case "followups":
        return <Followups />;
      case "analytics":
        return <Analytics />;
      case "organization":
        return <Organization />;
      case "security":
        return <Security />;
      case "ai-settings":
        return <AISettings />;
      default:
        return <Overview />;
    }
  };

  return (
    <DashboardLayout currentPage={currentPage} onPageChange={navigateToPage}>
      {renderCurrentPage()}
    </DashboardLayout>
  );
};

export default Index;
