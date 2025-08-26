import { useState } from "react";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";
import { Overview } from "@/pages/Dashboard/Overview";
import { LeadSearch } from "@/pages/Dashboard/LeadSearch";
import { Funnel } from "@/pages/Dashboard/Funnel";
import { Quality } from "@/pages/Dashboard/Quality";
import { Operations } from "@/pages/Dashboard/Operations";

// Placeholder components for other pages are now replaced with real implementations

const Index = () => {
  const [currentPage, setCurrentPage] = useState("overview");

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
      default:
        return <Overview />;
    }
  };

  return (
    <DashboardLayout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderCurrentPage()}
    </DashboardLayout>
  );
};

export default Index;
