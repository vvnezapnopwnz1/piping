"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  HardHat,
  Wrench,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Download,
  Truck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  useSpoolErectionStageCounts,
  useSpoolReadiness,
  useFleetFlangeBoltCounts,
  useErectionKPIs,
} from "@/store";
import {
  ERECTION_STAGE_COLOR,
  ERECTION_STAGE_ORDER,
  type SpoolErectionStage,
} from "@/lib/erection-stage";
import type { ErectionStatus } from "@/lib/erection-weld-data";
import { cn } from "@/lib/utils";

/** Live field-joint counts shown on matching spool pipeline tiles. */
const SPOOL_STAGE_FIELD_JOINTS: Partial<
  Record<SpoolErectionStage, (kpis: ReturnType<typeof useErectionKPIs>) => number>
> = {
  "To Site": (k) => k.toSite,
  Erected: (k) => k.erected,
  "Welded/Bolted": (k) => k.welded + k.bolted,
  Supported: (k) => k.supported,
  RFT: (k) => k.rft,
};

const SPOOL_STAGE_WELD_DRILL: Partial<
  Record<SpoolErectionStage, ErectionStatus | ErectionStatus[]>
> = {
  "To Site": "To Site",
  Erected: "Erected",
  "Welded/Bolted": ["Welded", "Bolted"],
  Supported: "Supported",
  RFT: "RFT",
};

// TODO: historical aggregation — weekly trend has no time-series store yet
const SPOOL_ERECTION_DATA = [
  { week: "W1", toSite: 180, erected: 145, welded: 92, supported: 68, rft: 45 },
  {
    week: "W2",
    toSite: 210,
    erected: 178,
    welded: 124,
    supported: 95,
    rft: 68,
  },
  {
    week: "W3",
    toSite: 195,
    erected: 165,
    welded: 118,
    supported: 88,
    rft: 52,
  },
  {
    week: "W4",
    toSite: 224,
    erected: 198,
    welded: 156,
    supported: 122,
    rft: 78,
  },
  {
    week: "W5",
    toSite: 205,
    erected: 182,
    welded: 145,
    supported: 115,
    rft: 82,
  },
  {
    week: "W6",
    toSite: 230,
    erected: 215,
    welded: 182,
    supported: 148,
    rft: 98,
  },
  {
    week: "W7",
    toSite: 240,
    erected: 228,
    welded: 198,
    supported: 168,
    rft: 115,
  },
  {
    week: "W8",
    toSite: 250,
    erected: 245,
    welded: 215,
    supported: 188,
    rft: 138,
  },
];

const FIELD_WELD_DATA = [
  { week: "W1", buttWelds: 124, socketWelds: 89, flangeJoints: 45 },
  { week: "W2", buttWelds: 198, socketWelds: 145, flangeJoints: 78 },
  { week: "W3", buttWelds: 316, socketWelds: 234, flangeJoints: 118 },
  { week: "W4", buttWelds: 472, socketWelds: 352, flangeJoints: 179 },
  { week: "W5", buttWelds: 617, socketWelds: 458, flangeJoints: 240 },
  { week: "W6", buttWelds: 799, socketWelds: 598, flangeJoints: 325 },
  { week: "W7", buttWelds: 997, socketWelds: 748, flangeJoints: 417 },
  { week: "W8", buttWelds: 1218, socketWelds: 912, flangeJoints: 524 },
];

const NDE_STATUS_DATA = [
  { method: "RT", accepted: 284, rejected: 18, pending: 34 },
  { method: "UT", accepted: 312, rejected: 12, pending: 28 },
  { method: "MT", accepted: 189, rejected: 8, pending: 18 },
  { method: "PT", accepted: 156, rejected: 5, pending: 12 },
  { method: "PMI", accepted: 98, rejected: 3, pending: 8 },
];

const COMPLETION_BY_AREA_DATA = [
  { area: "Area A", scope: 680, completed: 520, inProgress: 112 },
  { area: "Area B", scope: 620, completed: 485, inProgress: 98 },
  { area: "Area C", scope: 560, completed: 348, inProgress: 156 },
  { area: "Area D", scope: 558, completed: 428, inProgress: 87 },
];

function SpoolReadinessPill({
  status,
}: {
  status: import("@/store").SpoolReadinessStatus;
}) {
  const router = useRouter();
  const styles: Record<string, string> = {
    "Ready for delivery": "bg-emerald-50 text-emerald-700 border-emerald-200",
    Blocked: "bg-red-50 text-red-700 border-red-200",
    "In fabrication": "bg-sky-50 text-sky-700 border-sky-200",
    "Not started": "bg-slate-50 text-slate-600 border-slate-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap border",
        styles[status],
      )}
    >
      {status}
    </span>
  );
}

function StaticBadge() {
  return (
    <Badge
      variant="outline"
      className="border-amber-200 bg-amber-50 text-amber-700"
    >
      Static
    </Badge>
  );
}

function ErectionFunnelSection({
  readyCount,
  blockedCount,
  inFabCount,
}: {
  readyCount: number;
  blockedCount: number;
  inFabCount: number;
}) {
  const router = useRouter();
  const counts = useSpoolErectionStageCounts();
  const kpis = useErectionKPIs();

  const totalSpools = ERECTION_STAGE_ORDER.reduce((s, st) => s + counts[st], 0);
  const jointsInProgress = kpis.total - kpis.rft - kpis.notStarted;

  const openWeldProgress = (status: ErectionStatus) => {
    router.push(
      `/erection/weld-progress?status=${encodeURIComponent(status)}`,
    );
  };

  const kpiCellClass =
    "flex min-h-[5.75rem] w-full flex-col justify-between rounded-md border border-slate-200/80 bg-white p-3";

  return (
    <div className="space-y-3">
      <div className="grid auto-rows-fr grid-cols-2 gap-3 md:grid-cols-4 rounded-lg border bg-slate-50 p-3">
        <div className={kpiCellClass}>
          <p className="text-xs text-slate-500">Total field joints</p>
          <p className="text-2xl font-semibold text-slate-900">{kpis.total}</p>
          <p className="text-[10px] leading-snug text-slate-500">
            Foreman {kpis.foremanConfirmedCount}/{kpis.total} · {totalSpools}{" "}
            spools
          </p>
        </div>
        <div className={kpiCellClass}>
          <p className="text-xs text-slate-500">To Site</p>
          <p className="text-2xl font-semibold text-sky-700">{kpis.toSite}</p>
          <button
            type="button"
            className="w-fit text-left text-[10px] text-sky-600 hover:underline"
            onClick={() => openWeldProgress("To Site")}
          >
            View joints →
          </button>
        </div>
        <div className={kpiCellClass}>
          <p className="text-xs text-slate-500">In progress</p>
          <p className="text-2xl font-semibold text-sky-700">
            {jointsInProgress}
          </p>
          <p className="text-[10px] leading-snug text-slate-500">
            Weld avg {kpis.weldProgressPercent}%
          </p>
        </div>
        <div className={kpiCellClass}>
          <p className="text-xs text-slate-500">RFT</p>
          <p className="text-2xl font-semibold text-emerald-700">{kpis.rft}</p>
          <button
            type="button"
            className="w-fit text-left text-[10px] text-emerald-700 hover:underline"
            onClick={() => openWeldProgress("RFT")}
          >
            View joints →
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">
          Spool erection pipeline
        </h3>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500">
            <span className="font-medium text-emerald-700">{readyCount}</span>{" "}
            ready for delivery
            {blockedCount > 0 && (
              <>
                {" "}
                ·{" "}
                <span className="font-medium text-red-600">
                  {blockedCount}
                </span>{" "}
                blocked
              </>
            )}
            {inFabCount > 0 && (
              <>
                {" "}
                · <span className="text-slate-500">{inFabCount} in fab</span>
              </>
            )}
            {" · "}
            <a
              href="#spool-readiness"
              className="text-emerald-600 hover:underline"
            >
              View details ↓
            </a>
          </span>
          <p className="text-xs text-slate-500">
            {ERECTION_STAGE_ORDER.reduce(
              (sum, stage) => sum + counts[stage],
              0,
            )}{" "}
            spools in live rollout
          </p>
        </div>
      </div>
      <div className="grid auto-rows-fr grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {ERECTION_STAGE_ORDER.map((stage) => {
          const spoolCount = counts[stage];
          const jointFn = SPOOL_STAGE_FIELD_JOINTS[stage];
          const jointCount = jointFn ? jointFn(kpis) : null;
          const displayCount = jointCount ?? spoolCount;
          const colors = ERECTION_STAGE_COLOR[stage];
          const weldDrill = SPOOL_STAGE_WELD_DRILL[stage];
          const isClickable =
            stage === "Awaiting Release" ||
            stage === "To Site" ||
            stage === "Field Material Check" ||
            stage === "Erected" ||
            stage === "Welded/Bolted" ||
            stage === "Supported" ||
            stage === "Field QC Released" ||
            stage === "RFT";
          const tileTitle =
            stage === "Awaiting Release"
              ? "Go to Laydown"
              : stage === "RFT"
                ? "View RFT list"
                : jointCount != null
                  ? "Open stage screen · use “View joints” for weld-progress filter"
                  : undefined;
          const href =
            stage === "Awaiting Release"
              ? "/fabrication/laydown"
              : stage === "To Site"
                ? "/erection/to-site"
                : stage === "Erected"
                  ? "/erection/erected"
                  : stage === "Welded/Bolted"
                    ? "/erection/welded-bolted"
                    : stage === "Supported"
                      ? "/erection/supported"
                      : stage === "Field QC Released"
                        ? "/erection/field-qc-release"
                      : stage === "RFT"
                        ? "/erection/rft"
                        : stage === "Field Material Check"
                          ? "/erection/material-check"
                          : undefined;

          return (
            <div
              key={stage}
              role={isClickable ? "button" : undefined}
              aria-label={
                jointCount != null
                  ? `${stage}: ${jointCount} field joints, ${spoolCount} spools`
                  : `${stage}: ${spoolCount} spools`
              }
              className={cn(
                "flex h-full min-h-[9.5rem] w-full",
                isClickable
                  ? "cursor-pointer transition hover:shadow-md"
                  : "cursor-not-allowed",
              )}
              title={tileTitle}
              onClick={() => {
                if (href) {
                  router.push(href);
                }
              }}
            >
              <Card className="relative flex h-full w-full flex-col overflow-hidden border bg-white">
                <div
                  className={cn("absolute inset-y-0 left-0 w-1", colors.rail)}
                />
                <CardContent className="flex h-full flex-1 flex-col gap-3 p-4">
                  <div className="min-h-[2.25rem] shrink-0">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "max-w-full whitespace-normal border-transparent text-[10px] uppercase leading-tight tracking-wider",
                        colors.bg,
                        colors.text,
                      )}
                    >
                      {stage}
                    </Badge>
                  </div>
                  <div className="flex flex-1 flex-col justify-between gap-2">
                    <div className="space-y-1">
                      <div className="text-3xl font-semibold leading-none text-slate-900">
                        {displayCount}
                      </div>
                      <p className="line-clamp-2 text-xs leading-snug text-slate-500">
                        {jointCount != null ? (
                          <>
                            {jointCount} joint{jointCount === 1 ? "" : "s"} ·{" "}
                            {spoolCount} spool{spoolCount === 1 ? "" : "s"}
                          </>
                        ) : stage === "Awaiting Release" ? (
                          `${spoolCount} spool${spoolCount === 1 ? "" : "s"} not yet released`
                        ) : (
                          `${spoolCount} spool${spoolCount === 1 ? "" : "s"}`
                        )}
                      </p>
                    </div>
                    <div className="mt-auto min-h-[2.75rem] text-xs leading-snug">
                      {weldDrill ? (
                        Array.isArray(weldDrill) ? (
                          <div className="flex flex-col gap-0.5">
                            {weldDrill.map((status) => (
                              <button
                                key={status}
                                type="button"
                                className="w-fit text-left text-sky-600 hover:underline"
                                aria-label={`View ${status === "Welded" ? kpis.welded : kpis.bolted} ${status} field welds`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openWeldProgress(status);
                                }}
                              >
                                {status === "Welded" ? kpis.welded : kpis.bolted}{" "}
                                {status} →
                              </button>
                            ))}
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="text-sky-600 hover:underline"
                            aria-label={`View ${jointCount} ${weldDrill} field welds`}
                            onClick={(e) => {
                              e.stopPropagation();
                              openWeldProgress(weldDrill);
                            }}
                          >
                            View joints →
                          </button>
                        )
                      ) : (
                        <span className="invisible select-none" aria-hidden>
                          View joints →
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      <FlangeBoltKPICard />
    </div>
  );
}

function FlangeBoltKPICard() {
  const router = useRouter();
  const counts = useFleetFlangeBoltCounts();
  if (counts.total === 0) return null;
  const pct = Math.round((counts.verified / counts.total) * 100);
  return (
    <Card
      className="mt-3 cursor-pointer border bg-white"
      onClick={() => router.push("/erection/flange-progress")}
      title="Open flange bolt progress"
    >
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">
            Flange bolt verification (§19.2.1)
          </p>
          <p className="text-sm text-slate-800">
            <span className="text-2xl font-semibold text-slate-900">
              {counts.verified}
            </span>
            <span className="text-slate-500"> / {counts.total} verified</span>
            {counts.assigned - counts.verified > 0 && (
              <span className="ml-3 text-slate-500">
                · {counts.assigned - counts.bolted} assigned ·{" "}
                {counts.bolted - counts.verified} bolted
              </span>
            )}
          </p>
        </div>
        <Badge
          variant="secondary"
          className="border-transparent bg-slate-100 text-slate-700"
        >
          {pct}%
        </Badge>
      </CardContent>
    </Card>
  );
}

export function ErectionDashboard() {
  const router = useRouter();
  const kpis = useErectionKPIs();
  const readiness = useSpoolReadiness();
  const readyCount = readiness.filter(
    (s) => s.status === "Ready for delivery",
  ).length;
  const blockedCount = readiness.filter((s) => s.status === "Blocked").length;
  const inFabCount = readiness.filter(
    (s) => s.status === "In fabrication",
  ).length;

  const [timeScale, setTimeScale] = useState("7D");
  const [wbu, setWbu] = useState("all");
  const [area, setArea] = useState("all");
  const [material, setMaterial] = useState("all");
  const [sizeRange, setSizeRange] = useState("all");

  const handleRefresh = () => {
    // Refresh logic here
    console.log("Refreshing dashboard...");
  };

  const handleExportPdf = () => {
    // Export logic here
    console.log("Exporting PDF...");
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
                <SelectItem value="all">All units (8)</SelectItem>
                <SelectItem value="wbu-01">WBU-01</SelectItem>
                <SelectItem value="wbu-02">WBU-02</SelectItem>
                <SelectItem value="wbu-03">WBU-03</SelectItem>
                <SelectItem value="wbu-04">WBU-04</SelectItem>
                <SelectItem value="wbu-05">WBU-05</SelectItem>
                <SelectItem value="wbu-06">WBU-06</SelectItem>
                <SelectItem value="wbu-07">WBU-07</SelectItem>
                <SelectItem value="wbu-08">WBU-08</SelectItem>
              </SelectContent>
            </Select>

            <Select value={area} onValueChange={setArea}>
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

            <Select value={material} onValueChange={setMaterial}>
              <SelectTrigger size="sm" className="w-[140px]">
                <SelectValue placeholder="Material Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All materials</SelectItem>
                <SelectItem value="carbon">Carbon Steel</SelectItem>
                <SelectItem value="stainless">Stainless Steel</SelectItem>
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
              Last updated 5 min ago
            </span>
            <Button variant="outline" size="icon-sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={handleExportPdf}>
              <Download className="h-4 w-4 mr-1" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      <ErectionFunnelSection
        readyCount={readyCount}
        blockedCount={blockedCount}
        inFabCount={inFabCount}
      />

      {/* Spool delivery readiness */}
      <Card id="spool-readiness">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Spool delivery readiness
          </CardTitle>
          <CardDescription>
            Every shop spool must have all its welds Accepted before site
            delivery. Live view from fabrication QC.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Spool</TableHead>
                <TableHead>ISO</TableHead>
                <TableHead className="text-right">Welds</TableHead>
                <TableHead className="text-right">Accepted</TableHead>
                <TableHead className="text-right">Rejected</TableHead>
                <TableHead className="text-right">Rework</TableHead>
                <TableHead className="text-right">In progress</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {readiness.map((row) => (
                <TableRow
                  key={row.spoolNo}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() =>
                    router.push(
                      `/fabrication/weld-progress?spool=${encodeURIComponent(row.spoolNo)}`,
                    )
                  }
                >
                  <TableCell className="font-mono">{row.spoolNo}</TableCell>
                  <TableCell className="font-mono text-slate-600">
                    {row.isoNo}
                  </TableCell>
                  <TableCell className="text-right">{row.total}</TableCell>
                  <TableCell className="text-right text-emerald-700">
                    {row.completed}
                  </TableCell>
                  <TableCell
                    className={`text-right ${row.rejected > 0 ? "text-red-600 font-medium" : "text-slate-400"}`}
                  >
                    {row.rejected}
                  </TableCell>
                  <TableCell
                    className={`text-right ${row.rework > 0 ? "text-amber-700 font-medium" : "text-slate-400"}`}
                  >
                    {row.rework}
                  </TableCell>
                  <TableCell className="text-right text-slate-600">
                    {row.inProgress}
                  </TableCell>
                  <TableCell>
                    <SpoolReadinessPill status={row.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-medium">
                Spool Erection Progress
              </CardTitle>
              <StaticBadge />
            </div>
            <CardDescription>Weekly activities breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={SPOOL_ERECTION_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="toSite"
                    stackId="a"
                    fill="#94a3b8"
                    name="To Site"
                  />
                  <Bar
                    dataKey="erected"
                    stackId="a"
                    fill="#3b82f6"
                    name="Erected"
                  />
                  <Bar
                    dataKey="welded"
                    stackId="a"
                    fill="#f59e0b"
                    name="Welded"
                  />
                  <Bar
                    dataKey="supported"
                    stackId="a"
                    fill="#10b981"
                    name="Supported"
                  />
                  <Bar dataKey="rft" stackId="a" fill="#8b5cf6" name="RFT" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-medium">
                Field Joint Welding Progress
              </CardTitle>
              <StaticBadge />
            </div>
            <CardDescription>Cumulative weekly totals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={FIELD_WELD_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="buttWelds"
                    stackId="1"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.8}
                    name="Butt Welds"
                  />
                  <Area
                    type="monotone"
                    dataKey="socketWelds"
                    stackId="1"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.8}
                    name="Socket Welds"
                  />
                  <Area
                    type="monotone"
                    dataKey="flangeJoints"
                    stackId="1"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.8}
                    name="Flange Joints"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-medium">
                Site NDE Status
              </CardTitle>
              <StaticBadge />
            </div>
            <CardDescription>
              Non-destructive examination results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={NDE_STATUS_DATA}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    dataKey="method"
                    type="category"
                    tick={{ fontSize: 12 }}
                    width={60}
                  />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="accepted" fill="#10b981" name="Accepted" />
                  <Bar dataKey="rejected" fill="#ef4444" name="Rejected" />
                  <Bar dataKey="pending" fill="#f59e0b" name="Pending" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-medium">
                Erection Completion by Area
              </CardTitle>
              <StaticBadge />
            </div>
            <CardDescription>Scope vs actual progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={COMPLETION_BY_AREA_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="area" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="scope" fill="#94a3b8" name="Scope" />
                  <Bar dataKey="completed" fill="#10b981" name="Completed" />
                  <Bar dataKey="inProgress" fill="#3b82f6" name="In Progress" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Weekly Erection Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead className="text-right">W6</TableHead>
                  <TableHead className="text-right">W7</TableHead>
                  <TableHead className="text-right">W8</TableHead>
                  <TableHead className="text-center">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Spools received</TableCell>
                  <TableCell className="text-right">82</TableCell>
                  <TableCell className="text-right">94</TableCell>
                  <TableCell className="text-right font-medium">108</TableCell>
                  <TableCell className="text-center">
                    <TrendingUp className="h-4 w-4 text-emerald-600 inline" />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Spools erected</TableCell>
                  <TableCell className="text-right">68</TableCell>
                  <TableCell className="text-right">75</TableCell>
                  <TableCell className="text-right font-medium">89</TableCell>
                  <TableCell className="text-center">
                    <TrendingUp className="h-4 w-4 text-emerald-600 inline" />
                  </TableCell>
                </TableRow>
                <TableRow
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() =>
                    router.push(
                      `/erection/weld-progress?status=${encodeURIComponent("Welded")}`,
                    )
                  }
                >
                  <TableCell className="font-medium">
                    Field joints welded
                  </TableCell>
                  <TableCell className="text-right text-slate-400">—</TableCell>
                  <TableCell className="text-right text-slate-400">—</TableCell>
                  <TableCell className="text-right font-medium text-sky-700">
                    {kpis.welded} live
                  </TableCell>
                  <TableCell className="text-center">
                    <TrendingUp className="h-4 w-4 text-emerald-600 inline" />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    Flange joints bolted
                  </TableCell>
                  <TableCell className="text-right">45</TableCell>
                  <TableCell className="text-right">52</TableCell>
                  <TableCell className="text-right font-medium">61</TableCell>
                  <TableCell className="text-center">
                    <TrendingUp className="h-4 w-4 text-emerald-600 inline" />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">RFT achieved</TableCell>
                  <TableCell className="text-right">18</TableCell>
                  <TableCell className="text-right">22</TableCell>
                  <TableCell className="text-right font-medium">28</TableCell>
                  <TableCell className="text-center">
                    <TrendingUp className="h-4 w-4 text-emerald-600 inline" />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    Site NDE pass rate
                  </TableCell>
                  <TableCell className="text-right">91%</TableCell>
                  <TableCell className="text-right">93%</TableCell>
                  <TableCell className="text-right font-medium">95%</TableCell>
                  <TableCell className="text-center">
                    <TrendingUp className="h-4 w-4 text-emerald-600 inline" />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Site Erection KPIs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground font-medium">
                  Avg days: Site → Erected
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">3.2</span>
                  <span className="text-xs text-muted-foreground">days</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                <TrendingDown className="h-3 w-3" />
                Improving (down from 3.8)
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground font-medium">
                  Avg days: Erected → Welded
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">2.8</span>
                  <span className="text-xs text-muted-foreground">days</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                <TrendingDown className="h-3 w-3" />
                Improving (down from 3.2)
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground font-medium">
                  Avg weld completion (live)
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">
                    {kpis.weldProgressPercent}%
                  </span>
                </div>
              </div>
              <Progress value={kpis.weldProgressPercent} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {kpis.foremanConfirmedCount}/{kpis.total} foreman confirmed
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts & Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Erection Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 p-3 bg-amber-50 border border-amber-200 rounded">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-900">Warning</p>
                  <p className="text-amber-800 text-xs mt-1">
                    18 spools at site {">"} 7 days without erection
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 p-3 bg-red-50 border border-red-200 rounded">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-red-900">Critical</p>
                  <p className="text-red-800 text-xs mt-1">
                    Area C erection behind schedule by 12%
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 p-3 bg-amber-50 border border-amber-200 rounded">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-900">Warning</p>
                  <p className="text-amber-800 text-xs mt-1">
                    Field welder WLD-F08 qualification expiring in 5 days
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Flange Bolting Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground font-medium">
                  Total flange joints
                </span>
                <span className="text-lg font-bold">1,840</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Bolted</span>
                <span className="text-sm font-bold">1,124 (61.1%)</span>
              </div>
              <Progress value={61.1} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Torque verified
                </span>
                <span className="text-sm font-bold">982 (87.4%)</span>
              </div>
              <Progress value={87.4} className="h-2" />
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-muted-foreground font-medium">
                Outstanding
              </span>
              <span className="text-sm font-bold">716</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Support Installation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground font-medium">
                  Total supports
                </span>
                <span className="text-lg font-bold">4,280</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Installed</span>
                <span className="text-sm font-bold">3,124 (73.0%)</span>
              </div>
              <Progress value={73.0} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Inspected</span>
                <span className="text-sm font-bold">2,890 (92.5%)</span>
              </div>
              <Progress value={92.5} className="h-2" />
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-muted-foreground font-medium">
                Remaining
              </span>
              <span className="text-sm font-bold">1,156</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
