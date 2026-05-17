"use client";

import { useState } from "react";
import Link from "next/link";
import {
  RefreshCw,
  Download,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Package,
  Wrench,
  Activity,
  BarChart3,
} from "lucide-react";
import { useWeldsKPIs, useSpoolStageCounts } from "@/store";
import { STAGE_ORDER, STAGE_COLOR, type SpoolFabStage } from "@/lib/spool-data";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from "recharts";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

const fabricationProgressData = [
  { week: "W1", planned: 5, actual: 4 },
  { week: "W2", planned: 10, actual: 9 },
  { week: "W3", planned: 15, actual: 16 },
  { week: "W4", planned: 22, actual: 21 },
  { week: "W5", planned: 28, actual: 27 },
  { week: "W6", planned: 32, actual: 32.4 },
];

const weldingProgressData = [
  { week: "W1", butt: 120, socket: 80, fillet: 60 },
  { week: "W2", butt: 280, socket: 180, fillet: 140 },
  { week: "W3", butt: 450, socket: 290, fillet: 220 },
  { week: "W4", butt: 620, socket: 400, fillet: 310 },
  { week: "W5", butt: 780, socket: 510, fillet: 390 },
  { week: "W6", butt: 920, socket: 600, fillet: 460 },
];

const defectDistributionData = [
  { name: "Porosity", value: 35, color: "#3b82f6" },
  { name: "Undercut", value: 25, color: "#10b981" },
  { name: "Crack", value: 15, color: "#ef4444" },
  { name: "Incomplete Fusion", value: 15, color: "#f59e0b" },
  { name: "Other", value: 10, color: "#6b7280" },
];

const inspectionPassRateData = [
  { name: "Pass Rate", value: 94, fill: "#10b981" },
];

const weldStatusMatrixData = [
  { wbu: "WBU-01", ready: 120, inProgress: 45, complete: 280 },
  { wbu: "WBU-02", ready: 95, inProgress: 62, complete: 310 },
  { wbu: "WBU-03", ready: 140, inProgress: 38, complete: 195 },
  { wbu: "WBU-04", ready: 75, inProgress: 55, complete: 420 },
  { wbu: "WBU-05", ready: 110, inProgress: 48, complete: 265 },
];

const weldDistributionByAreaData = [
  { area: "Area A", butt: 450, socket: 280, fillet: 180 },
  { area: "Area B", butt: 380, socket: 320, fillet: 220 },
  { area: "Area C", butt: 520, socket: 190, fillet: 150 },
  { area: "Area D", butt: 290, socket: 410, fillet: 280 },
];

const reworkTrendData = [
  { week: "W1", count: 12, percentage: 2.8 },
  { week: "W2", count: 18, percentage: 3.2 },
  { week: "W3", count: 15, percentage: 2.5 },
  { week: "W4", count: 22, percentage: 3.1 },
  { week: "W5", count: 14, percentage: 2.2 },
  { week: "W6", count: 10, percentage: 1.8 },
];

const weeklySummaryData = [
  { metric: "Spools Fabricated", w4: 142, w5: 168, w6: 187, trend: "up" },
  { metric: "Welds Completed", w4: 892, w5: 1024, w6: 1156, trend: "up" },
  {
    metric: "Inspection Pass Rate",
    w4: "92%",
    w5: "93%",
    w6: "94%",
    trend: "up",
  },
  { metric: "Rework Items", w4: 22, w5: 14, w6: 10, trend: "down" },
  {
    metric: "Material Utilization",
    w4: "87%",
    w5: "89%",
    w6: "91%",
    trend: "up",
  },
];

const criticalAlerts = [
  {
    id: 1,
    severity: "high",
    title: 'Material Shortage - 6" CS Pipe',
    description: "Stock below minimum threshold",
    time: "2h ago",
  },
  {
    id: 2,
    severity: "high",
    title: "NDT Backlog Critical",
    description: "247 welds pending inspection",
    time: "4h ago",
  },
  {
    id: 3,
    severity: "medium",
    title: "Welder Certification Expiring",
    description: "3 welders due for recertification",
    time: "1d ago",
  },
] as const;

const riskHeatmapData = [
  {
    area: "Schedule",
    wbu1: "low",
    wbu2: "medium",
    wbu3: "low",
    wbu4: "high",
    wbu5: "medium",
  },
  {
    area: "Quality",
    wbu1: "low",
    wbu2: "low",
    wbu3: "medium",
    wbu4: "low",
    wbu5: "low",
  },
  {
    area: "Resource",
    wbu1: "medium",
    wbu2: "low",
    wbu3: "high",
    wbu4: "medium",
    wbu5: "low",
  },
  {
    area: "Material",
    wbu1: "high",
    wbu2: "medium",
    wbu3: "low",
    wbu4: "medium",
    wbu5: "high",
  },
] as const;

const materialShortages = [
  { material: '6" CS Pipe Sch 40', required: 450, available: 120, unit: "m" },
  {
    material: '4" SS 316L Elbow 90°',
    required: 85,
    available: 32,
    unit: "pcs",
  },
  { material: '8" Flange RF 150#', required: 64, available: 48, unit: "pcs" },
];

const STAGE_SCREENS: Partial<Record<SpoolFabStage, string>> = {
  "Material Check": "/fabrication/material-check",
  "Weld Progress": "/fabrication/weld-progress",
  Fabricated: "/fabrication/qc-release",
  "QC Release": "/fabrication/qc-release",
};

function FunnelSection() {
  const counts = useSpoolStageCounts();

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">
        Spool fabrication pipeline
      </h3>
      <div className="grid grid-cols-4 xl:grid-cols-8 gap-3">
        {STAGE_ORDER.map((stage) => {
          const count = counts[stage];
          const colors = STAGE_COLOR[stage];
          const isEmpty = count === 0;

          const tile = (
            <div
              className={[
                "relative flex flex-col gap-1 rounded-lg border bg-white p-3",
                "overflow-hidden",
                isEmpty
                  ? "opacity-50 cursor-default"
                  : "hover:shadow-sm transition-shadow",
              ].join(" ")}
            >
              <div
                className={`absolute left-0 top-0 bottom-0 w-1 ${colors.rail}`}
              />
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                {stage}
              </span>
              <span className="text-2xl font-semibold text-slate-900">
                {count}
              </span>
              <span className="text-xs text-slate-500">
                {isEmpty ? "empty" : `${count} spool${count === 1 ? "" : "s"}`}
              </span>
            </div>
          );

          const screen = STAGE_SCREENS[stage];
          if (!screen) {
            return (
              <div
                key={stage}
                className={[
                  "cursor-not-allowed opacity-60",
                  isEmpty ? "opacity-40" : "",
                ].join(" ")}
                title="Coming in G3/G4/G5"
              >
                {tile}
              </div>
            );
          }

          return (
            <Link key={stage} href={screen} className="block">
              {tile}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function FabricationDashboard() {
  const [timeScale, setTimeScale] = useState("30D");
  const [wbu, setWbu] = useState("all");
  const [designArea, setDesignArea] = useState("all");
  const [materialType, setMaterialType] = useState("all");
  const [sizeRange, setSizeRange] = useState("all");
  const kpis = useWeldsKPIs();

  const getRiskColor = (level: string) => {
    switch (level) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-amber-400";
      case "low":
        return "bg-emerald-500";
      default:
        return "bg-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-40 -mx-6 -mt-6 border-b bg-white px-6 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <Tabs value={timeScale} onValueChange={setTimeScale}>
              <TabsList className="h-8">
                <TabsTrigger value="7D" className="text-xs px-3">
                  7D
                </TabsTrigger>
                <TabsTrigger value="30D" className="text-xs px-3">
                  30D
                </TabsTrigger>
                <TabsTrigger value="90D" className="text-xs px-3">
                  90D
                </TabsTrigger>
                <TabsTrigger value="YTD" className="text-xs px-3">
                  YTD
                </TabsTrigger>
                <TabsTrigger value="Custom" className="text-xs px-3">
                  Custom
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Select value={wbu} onValueChange={setWbu}>
              <SelectTrigger size="sm" className="w-[140px]">
                <SelectValue placeholder="WBU" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All units (12)</SelectItem>
                <SelectItem value="wbu-01">WBU-01</SelectItem>
                <SelectItem value="wbu-02">WBU-02</SelectItem>
                <SelectItem value="wbu-03">WBU-03</SelectItem>
                <SelectItem value="wbu-04">WBU-04</SelectItem>
                <SelectItem value="wbu-05">WBU-05</SelectItem>
              </SelectContent>
            </Select>

            <Select value={designArea} onValueChange={setDesignArea}>
              <SelectTrigger size="sm" className="w-[130px]">
                <SelectValue placeholder="Design Area" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All areas</SelectItem>
                <SelectItem value="area-a">Area A</SelectItem>
                <SelectItem value="area-b">Area B</SelectItem>
                <SelectItem value="area-c">Area C</SelectItem>
                <SelectItem value="area-d">Area D</SelectItem>
              </SelectContent>
            </Select>

            <Select value={materialType} onValueChange={setMaterialType}>
              <SelectTrigger size="sm" className="w-[140px]">
                <SelectValue placeholder="Material Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All materials</SelectItem>
                <SelectItem value="cs">Carbon Steel</SelectItem>
                <SelectItem value="ss">Stainless Steel</SelectItem>
                <SelectItem value="alloy">Alloy</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sizeRange} onValueChange={setSizeRange}>
              <SelectTrigger size="sm" className="w-[120px]">
                <SelectValue placeholder="Size Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sizes</SelectItem>
                <SelectItem value="small">{"<"} 2"</SelectItem>
                <SelectItem value="medium">2" - 6"</SelectItem>
                <SelectItem value="large">{">"} 6"</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              Last updated 2 min ago
            </span>
            <Button variant="outline" size="icon-sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button size="sm">
              <Download className="h-4 w-4 mr-1" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      <FunnelSection />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total Spools
            </CardDescription>
            <CardTitle className="text-3xl font-bold">3,847</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Project scope</p>
            <div className="flex items-center gap-1 mt-1 text-sm text-emerald-600">
              <TrendingUp className="h-3 w-3" />
              <span>+247 from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Spools Fabricated
            </CardDescription>
            <CardTitle className="text-3xl font-bold">1,247</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Progress value={32.4} className="flex-1" />
              <span className="text-sm font-medium">32.4%</span>
            </div>
            <div className="flex items-center gap-1 mt-1 text-sm text-emerald-600">
              <TrendingUp className="h-3 w-3" />
              <span>+12% vs last week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Schedule Variance
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-emerald-600">
              +8.3%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Days ahead of schedule
            </p>
            <div className="flex items-center gap-1 mt-1 text-sm text-emerald-600">
              <TrendingDown className="h-3 w-3" />
              <span>2.1 days improvement</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Ontime Completion
            </CardDescription>
            <CardTitle className="text-3xl font-bold">94%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Target achievement</p>
            <div className="flex items-center gap-1 mt-1 text-sm text-emerald-600">
              <TrendingUp className="h-3 w-3" />
              <span>+1.2% vs baseline</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Fabrication Progress
            </CardTitle>
            <CardDescription>Planned vs Actual (%)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={fabricationProgressData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="planned"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Welding Progress
            </CardTitle>
            <CardDescription>Cumulative welds by type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weldingProgressData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="butt"
                    stackId="1"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.8}
                  />
                  <Area
                    type="monotone"
                    dataKey="socket"
                    stackId="1"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.8}
                  />
                  <Area
                    type="monotone"
                    dataKey="fillet"
                    stackId="1"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.8}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Inspection Pass Rate
            </CardTitle>
            <CardDescription>First-time pass percentage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="90%"
                  barSize={20}
                  data={inspectionPassRateData}
                  startAngle={90}
                  endAngle={-270}
                >
                  <RadialBar background dataKey="value" cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-3xl font-bold">94%</span>
                <span className="text-xs text-muted-foreground">Pass Rate</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Defect Distribution
            </CardTitle>
            <CardDescription>By defect type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={defectDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {defectDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Weld Status Matrix
            </CardTitle>
            <CardDescription>Status by Work Breakdown Unit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weldStatusMatrixData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    dataKey="wbu"
                    type="category"
                    tick={{ fontSize: 12 }}
                    width={60}
                  />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="complete"
                    stackId="a"
                    fill="#10b981"
                    name="Complete"
                  />
                  <Bar
                    dataKey="inProgress"
                    stackId="a"
                    fill="#f59e0b"
                    name="In Progress"
                  />
                  <Bar
                    dataKey="ready"
                    stackId="a"
                    fill="#94a3b8"
                    name="Ready"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Weld Distribution by Area
            </CardTitle>
            <CardDescription>
              Weld count by design area and type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weldDistributionByAreaData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="area" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="butt" fill="#3b82f6" name="Butt Weld" />
                  <Bar dataKey="socket" fill="#10b981" name="Socket Weld" />
                  <Bar dataKey="fillet" fill="#f59e0b" name="Fillet Weld" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Rework Trend</CardTitle>
            <CardDescription>Count and percentage over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reworkTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    unit="%"
                  />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="count"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Rework Count"
                    dot={{ fill: "#ef4444", r: 4 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="percentage"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="% of Total"
                    dot={{ fill: "#f59e0b", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Weekly Summary
            </CardTitle>
            <CardDescription>Key metrics comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead className="text-right">W4</TableHead>
                  <TableHead className="text-right">W5</TableHead>
                  <TableHead className="text-right">W6</TableHead>
                  <TableHead className="text-right">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weeklySummaryData.map((row) => (
                  <TableRow key={row.metric}>
                    <TableCell className="font-medium">{row.metric}</TableCell>
                    <TableCell className="text-right">{row.w4}</TableCell>
                    <TableCell className="text-right">{row.w5}</TableCell>
                    <TableCell className="text-right font-medium">
                      {row.w6}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.trend === "up" ? (
                        <TrendingUp className="h-4 w-4 text-emerald-600 inline" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-emerald-600 inline" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Critical Alerts
            </CardTitle>
            <CardDescription>Requiring immediate attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {criticalAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border"
              >
                {alert.severity === "high" ? (
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{alert.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {alert.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {alert.time}
                  </p>
                </div>
                <Badge
                  variant={
                    alert.severity === "high" ? "destructive" : "secondary"
                  }
                  className="shrink-0"
                >
                  {alert.severity}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Risk Heatmap
            </CardTitle>
            <CardDescription>Risk levels by area and WBU</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left py-2 pr-2 font-medium">Area</th>
                    <th className="text-center p-1 font-medium">WBU1</th>
                    <th className="text-center p-1 font-medium">WBU2</th>
                    <th className="text-center p-1 font-medium">WBU3</th>
                    <th className="text-center p-1 font-medium">WBU4</th>
                    <th className="text-center p-1 font-medium">WBU5</th>
                  </tr>
                </thead>
                <tbody>
                  {riskHeatmapData.map((row) => (
                    <tr key={row.area}>
                      <td className="py-2 pr-2 font-medium">{row.area}</td>
                      <td className="p-1">
                        <div
                          className={`w-8 h-8 mx-auto rounded ${getRiskColor(row.wbu1)}`}
                        />
                      </td>
                      <td className="p-1">
                        <div
                          className={`w-8 h-8 mx-auto rounded ${getRiskColor(row.wbu2)}`}
                        />
                      </td>
                      <td className="p-1">
                        <div
                          className={`w-8 h-8 mx-auto rounded ${getRiskColor(row.wbu3)}`}
                        />
                      </td>
                      <td className="p-1">
                        <div
                          className={`w-8 h-8 mx-auto rounded ${getRiskColor(row.wbu4)}`}
                        />
                      </td>
                      <td className="p-1">
                        <div
                          className={`w-8 h-8 mx-auto rounded ${getRiskColor(row.wbu5)}`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-center gap-4 mt-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-emerald-500" />
                  <span>Low</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-amber-400" />
                  <span>Medium</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-red-500" />
                  <span>High</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Material Shortages
            </CardTitle>
            <CardDescription>Critical stock levels</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {materialShortages.map((item, index) => {
              const percentage = Math.round(
                (item.available / item.required) * 100,
              );
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate pr-2">
                      {item.material}
                    </span>
                    <span className="text-muted-foreground shrink-0">
                      {item.available}/{item.required} {item.unit}
                    </span>
                  </div>
                  <div className="relative">
                    <Progress value={percentage} className="h-2" />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{percentage}% available</span>
                    <Badge
                      variant={percentage < 50 ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {percentage < 30
                        ? "Critical"
                        : percentage < 50
                          ? "Low"
                          : "OK"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
