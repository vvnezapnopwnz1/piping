"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  Filter,
  MapPin,
  MoreHorizontal,
  Printer,
  Search,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type ZoneFilter =
  | "All zones"
  | "Fab shop"
  | "Paint shop"
  | "Laydown"
  | "Erection area";
type ViewMode = "list" | "grid";
type SpoolStatus =
  | "Fabricated"
  | "Painted"
  | "Final QC"
  | "Erected"
  | "In Transit";
type SpoolFlag = "inconsistency" | "transit-out" | null;

type LocationTile = {
  name: string;
  category: Exclude<ZoneFilter, "All zones">;
  count: number;
  capacity: number;
};

type SpoolRow = {
  spoolNo: string;
  isoNo: string;
  barcode: string;
  location: string;
  status: SpoolStatus;
  daysInLocation: number;
  lastScan: string;
  flag: SpoolFlag;
  flagText?: string;
};

type Device = {
  id: string;
  operator: string;
  status: "Online" | "Offline";
  lastSync: string;
  battery: "high" | "medium" | "low";
};

const topStats = [
  {
    title: "Spools tracked",
    value: "2,847",
    subtitle: "Currently in active tracking",
    bottom: "324 scanned today",
    tone: "default" as const,
    icon: TrendingUp,
    bottomClassName: "text-emerald-600",
  },
  {
    title: "Average scans per day",
    value: "487",
    subtitle: "Last 7 days",
    bottom: "+18% vs previous week",
    tone: "default" as const,
    icon: TrendingUp,
    bottomClassName: "text-emerald-600",
  },
  {
    title: "Inconsistencies",
    value: "23",
    subtitle: "Status vs location mismatches",
    bottom: "Action needed",
    tone: "amber" as const,
  },
  {
    title: "Transit out",
    value: "7",
    subtitle: "Spools not scanned in > 2 days",
    bottom: "Investigate",
    tone: "red" as const,
  },
];

const zoneFilters: ZoneFilter[] = [
  "All zones",
  "Fab shop",
  "Paint shop",
  "Laydown",
  "Erection area",
];

const locationTiles: LocationTile[] = [
  { name: "Fab Shop A", count: 287, capacity: 350, category: "Fab shop" },
  { name: "Fab Shop B", count: 198, capacity: 250, category: "Fab shop" },
  { name: "QC Hold Area", count: 45, capacity: 60, category: "Fab shop" },
  { name: "Paint Shop", count: 178, capacity: 200, category: "Paint shop" },
  { name: "Laydown Yard 1", count: 412, capacity: 400, category: "Laydown" },
  { name: "Laydown Yard 2", count: 234, capacity: 400, category: "Laydown" },
  {
    name: "Pre-erection",
    count: 156,
    capacity: 200,
    category: "Erection area",
  },
  {
    name: "Erection North",
    count: 78,
    capacity: 120,
    category: "Erection area",
  },
  {
    name: "Erection East",
    count: 142,
    capacity: 150,
    category: "Erection area",
  },
  {
    name: "Erection South",
    count: 67,
    capacity: 120,
    category: "Erection area",
  },
  {
    name: "Erection West",
    count: 23,
    capacity: 120,
    category: "Erection area",
  },
  { name: "Final QC Yard", count: 89, capacity: 100, category: "Laydown" },
];

const scanTrendData = [
  { day: "May 01", scans: 320 },
  { day: "May 02", scans: 380 },
  { day: "May 03", scans: 410 },
  { day: "May 04", scans: 290 },
  { day: "May 05", scans: 340 },
  { day: "May 06", scans: 450 },
  { day: "May 07", scans: 520 },
  { day: "May 08", scans: 487 },
  { day: "May 09", scans: 510 },
  { day: "May 10", scans: 478 },
  { day: "May 11", scans: 495 },
  { day: "May 12", scans: 533 },
  { day: "May 13", scans: 502 },
  { day: "May 14", scans: 487 },
];

const devices: Device[] = [
  {
    id: "PDA-001",
    operator: "M. Hassan",
    status: "Online",
    lastSync: "2 min ago",
    battery: "high",
  },
  {
    id: "PDA-002",
    operator: "S. Kim",
    status: "Online",
    lastSync: "15 min ago",
    battery: "medium",
  },
  {
    id: "PDA-003",
    operator: "T. Olsen",
    status: "Offline",
    lastSync: "1 hr ago",
    battery: "low",
  },
  {
    id: "PDA-004",
    operator: "R. Patel",
    status: "Online",
    lastSync: "6 min ago",
    battery: "high",
  },
  {
    id: "PDA-005",
    operator: "A. Costa",
    status: "Online",
    lastSync: "22 min ago",
    battery: "medium",
  },
];

const spoolRows: SpoolRow[] = [
  {
    spoolNo: "PL-TK100-001-A",
    isoNo: "ISO-TK100-P-001 R2",
    barcode: "BC-487291",
    location: "Laydown Yard 1",
    status: "Fabricated",
    daysInLocation: 3,
    lastScan: "2 hr ago",
    flag: null,
  },
  {
    spoolNo: "PL-TK100-002-D",
    isoNo: "ISO-TK100-P-002 R1",
    barcode: "BC-487292",
    location: "Transit out",
    status: "In Transit",
    daysInLocation: 3,
    lastScan: "3 days ago",
    flag: "transit-out",
    flagText: "Scanned out of Paint Shop 3 days ago, not scanned in",
  },
  {
    spoolNo: "PL-CW200-004-A",
    isoNo: "ISO-CW200-P-004 R3",
    barcode: "BC-587104",
    location: "Fab Shop B",
    status: "Painted",
    daysInLocation: 5,
    lastScan: "5 hr ago",
    flag: "inconsistency",
    flagText: "Status 'Painted' but located in Fab Shop",
  },
  {
    spoolNo: "PL-FU300-008-B",
    isoNo: "ISO-FU300-P-008 R2",
    barcode: "BC-671204",
    location: "Laydown Yard 1",
    status: "Erected",
    daysInLocation: 9,
    lastScan: "1 day ago",
    flag: "inconsistency",
    flagText: "Status 'Erected' but located in Laydown Yard 1",
  },
  {
    spoolNo: "PL-TK100-006-C",
    isoNo: "ISO-TK100-P-006 R1",
    barcode: "BC-487306",
    location: "Erection East",
    status: "Final QC",
    daysInLocation: 2,
    lastScan: "1 hr ago",
    flag: null,
  },
  {
    spoolNo: "PL-CW200-003-C",
    isoNo: "ISO-CW200-P-003 R2",
    barcode: "BC-587103",
    location: "Transit out",
    status: "In Transit",
    daysInLocation: 16,
    lastScan: "2 days ago",
    flag: "transit-out",
    flagText: "Scanned out of QC Hold 2 days ago, not scanned in",
  },
  {
    spoolNo: "PL-FU300-011-A",
    isoNo: "ISO-FU300-P-011 R0",
    barcode: "BC-671211",
    location: "Fab Shop A",
    status: "Fabricated",
    daysInLocation: 7,
    lastScan: "Yesterday",
    flag: null,
  },
  {
    spoolNo: "PL-CW200-009-A",
    isoNo: "ISO-CW200-P-009 R1",
    barcode: "BC-587109",
    location: "Erection North",
    status: "Final QC",
    daysInLocation: 12,
    lastScan: "3 days ago",
    flag: null,
  },
  {
    spoolNo: "PL-TK100-014-B",
    isoNo: "ISO-TK100-P-014 R2",
    barcode: "BC-487314",
    location: "Paint Shop",
    status: "Painted",
    daysInLocation: 4,
    lastScan: "4 hr ago",
    flag: null,
  },
  {
    spoolNo: "PL-FU300-014-B",
    isoNo: "ISO-FU300-P-014 R1",
    barcode: "BC-671214",
    location: "Pre-erection",
    status: "In Transit",
    daysInLocation: 15,
    lastScan: "5 days ago",
    flag: null,
  },
  {
    spoolNo: "PL-CW200-015-C",
    isoNo: "ISO-CW200-P-015 R0",
    barcode: "BC-587115",
    location: "Final QC Yard",
    status: "Final QC",
    daysInLocation: 6,
    lastScan: "8 hr ago",
    flag: null,
  },
  {
    spoolNo: "PL-TK100-021-A",
    isoNo: "ISO-TK100-P-021 R1",
    barcode: "BC-487321",
    location: "Erection South",
    status: "Erected",
    daysInLocation: 1,
    lastScan: "35 min ago",
    flag: null,
  },
];

const inconsistencies = [
  {
    spoolNo: "PL-CW200-004-A",
    description: "Status: Painted, but in Fab Shop B",
    time: "5 hr ago",
  },
  {
    spoolNo: "PL-FU300-008-B",
    description: "Status: Erected, but scanned in Laydown Yard 1",
    time: "1 day ago",
  },
  {
    spoolNo: "PL-TK100-006-C",
    description: "Multiple location scans within 5 min",
    time: "2 days ago",
  },
  {
    spoolNo: "PL-CW200-009-A",
    description: "Status: Final QC, but in Erection North",
    time: "3 days ago",
  },
];

const transitAlerts = [
  {
    spoolNo: "PL-TK100-002-D",
    description: "Out from Paint Shop, 3 days ago",
    detail: '12" CS A106B',
  },
  {
    spoolNo: "PL-FU300-011-A",
    description: "Out from Fab Shop A, 4 days ago",
    detail: '8" SS 316L',
  },
  {
    spoolNo: "PL-CW200-003-C",
    description: "Out from QC Hold, 2 days ago",
    detail: '6" CS A335 P91',
  },
  {
    spoolNo: "PL-FU300-014-B",
    description: "Out from Pre-erection, 5 days ago",
    detail: '4" CS A106B',
  },
];

function getCapacityTone(count: number, capacity: number) {
  const ratio = (count / capacity) * 100;

  if (ratio > 90) {
    return {
      cardClassName: "border-red-200 bg-red-50",
      progressClassName: "bg-red-500",
      textClassName: "text-red-700",
      label: "Over 90%",
    };
  }

  if (ratio >= 70) {
    return {
      cardClassName: "border-amber-200 bg-amber-50",
      progressClassName: "bg-amber-500",
      textClassName: "text-amber-700",
      label: "70-90%",
    };
  }

  return {
    cardClassName: "border-emerald-200 bg-emerald-50",
    progressClassName: "bg-emerald-500",
    textClassName: "text-emerald-700",
    label: "Under 70%",
  };
}

function getBatteryIcon(battery: Device["battery"]) {
  switch (battery) {
    case "high":
      return <BatteryFull className="h-4 w-4 text-emerald-600" />;
    case "medium":
      return <BatteryMedium className="h-4 w-4 text-amber-600" />;
    default:
      return <BatteryLow className="h-4 w-4 text-red-600" />;
  }
}

function SpoolStatusBadge({ status }: { status: SpoolStatus }) {
  const styles: Record<SpoolStatus, string> = {
    Fabricated: "bg-sky-100 text-sky-800 border-sky-300",
    Painted: "bg-violet-100 text-violet-800 border-violet-300",
    "Final QC": "bg-amber-100 text-amber-800 border-amber-300",
    Erected: "bg-emerald-100 text-emerald-800 border-emerald-300",
    "In Transit": "bg-slate-100 text-slate-700 border-slate-300",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        styles[status],
      )}
    >
      {status}
    </span>
  );
}

function FlagIndicator({ row }: { row: SpoolRow }) {
  if (!row.flag || !row.flagText) {
    return <span className="text-slate-300">—</span>;
  }

  const isTransit = row.flag === "transit-out";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white">
          <AlertTriangle
            className={cn(
              "h-4 w-4",
              isTransit ? "text-red-600" : "text-amber-600",
            )}
          />
        </span>
      </TooltipTrigger>
      <TooltipContent sideOffset={8}>{row.flagText}</TooltipContent>
    </Tooltip>
  );
}

export function SpoolTrackingDashboard() {
  const [zoneFilter, setZoneFilter] = useState<ZoneFilter>("All zones");
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedSpool, setSelectedSpool] = useState<string | null>(null);

  const visibleTiles = useMemo(() => {
    return locationTiles.filter((tile) => {
      if (zoneFilter !== "All zones" && tile.category !== zoneFilter) {
        return false;
      }

      return true;
    });
  }, [zoneFilter]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return spoolRows.filter((row) => {
      const matchesQuery =
        query.length === 0 ||
        row.spoolNo.toLowerCase().includes(query) ||
        row.isoNo.toLowerCase().includes(query) ||
        row.barcode.toLowerCase().includes(query);

      const matchesZone =
        selectedZone === null || row.location === selectedZone;

      return matchesQuery && matchesZone;
    });
  }, [search, selectedZone]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {topStats.map((stat) => {
          const Icon = stat.icon;

          return (
            <Card
              key={stat.title}
              className={cn(
                stat.tone === "amber" && "border-l-4 border-l-amber-500",
                stat.tone === "red" && "border-l-4 border-l-red-500",
              )}
            >
              <CardHeader className="gap-1 pb-2">
                <CardDescription className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                  {stat.title}
                </CardDescription>
                <CardTitle className="text-[30px] font-semibold tracking-tight">
                  {stat.value}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{stat.subtitle}</p>
                {Icon ? (
                  <div
                    className={cn(
                      "flex items-center gap-1 text-sm font-medium",
                      stat.bottomClassName,
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{stat.bottom}</span>
                  </div>
                ) : stat.tone === "amber" ? (
                  <Badge className="border border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-100">
                    {stat.bottom}
                  </Badge>
                ) : (
                  <button className="text-sm font-medium text-red-600 transition-colors hover:text-red-700">
                    {stat.bottom}
                  </button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader className="gap-4 pb-2 md:flex md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold">
                Site location map
              </CardTitle>
              <CardDescription>
                Capacity monitoring across Qatar LNG Train 7
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {zoneFilters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => {
                    setZoneFilter(filter);
                    setSelectedZone(null);
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    zoneFilter === filter
                      ? "border-sky-300 bg-sky-100 text-sky-800"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visibleTiles.map((tile) => {
                const tone = getCapacityTone(tile.count, tile.capacity);
                const percentage = Math.min(
                  Math.round((tile.count / tile.capacity) * 100),
                  100,
                );
                const isSelected = selectedZone === tile.name;

                return (
                  <button
                    key={tile.name}
                    type="button"
                    onClick={() =>
                      setSelectedZone((current) =>
                        current === tile.name ? null : tile.name,
                      )
                    }
                    className={cn(
                      "min-h-[100px] rounded-lg border p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md",
                      tone.cardClassName,
                      isSelected && "ring-2 ring-sky-500 ring-offset-2",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {tile.name}
                        </p>
                        <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
                          {tile.count}
                        </p>
                      </div>
                      <MapPin className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>
                          {tile.count} / {tile.capacity} capacity
                        </span>
                        <span className={cn("font-medium", tone.textClassName)}>
                          {Math.round((tile.count / tile.capacity) * 100)}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/80">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            tone.progressClassName,
                          )}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 pt-4 text-xs text-slate-600">
              {[
                { label: "Under 70%", color: "bg-emerald-500" },
                { label: "70-90%", color: "bg-amber-500" },
                { label: "Over 90%", color: "bg-red-500" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span
                    className={cn("h-2.5 w-2.5 rounded-full", item.color)}
                  />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                Scans by day
              </CardTitle>
              <CardDescription>
                14-day scan activity from PDA devices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={scanTrendData}
                    margin={{ left: 0, right: 0, top: 10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="scanTrend"
                        x1="0"
                        x2="0"
                        y1="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#2563EB"
                          stopOpacity={0.32}
                        />
                        <stop
                          offset="95%"
                          stopColor="#2563EB"
                          stopOpacity={0.04}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      stroke="#E2E8F0"
                      strokeDasharray="3 3"
                    />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11, fill: "#64748B" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      formatter={(value: number) => [`${value} scans`, "Count"]}
                      labelFormatter={(label) => `Date: ${label}`}
                      contentStyle={{
                        borderRadius: 12,
                        borderColor: "#E2E8F0",
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="scans"
                      stroke="#2563EB"
                      strokeWidth={2}
                      fill="url(#scanTrend)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                Active PDA devices
              </CardTitle>
              <CardDescription>
                Field sync health and operator activity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-xs font-semibold text-slate-900">
                        {device.id}
                      </p>
                      <Badge
                        className={cn(
                          "border text-[11px] hover:bg-transparent",
                          device.status === "Online"
                            ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                            : "border-slate-300 bg-slate-200 text-slate-700",
                        )}
                      >
                        {device.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-700">
                      {device.operator}
                    </p>
                    <p className="text-xs text-slate-500">
                      Last sync {device.lastSync}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getBatteryIcon(device.battery)}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="gap-2 border-b border-slate-200 pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold">
                Spool locations
              </CardTitle>
              <CardDescription>Real-time location tracking</CardDescription>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative min-w-[280px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by ISO no, spool no, or barcode..."
                  className="h-9 border-slate-300 bg-slate-50 pl-9 text-sm"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-slate-300 text-slate-700"
              >
                <Filter className="h-4 w-4" />
                Filter
              </Button>
              <div className="inline-flex rounded-md border border-slate-300 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "rounded px-3 py-1 text-xs font-medium transition-colors",
                    viewMode === "list"
                      ? "bg-sky-600 text-white"
                      : "text-slate-600 hover:bg-slate-50",
                  )}
                >
                  List
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "rounded px-3 py-1 text-xs font-medium transition-colors",
                    viewMode === "grid"
                      ? "bg-sky-600 text-white"
                      : "text-slate-600 hover:bg-slate-50",
                  )}
                >
                  Grid
                </button>
              </div>
              <Button size="sm" className="gap-2">
                <Printer className="h-4 w-4" />
                Print barcodes
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {filteredRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center text-slate-500">
              <Search className="mb-3 h-8 w-8 opacity-40" />
              <p className="text-sm font-medium text-slate-700">
                No spools match your search
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Try a different spool no, ISO no, or barcode.
              </p>
            </div>
          ) : viewMode === "list" ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] border-collapse text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-slate-200 bg-slate-100">
                    {[
                      "Spool No",
                      "ISO No",
                      "Barcode",
                      "Current location",
                      "Status",
                      "Days in location",
                      "Last scan",
                      "Flag",
                      "Actions",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, index) => {
                    const isSelected = selectedSpool === row.spoolNo;

                    return (
                      <tr
                        key={row.spoolNo}
                        onClick={() => setSelectedSpool(row.spoolNo)}
                        className={cn(
                          "cursor-pointer border-b border-slate-200 transition-colors",
                          index % 2 === 0 ? "bg-white" : "bg-slate-50",
                          isSelected
                            ? "border-sky-300 bg-sky-100"
                            : "hover:bg-slate-100",
                        )}
                      >
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="font-mono text-[13px] font-semibold text-sky-600">
                            {row.spoolNo}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-[13px] text-slate-600">
                          {row.isoNo}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[13px] text-slate-700">
                          {row.barcode}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-[13px] text-slate-700">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            {row.location}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <SpoolStatusBadge status={row.status} />
                        </td>
                        <td
                          className={cn(
                            "px-3 py-2.5 whitespace-nowrap text-[13px] font-medium",
                            row.daysInLocation > 14
                              ? "text-red-600"
                              : row.daysInLocation > 7
                                ? "text-amber-600"
                                : "text-slate-700",
                          )}
                        >
                          {row.daysInLocation}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-[13px] text-slate-600">
                          {row.lastScan}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <FlagIndicator row={row} />
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                onClick={(event) => event.stopPropagation()}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 transition-colors hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View history</DropdownMenuItem>
                              <DropdownMenuItem>Print barcode</DropdownMenuItem>
                              <DropdownMenuItem>
                                Manual relocate
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredRows.map((row) => (
                <button
                  key={row.spoolNo}
                  type="button"
                  onClick={() => setSelectedSpool(row.spoolNo)}
                  className={cn(
                    "rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                    selectedSpool === row.spoolNo && "border-sky-300 bg-sky-50",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[13px] font-semibold text-sky-600">
                        {row.spoolNo}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{row.isoNo}</p>
                    </div>
                    <FlagIndicator row={row} />
                  </div>
                  <div className="mt-4 grid gap-3 text-xs text-slate-600 sm:grid-cols-2">
                    <div>
                      <p className="text-slate-500">Barcode</p>
                      <p className="mt-1 font-mono text-slate-700">
                        {row.barcode}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Current location</p>
                      <p className="mt-1 flex items-center gap-1 text-slate-700">
                        <MapPin className="h-3.5 w-3.5" />
                        {row.location}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Status</p>
                      <div className="mt-1">
                        <SpoolStatusBadge status={row.status} />
                      </div>
                    </div>
                    <div>
                      <p className="text-slate-500">Days in location</p>
                      <p className="mt-1 font-medium text-slate-700">
                        {row.daysInLocation}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
        <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-3 text-xs text-slate-600 md:flex-row md:items-center md:justify-between">
          <span>Showing 1-12 of 2,847 spools</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-slate-300 px-3 text-xs"
            >
              Previous
            </Button>
            <span className="rounded-md border border-sky-300 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700">
              1
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-slate-300 px-3 text-xs"
            >
              2
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-slate-300 px-3 text-xs"
            >
              3
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-slate-300 px-3 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Recent inconsistencies
            </CardTitle>
            <CardDescription>
              Spools with status and scan mismatches
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {inconsistencies.map((item) => (
              <div
                key={item.spoolNo}
                className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div className="min-w-0 flex-1">
                  <button className="font-mono text-[13px] font-semibold text-sky-600">
                    {item.spoolNo}
                  </button>
                  <p className="mt-1 text-sm text-slate-700">
                    {item.description}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{item.time}</p>
                </div>
                <button className="text-sm font-medium text-sky-600 transition-colors hover:text-sky-700">
                  Resolve
                </button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Transit out alerts
            </CardTitle>
            <CardDescription>
              Spools scanned out but not received at destination
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {transitAlerts.map((item) => (
              <div
                key={item.spoolNo}
                className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
              >
                <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <div className="min-w-0 flex-1">
                  <button className="font-mono text-[13px] font-semibold text-sky-600">
                    {item.spoolNo}
                  </button>
                  <p className="mt-1 text-sm text-slate-700">
                    {item.description}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
                </div>
                <button className="text-sm font-medium text-red-600 transition-colors hover:text-red-700">
                  Search
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
