import { useEffect } from "react";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";
import { useNavigation } from "@/hooks/useNavigation";
import { Overview } from "@/pages/Dashboard/Overview";
import { LeadSearch } from "@/pages/Dashboard/LeadSearch";
import { Funnel } from "@/pages/Dashboard/Funnel";
import { Quality } from "@/pages/Dashboard/Quality";
import Operations from "@/pages/Dashboard/Operations";
import { Analytics } from "@/pages/Dashboard/Analytics";
import { Tasks } from "@/pages/Dashboard/Tasks";
import { Followups } from "@/pages/Dashboard/Followups";

// Placeholder components for other pages are now replaced with real implementations

const Index = () => {
  const { currentPage, navigateToPage } = useNavigation();

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
