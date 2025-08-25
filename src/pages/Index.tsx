import { useState } from "react";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";
import { Overview } from "@/pages/Dashboard/Overview";
import { LeadSearch } from "@/pages/Dashboard/LeadSearch";

// Placeholder components for other pages
const Funnel = () => (
  <div className="space-y-6">
    <h1 className="text-3xl font-bold">Funil</h1>
    <p className="text-muted-foreground">Análise do funil de conversão - Em desenvolvimento</p>
  </div>
);

const Quality = () => (
  <div className="space-y-6">
    <h1 className="text-3xl font-bold">Qualidade & Score</h1>
    <p className="text-muted-foreground">Análise de qualidade dos leads - Em desenvolvimento</p>
  </div>
);

const Operations = () => (
  <div className="space-y-6">
    <h1 className="text-3xl font-bold">Operacional</h1>
    <p className="text-muted-foreground">Visão operacional e próximas ações - Em desenvolvimento</p>
  </div>
);

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
