import { KPICard } from "@/components/Dashboard/KPICard";
import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Phone, MessageSquare, Target, TrendingUp } from "lucide-react";

// Mock data - replace with real data from Google Sheets
const mockConversionsData = [
  { date: "01/12", conversas: 12 },
  { date: "02/12", conversas: 18 },
  { date: "03/12", conversas: 14 },
  { date: "04/12", conversas: 26 },
  { date: "05/12", conversas: 22 },
  { date: "06/12", conversas: 28 },
  { date: "07/12", conversas: 32 },
];

const mockTopOrigins = [
  { origem: "Instagram", leads: 157, responderam: 89, taxa: "56.7%" },
  { origem: "Facebook", leads: 134, responderam: 72, taxa: "53.7%" },
  { origem: "Google", leads: 98, responderam: 45, taxa: "45.9%" },
  { origem: "LinkedIn", leads: 67, responderam: 38, taxa: "56.7%" },
  { origem: "WhatsApp", leads: 42, responderam: 28, taxa: "66.7%" },
];

export const Overview = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Visão Geral</h1>
          <p className="text-muted-foreground">Últimos 7 dias</p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Leads Novos"
          value="342"
          trend={{ value: 12.5, isPositive: true, period: "período anterior" }}
          icon={<Users className="h-4 w-4" />}
        />
        <KPICard
          title="Leads Hoje"
          value="23"
          trend={{ value: 8.2, isPositive: true, period: "ontem" }}
          icon={<Target className="h-4 w-4" />}
        />
        <KPICard
          title="Taxa de Resposta"
          value="68.4%"
          trend={{ value: -2.1, isPositive: false, period: "período anterior" }}
          icon={<MessageSquare className="h-4 w-4" />}
        />
        <KPICard
          title="Leads Quentes"
          value="117"
          trend={{ value: 15.3, isPositive: true, period: "período anterior" }}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <KPICard
          title="Agendados"
          value="47"
          trend={{ value: 22.8, isPositive: true, period: "período anterior" }}
          icon={<Phone className="h-4 w-4" />}
        />
      </div>

      {/* Charts and Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversas por Dia Chart */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Conversas por Dia</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockConversionsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="conversas" 
                  stroke="hsl(var(--accent))"
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--accent))", strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Top Origens Table */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Top Origens</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Origem</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Responderam</TableHead>
                <TableHead>Taxa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockTopOrigins.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.origem}</TableCell>
                  <TableCell>{item.leads}</TableCell>
                  <TableCell>{item.responderam}</TableCell>
                  <TableCell>
                    <span className={`font-medium ${
                      parseFloat(item.taxa) > 55 ? "text-success" : 
                      parseFloat(item.taxa) > 45 ? "text-warning" : "text-destructive"
                    }`}>
                      {item.taxa}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
};