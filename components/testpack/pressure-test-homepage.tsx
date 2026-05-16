"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardCheck,
  ListChecks,
  Shield,
  Gauge,
  RotateCcw,
  FlaskConical,
  AlertTriangle,
  AlertCircle,
  Info,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import {
  PRESSURE_TEST_ACTIVITIES,
  KPI_DATA,
  ALERTS,
  type PressureTestActivity,
  type ActivityHealth,
  type Alert,
} from "@/lib/pressure-test-data";
import {
  useLineCheckKPIs,
  useItemClearanceKPIs,
  useBlindingKPIs,
  useTestingKPIs,
  useReinstatementKPIs,
} from "@/store";

// Icon map
const ICON_MAP: Record<string, LucideIcon> = {
  ClipboardCheck,
  ListChecks,
  Shield,
  Gauge,
  RotateCcw,
};

// Icon colors per activity (colored circle bg)
const ACTIVITY_ICON_BG: Record<string, string> = {
  "line-check": "bg-sky-100 text-sky-600",
  "item-clearance": "bg-amber-100 text-amber-600",
  blinding: "bg-violet-100 text-violet-600",
  testing: "bg-emerald-100 text-emerald-600",
  reinstatement: "bg-slate-100 text-slate-600",
};

function HealthPill({ health }: { health: ActivityHealth }) {
  if (health === "on-track") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        On track
      </span>
    );
  }
  if (health === "behind") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-medium text-amber-700">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Behind
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-xs font-medium text-red-700">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
      Critical
    </span>
  );
}

const CHART_COLORS = {
  Ready: "#f59e0b", // amber-500
  Ongoing: "#0ea5e9", // sky-500
  Done: "#10b981", // emerald-500
};

function ActivityCard({ activity }: { activity: PressureTestActivity }) {
  const router = useRouter();
  const lineCheckKPIs = useLineCheckKPIs();
  const itemClearanceKPIs = useItemClearanceKPIs();
  const blindingKPIs = useBlindingKPIs();
  const testingKPIs = useTestingKPIs();
  const reinstatementKPIs = useReinstatementKPIs();
  const isLineCheck = activity.id === "line-check";
  const isItemClearance = activity.id === "item-clearance";
  const isBlinding = activity.id === "blinding";
  const isTesting = activity.id === "testing";
  const isReinstatement = activity.id === "reinstatement";

  const Icon = ICON_MAP[activity.iconKey] ?? Gauge;
  const iconBg = isItemClearance
    ? itemClearanceKPIs.openX > 0
      ? "bg-amber-100 text-amber-600"
      : "bg-slate-100 text-slate-600"
    : (ACTIVITY_ICON_BG[activity.id] ?? "bg-slate-100 text-slate-600");

  const stats = isLineCheck
    ? {
        ready: lineCheckKPIs.eligibleCount,
        ongoing: lineCheckKPIs.assignedCount,
        done: lineCheckKPIs.doneCount,
      }
    : isItemClearance
      ? {
          ready: itemClearanceKPIs.openX,
          ongoing: itemClearanceKPIs.openY,
          done: itemClearanceKPIs.openZ,
        }
      : isBlinding
        ? {
            ready: blindingKPIs.eligibleCount,
            ongoing: blindingKPIs.assignedCount,
            done: blindingKPIs.doneCount,
          }
        : isTesting
          ? {
              ready: testingKPIs.readyForTestingCount,
              ongoing: testingKPIs.testingInProgressCount,
              done: testingKPIs.preCommedCount,
            }
          : isReinstatement
            ? {
                ready:
                  reinstatementKPIs.eligibleY + reinstatementKPIs.eligibleZ,
                ongoing: reinstatementKPIs.assignedCount,
                done: reinstatementKPIs.doneCount,
              }
            : activity.stats;

  const chartData = isItemClearance
    ? [
        {
          name: "Ready",
          value:
            itemClearanceKPIs.openX +
            itemClearanceKPIs.openY +
            itemClearanceKPIs.openZ -
            itemClearanceKPIs.assignedCount,
        },
        { name: "Ongoing", value: itemClearanceKPIs.assignedCount },
        { name: "Done", value: itemClearanceKPIs.clearedToday },
      ]
    : isTesting
      ? [
          { name: "Ready", value: testingKPIs.readyForTestingCount },
          { name: "Ongoing", value: testingKPIs.testingInProgressCount },
          { name: "Done", value: testingKPIs.preCommedCount },
        ]
      : [
          { name: "Ready", value: stats.ready },
          { name: "Ongoing", value: stats.ongoing },
          { name: "Done", value: stats.done },
        ];

  const handleOpenPreparation = () => {
    if (isLineCheck) {
      router.push("/testpack/pressure-test/line-check/preparation");
    } else if (isItemClearance) {
      router.push("/testpack/pressure-test/item-clearance/preparation");
    } else if (isBlinding) {
      router.push("/testpack/pressure-test/blinding/preparation");
    } else if (isReinstatement) {
      router.push("/testpack/pressure-test/reinstatement/preparation");
    } else {
      toast.info(`Opening ${activity.name} Preparation`);
    }
  };

  const handleOpenProgress = () => {
    if (isLineCheck) {
      router.push("/testpack/pressure-test/line-check/progress");
    } else if (isItemClearance) {
      router.push("/testpack/pressure-test/item-clearance/progress");
    } else if (isBlinding) {
      router.push("/testpack/pressure-test/blinding/progress");
    } else if (isTesting) {
      router.push("/testpack/pressure-test/testing-precomm/progress");
    } else if (isReinstatement) {
      router.push("/testpack/pressure-test/reinstatement/progress");
    } else {
      toast.info(`Opening ${activity.name} Progress`);
    }
  };

  return (
    <Card>
      {/* Header */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full flex-shrink-0",
                iconBg,
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                {activity.name}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {activity.description}
              </CardDescription>
            </div>
          </div>
          <HealthPill health={activity.health} />
        </div>
      </CardHeader>

      {/* Body */}
      <CardContent className="pt-0">
        <div className="grid grid-cols-12 gap-6">
          {/* Chart — 7 cols */}
          <div className="col-span-12 md:col-span-7">
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    formatter={(value: number) => [value, "Count"]}
                  />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={
                          CHART_COLORS[entry.name as keyof typeof CHART_COLORS]
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stat blocks — 5 cols */}
          <div className="col-span-12 md:col-span-5 flex flex-col justify-center gap-4">
            {isItemClearance ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500 flex-shrink-0" />
                  <div>
                    <p className="text-2xl font-bold leading-none">
                      {itemClearanceKPIs.openX}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Open X
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500 flex-shrink-0" />
                  <div>
                    <p className="text-2xl font-bold leading-none">
                      {itemClearanceKPIs.openY}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Open Y
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-500 flex-shrink-0" />
                  <div>
                    <p className="text-2xl font-bold leading-none">
                      {itemClearanceKPIs.openZ}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Open Z
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500 flex-shrink-0" />
                  <div>
                    <p className="text-2xl font-bold leading-none">
                      {stats.ready}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ready
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-500 flex-shrink-0" />
                  <div>
                    <p className="text-2xl font-bold leading-none">
                      {stats.ongoing}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ongoing
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                  <div>
                    <p className="text-2xl font-bold leading-none">
                      {stats.done}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Done</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center gap-2 border-t pt-4">
          {activity.hasPreparation && !isTesting && (
            <Button variant="outline" size="sm" onClick={handleOpenPreparation}>
              Open Preparation →
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleOpenProgress}>
            Open Progress →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AlertRow({ alert }: { alert: Alert }) {
  if (alert.severity === "high") {
    return (
      <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded">
        <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-red-900 flex-1">{alert.message}</p>
        <button
          className="text-xs text-red-600 hover:underline flex-shrink-0"
          onClick={() => toast.info(`Viewing alert: ${alert.message}`)}
        >
          View
        </button>
      </div>
    );
  }
  if (alert.severity === "medium") {
    return (
      <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded">
        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-amber-900 flex-1">{alert.message}</p>
        <button
          className="text-xs text-amber-600 hover:underline flex-shrink-0"
          onClick={() => toast.info(`Viewing alert: ${alert.message}`)}
        >
          View
        </button>
      </div>
    );
  }
  // low
  return (
    <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded">
      <Info className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
      <p className="text-sm text-slate-700 flex-1">{alert.message}</p>
      <button
        className="text-xs text-slate-500 hover:underline flex-shrink-0"
        onClick={() => toast.info(`Viewing alert: ${alert.message}`)}
      >
        View
      </button>
    </div>
  );
}

export function PressureTestHomepage() {
  const [timeScale, setTimeScale] = useState("30D");
  const [system, setSystem] = useState("all");
  const [location, setLocation] = useState("all");
  const [areaClass, setAreaClass] = useState("all");
  const [subcontractor, setSubcontractor] = useState("all");
  const [level, setLevel] = useState("test-pack");

  const kpi = KPI_DATA;

  return (
    <div className="space-y-6">
      {/* Page header strip */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Pressure Test Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track readiness across all testing activities
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-muted-foreground">
            Last sync: 8 min ago
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => toast.info("Data refreshed")}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="sticky top-0 z-40 -mx-6 -mt-6 border-b bg-white px-6 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Time scale tabs */}
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
              </TabsList>
            </Tabs>

            {/* System */}
            <Select value={system} onValueChange={setSystem}>
              <SelectTrigger size="sm" className="w-[180px]">
                <SelectValue placeholder="System" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Systems</SelectItem>
                <SelectItem value="sys-001">SYS-001 Cooling Water</SelectItem>
                <SelectItem value="sys-002">SYS-002 Process Gas</SelectItem>
                <SelectItem value="sys-003">SYS-003 Utility</SelectItem>
              </SelectContent>
            </Select>

            {/* Test Pack Location */}
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger size="sm" className="w-[160px]">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="loc-a">Block A</SelectItem>
                <SelectItem value="loc-b">Block B</SelectItem>
                <SelectItem value="loc-c">Block C</SelectItem>
                <SelectItem value="loc-d">Block D</SelectItem>
                <SelectItem value="loc-e">Pipe Rack E</SelectItem>
                <SelectItem value="loc-f">Pipe Rack F</SelectItem>
                <SelectItem value="loc-g">Pipe Rack G</SelectItem>
              </SelectContent>
            </Select>

            {/* Area Classification */}
            <Select value={areaClass} onValueChange={setAreaClass}>
              <SelectTrigger size="sm" className="w-[160px]">
                <SelectValue placeholder="Area Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classifications</SelectItem>
                <SelectItem value="hazardous">Hazardous</SelectItem>
                <SelectItem value="non-hazardous">Non-Hazardous</SelectItem>
              </SelectContent>
            </Select>

            {/* Subcontractor */}
            <Select value={subcontractor} onValueChange={setSubcontractor}>
              <SelectTrigger size="sm" className="w-[150px]">
                <SelectValue placeholder="Subcontractor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subcontractors</SelectItem>
                <SelectItem value="sc-01">SC-01 TechTest Ltd</SelectItem>
                <SelectItem value="sc-02">SC-02 ProComm Inc</SelectItem>
                <SelectItem value="sc-03">SC-03 HydroTest Co</SelectItem>
                <SelectItem value="sc-04">SC-04 SafeCheck</SelectItem>
                <SelectItem value="sc-05">SC-05 ValvePro</SelectItem>
                <SelectItem value="sc-06">SC-06 InspecTech</SelectItem>
              </SelectContent>
            </Select>

            {/* Level toggle */}
            <Tabs value={level} onValueChange={setLevel}>
              <TabsList className="h-8">
                <TabsTrigger value="test-pack" className="text-xs px-3">
                  Test Pack
                </TabsTrigger>
                <TabsTrigger value="isometric" className="text-xs px-3">
                  Isometric
                </TabsTrigger>
                <TabsTrigger value="flange-joint" className="text-xs px-3">
                  Flange Joint
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Test Packs Ready For Test */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              Test Packs Ready For Test
            </CardDescription>
            <CardTitle className="text-3xl font-bold">
              {kpi.testPacksReady}{" "}
              <span className="text-lg font-normal text-muted-foreground">
                / {kpi.testPacksTotal}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Progress value={kpi.testPacksReadyPct} className="flex-1" />
              <span className="text-sm font-medium">
                {kpi.testPacksReadyPct}%
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1 text-sm text-emerald-600">
              <TrendingUp className="h-3 w-3" />
              <span>{kpi.testPacksWeekDelta}</span>
            </div>
          </CardContent>
        </Card>

        {/* Pressure Tests This Week */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              Pressure Tests This Week
            </CardDescription>
            <CardTitle className="text-3xl font-bold">
              {kpi.pressureTestsThisWeek}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {kpi.pressureTestsStatus}
            </span>
            <p className="text-sm text-muted-foreground mt-1">
              {kpi.pressureTestsVsLastWeek}
            </p>
          </CardContent>
        </Card>

        {/* Items Outstanding */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              Items Outstanding
            </CardDescription>
            <CardTitle className="text-3xl font-bold">
              {kpi.itemsOutstanding}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              X: {kpi.itemCategoryX} · Y: {kpi.itemCategoryY} · Z:{" "}
              {kpi.itemCategoryZ}
            </p>
            <div className="flex items-center gap-1 mt-1 text-sm text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              <span>{kpi.itemsBlockingRft} blocking RFT</span>
            </div>
          </CardContent>
        </Card>

        {/* Reinstatement Backlog */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Reinstatement Backlog
            </CardDescription>
            <CardTitle className="text-3xl font-bold">
              {kpi.reinstatementBacklog}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">flange joints</p>
            <p className="text-sm text-amber-600 mt-1">
              Cat Y: {kpi.reinstatementCatY} · Cat Z: {kpi.reinstatementCatZ}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 5 Activity cards */}
      <div className="space-y-4">
        {PRESSURE_TEST_ACTIVITIES.map((activity) => (
          <ActivityCard key={activity.id} activity={activity} />
        ))}
      </div>

      {/* Critical Alerts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ALERTS.map((alert) => (
            <AlertRow key={alert.id} alert={alert} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
