"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Filter,
  FlaskConical,
  FolderTree,
  Gauge,
  Search,
  Shield,
  Wrench,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";

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
import { Progress } from "@/components/ui/progress";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IsoLevelView } from "@/components/testpack/iso-level-view";
import { ReleaseWorkDialog } from "@/components/testpack/release-work-dialog";
import { cn } from "@/lib/utils";
import {
  systems,
  subsystems,
  testpacks,
  filterOptions,
  generateReleaseWorkList,
  type PipingSystem,
  type Subsystem,
  type Testpack,
  type Iso,
  type Priority,
  type ReleaseTrackingKey,
  type ReleaseWorkItem,
  type TestpackStatus,
} from "@/lib/testpack-data";
import { useTestpackStore } from "@/store";
import { type TestPackRecord, type ISORecord } from "@/lib/testpack-seed";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function priorityBadgeClasses(priority: Priority) {
  switch (priority) {
    case "High":
      return "border-red-300 bg-red-100 text-red-800";
    case "Medium":
      return "border-amber-300 bg-amber-100 text-amber-800";
    case "Low":
      return "border-slate-300 bg-slate-100 text-slate-700";
  }
}

function statusBadgeClasses(status: TestpackStatus) {
  switch (status) {
    case "Tested & Reinstated":
      return "border-emerald-300 bg-emerald-100 text-emerald-800";
    case "Testing In Progress":
      return "border-sky-300 bg-sky-100 text-sky-800";
    case "Blinding In Progress":
      return "border-violet-300 bg-violet-100 text-violet-800";
    case "Ready For Test":
      return "border-teal-300 bg-teal-100 text-teal-800";
    case "Line Checking":
      return "border-amber-300 bg-amber-100 text-amber-800";
    case "Construction":
      return "border-slate-300 bg-slate-100 text-slate-700";
  }
}

function readinessColor(readiness: number) {
  if (readiness >= 90) return "text-emerald-600";
  if (readiness >= 50) return "text-amber-600";
  return "text-red-600";
}

function readinessBg(readiness: number) {
  if (readiness >= 90) return "bg-emerald-500";
  if (readiness >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function progressColor(value: number) {
  if (value >= 80) return "#10b981";
  if (value >= 40) return "#f59e0b";
  return "#ef4444";
}

function makeSyntheticTestpack(
  tp: TestPackRecord,
  storeISOs: ISORecord[],
): Testpack {
  const tpISOs = storeISOs.filter((iso) => tp.isoIds.includes(iso.id));

  let status: TestpackStatus = "Construction";
  if (tp.preCommDate) status = "Tested & Reinstated";
  else if (tp.testingDoneDate) status = "Testing In Progress";
  else if (tp.blindingStatus === "Done") status = "Blinding In Progress";
  else if (tp.readyForTest) status = "Ready For Test";
  else if (tp.blindingStatus === "Eligible" || tp.blindingStatus === "Assigned")
    status = "Line Checking";

  const syntheticISOs: Iso[] = tpISOs.map((iso) => ({
    isoNo: iso.id,
    rev: "R0",
    spools: iso.spoolsSupported
      ? [
          {
            spoolNo: `${iso.id}-SP-01`,
            status: "Ready For Test" as const,
            statusCode: 12,
          },
          {
            spoolNo: `${iso.id}-SP-02`,
            status: "Ready For Test" as const,
            statusCode: 12,
          },
        ]
      : [],
    isometricStatus: {
      completedDate: iso.lineCheckStatus === "Done" ? "2025-10-20" : undefined,
      lineCheckAssignedDate: iso.lineCheckAssignedTo ? "2025-10-15" : undefined,
      lineCheckReturnedDate:
        iso.lineCheckStatus === "Done" ? "2025-10-22" : undefined,
      itemsCatXToClear: 0,
      jointsToBeWelded: 0,
      flangesToBeBolted: 0,
      jointsAwaitingNde: 0,
      qcReleasedDate: iso.lineCheckStatus === "Done" ? "2025-10-25" : undefined,
      readyForTestDate:
        iso.lineCheckStatus === "Done" ? "2025-10-28" : undefined,
    },
  }));

  return {
    id: tp.id,
    name: tp.no,
    subsystemId: tp.subsystem,
    systemId: tp.system,
    location: tp.location,
    areaClassification: tp.areaClassification,
    subcontractor: "Primary Fabricator",
    revNo: "Rev 1",
    unitOfTime: "24 h",
    priority: tp.priority,
    testMedium: "Hydro",
    testPressure: "20.0 bar",
    volume: "2.0 m\u00b3",
    totalIsos: tp.isoIds.length,
    totalSpools: tp.isoIds.length * 2,
    totalWeldJoints: tp.isoIds.length * 4,
    totalFlangeJoints: tp.isoIds.length,
    testPlannedDate: "2025-12-01",
    readiness: 0,
    status,
    releaseTracking: {
      jointsToBeWelded: 0,
      flangesToBeBolted: 0,
      jointsAwaitingNde: 0,
      isosToComplete: 0,
      isosToReturnFromLineCheck: 0,
      itemsCatXToClear: 0,
      isosToQcRelease: 0,
      isosReadyForTest: 0,
    },
    operations: {
      milestones: [
        { label: "Ready for test date", status: "Pending" as const },
        { label: "Assigned to be blinded", status: "Pending" as const },
        { label: "Blinding complete", status: "Pending" as const },
        { label: "Test done", status: "Pending" as const },
        { label: "Pre-commissioning", status: "Pending" as const },
        { label: "Reinstatement", status: "Pending" as const },
      ],
      itemsYCleared: { done: 0, total: 0 },
      itemsZCleared: { done: 0, total: 0 },
    },
    progressStatus: {
      construction: 0,
      lineChecking: 0,
      testing: 0,
      reinstatement: 0,
    },
    isos: syntheticISOs,
  };
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function BreadcrumbTrail({
  path,
  onNavigate,
  level,
}: {
  path: { label: string; level: number }[];
  onNavigate: (level: number) => void;
  level: number;
}) {
  const levelLabels: Record<number, string> = {
    1: "System Level",
    2: "Subsystem Level",
    3: "Testpack Level",
    4: "ISO Level",
  };

  const viewLevel = path.length > 0 ? path[path.length - 1].level : level;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <nav className="flex flex-wrap items-center gap-1 text-sm">
        {path.map((segment, index) => (
          <span
            key={`${segment.label}-${index}`}
            className="flex items-center gap-1"
          >
            {index > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            )}
            {index < path.length - 1 ? (
              <button
                type="button"
                onClick={() => onNavigate(segment.level)}
                className="font-medium text-sky-700 hover:text-sky-800 hover:underline"
              >
                {segment.label}
              </button>
            ) : (
              <span className="font-semibold text-slate-900">
                {segment.label}
              </span>
            )}
          </span>
        ))}
      </nav>
      <Badge
        variant="outline"
        className="w-fit text-xs font-medium text-slate-600"
      >
        Viewing: {levelLabels[viewLevel] ?? "Explorer"}
      </Badge>
    </div>
  );
}

function SystemCard({
  system,
  onClick,
}: {
  system: PipingSystem;
  onClick: () => void;
}) {
  const totalDots = system.tested + system.inProgress + system.blocked;
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {system.id} {system.name}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {system.subsystemCount} subsystems · {system.testpackCount} test
            packs
          </p>
        </div>
        <FolderTree className="h-5 w-5 text-slate-400" />
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>{system.progress}% testing complete</span>
          <span className="font-medium">{system.progress}%</span>
        </div>
        <Progress value={system.progress} className="h-1.5" />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-[11px] text-slate-600">{system.tested}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-[11px] text-slate-600">
            {system.inProgress}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          <span className="text-[11px] text-slate-600">{system.blocked}</span>
        </div>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {totalDots} total
        </span>
      </div>
    </button>
  );
}

function SubsystemTable({
  rows,
  onRowClick,
}: {
  rows: Subsystem[];
  onRowClick: (subsystem: Subsystem) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-6 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Subsystem No
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Name
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Test Packs
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Spools
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Progress
              </TableHead>
              <TableHead className="px-6 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                onClick={() => onRowClick(row)}
                className="cursor-pointer hover:bg-slate-50"
              >
                <TableCell className="px-6">
                  <span className="font-mono text-xs font-semibold text-sky-700">
                    {row.id}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-slate-900">
                  {row.name}
                </TableCell>
                <TableCell className="text-sm text-slate-900">
                  {row.testpackCount}
                </TableCell>
                <TableCell className="text-sm text-slate-900">
                  {row.spoolCount}
                </TableCell>
                <TableCell>
                  <div className="min-w-[120px] space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-900">
                        {row.progress}%
                      </span>
                    </div>
                    <Progress value={row.progress} className="h-1.5" />
                  </div>
                </TableCell>
                <TableCell className="px-6">
                  <span
                    className={cn(
                      "inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
                      statusBadgeClasses(row.status),
                    )}
                  >
                    {row.status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function TestpackGeneral({ testpack }: { testpack: Testpack }) {
  const fields: { label: string; value: React.ReactNode }[] = [
    { label: "Subsystem No", value: testpack.subsystemId },
    { label: "Test Pack No", value: testpack.id },
    { label: "Test Pack Location", value: testpack.location },
    { label: "Rev Number", value: testpack.revNo },
    {
      label: "Test Planned Date",
      value: format(new Date(testpack.testPlannedDate), "dd MMM yyyy"),
    },
    {
      label: "Test Pack Priority",
      value: (
        <span
          className={cn(
            "inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium",
            priorityBadgeClasses(testpack.priority),
          )}
        >
          {testpack.priority}
        </span>
      ),
    },
    {
      label: "Test Medium",
      value: (
        <Badge
          variant="outline"
          className={cn(
            testpack.testMedium === "Hydro" &&
              "border-sky-300 bg-sky-100 text-sky-800",
            testpack.testMedium === "Pneumatic" &&
              "border-violet-300 bg-violet-100 text-violet-800",
            testpack.testMedium === "Vacuum" &&
              "border-cyan-300 bg-cyan-100 text-cyan-800",
          )}
        >
          {testpack.testMedium}
        </Badge>
      ),
    },
    { label: "Test Pressure", value: testpack.testPressure },
    { label: "Unit of time", value: testpack.unitOfTime },
    { label: "Volume", value: testpack.volume },
    { label: "Total ISOs in pack", value: testpack.totalIsos },
    { label: "Total spools", value: testpack.totalSpools },
    { label: "Total weld joints", value: testpack.totalWeldJoints },
    { label: "Total flange joints", value: testpack.totalFlangeJoints },
  ];

  return (
    <Card className="gap-4 py-5">
      <CardHeader className="px-5 pb-0">
        <CardTitle className="text-sm font-medium">General</CardTitle>
        <CardDescription>Test pack control metadata</CardDescription>
      </CardHeader>
      <CardContent className="px-5">
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          {fields.map((f) => (
            <div
              key={f.label}
              className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2"
            >
              <dt className="text-muted-foreground">{f.label}</dt>
              <dd className="font-medium text-slate-900">{f.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

const RELEASE_TRACKING_KEYS: {
  key: ReleaseTrackingKey;
  label: string;
  icon: typeof Wrench;
  screen: string;
}[] = [
  {
    key: "jointsToBeWelded",
    label: "Joints to be welded",
    icon: Wrench,
    screen: "Weld Joints",
  },
  {
    key: "flangesToBeBolted",
    label: "Flanges to be bolted",
    icon: Shield,
    screen: "Flange Bolting",
  },
  {
    key: "jointsAwaitingNde",
    label: "Joints awaiting NDE",
    icon: FlaskConical,
    screen: "NDE Queue",
  },
  {
    key: "isosToComplete",
    label: "ISOs to complete (all spools supported)",
    icon: FolderTree,
    screen: "ISO Completion",
  },
  {
    key: "isosToReturnFromLineCheck",
    label: "ISOs to return from line checking",
    icon: Clock,
    screen: "Line Check Return",
  },
  {
    key: "itemsCatXToClear",
    label: "Items Cat X to clear before test",
    icon: AlertCircle,
    screen: "Category X Items",
  },
  {
    key: "isosToQcRelease",
    label: "ISOs to QC release",
    icon: CheckCircle2,
    screen: "QC Release",
  },
  {
    key: "isosReadyForTest",
    label: "ISOs Ready For Test",
    icon: Gauge,
    screen: "Ready For Test",
  },
];

/* ---------- Live gate helpers ---------- */

type GateState = "green" | "amber" | "red" | "slate";

interface GateDef {
  index: number;
  name: string;
  metric: number | boolean;
  state: GateState;
  clickable: boolean;
  getUrl?: () => string;
}

function GateIcon({ state }: { state: GateState }) {
  if (state === "green") {
    return <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />;
  }
  return (
    <span
      className={cn(
        "h-3 w-3 rounded-full shrink-0",
        state === "amber" && "bg-amber-500",
        state === "red" && "bg-red-500",
        state === "slate" && "bg-slate-400",
      )}
    />
  );
}

function LiveReleaseTracking({ testpackId }: { testpackId: string }) {
  const router = useRouter();
  const store = useTestpackStore();
  const storeTP = store.testPacks.find((tp) => tp.id === testpackId);

  if (!storeTP) return null;

  const tpISOs = store.isos.filter((iso) => storeTP.isoIds.includes(iso.id));

  const lineCheckRemaining = tpISOs.filter(
    (iso) => iso.lineCheckStatus !== "Done",
  ).length;
  const openXItems = store.punchItems.filter(
    (pi) =>
      !pi.clearedAt && pi.category === "X" && storeTP.isoIds.includes(pi.isoId),
  ).length;
  const blinded = storeTP.blindingStatus === "Done";
  const hydrotestPassed = !!storeTP.testingDoneDate;
  const preComm = !!storeTP.preCommDate;

  const openYOnThisTP = store.punchItems.filter(
    (pi) =>
      !pi.reinstatedAt &&
      pi.category === "Y" &&
      storeTP.isoIds.includes(pi.isoId) &&
      storeTP.testingDoneDate,
  ).length;
  const openZOnThisTP = store.punchItems.filter(
    (pi) =>
      !pi.reinstatedAt &&
      pi.category === "Z" &&
      storeTP.isoIds.includes(pi.isoId) &&
      storeTP.preCommDate,
  ).length;
  const reinstatementRemaining = openYOnThisTP + openZOnThisTP;

  const qcReleased = lineCheckRemaining === 0 && openXItems === 0;
  const readyForTest =
    qcReleased &&
    (storeTP.blindingStatus === "Eligible" ||
      storeTP.blindingStatus === "Assigned" ||
      storeTP.blindingStatus === "Done");

  const allGatesGreen =
    lineCheckRemaining === 0 &&
    openXItems === 0 &&
    qcReleased &&
    readyForTest &&
    blinded &&
    hydrotestPassed &&
    preComm &&
    reinstatementRemaining === 0;

  const blockers = lineCheckRemaining + openXItems;

  let badgeText = "";
  let badgeCls = "";
  if (allGatesGreen) {
    badgeText = "FULLY COMMISSIONED";
    badgeCls = "bg-emerald-100 text-emerald-800 border-emerald-300";
  } else if (blockers > 0) {
    badgeText = `NOT READY FOR TEST \u00b7 ${blockers} blocker${blockers !== 1 ? "s" : ""}`;
    badgeCls = "bg-red-100 text-red-800 border-red-300";
  } else if (!blinded) {
    badgeText = "READY FOR TEST \u2014 awaiting blinding";
    badgeCls = "bg-amber-100 text-amber-800 border-amber-300";
  } else if (!hydrotestPassed) {
    badgeText = "BLINDED \u2014 hydrotest in progress";
    badgeCls = "bg-sky-100 text-sky-800 border-sky-300";
  } else {
    badgeText = "HYDROTEST PASSED \u00b7 awaiting reinstatement";
    badgeCls = "bg-emerald-100 text-emerald-800 border-emerald-300";
  }

  const gates: GateDef[] = [
    {
      index: 1,
      name: "Welded joints to be welded",
      metric: 0,
      state: "green",
      clickable: false,
    },
    {
      index: 2,
      name: "Flange joints to be bolted",
      metric: 0,
      state: "green",
      clickable: false,
    },
    {
      index: 3,
      name: "Welded joints still to be NDE-tested",
      metric: 0,
      state: "green",
      clickable: false,
    },
    {
      index: 4,
      name: "Line Check completion",
      metric: lineCheckRemaining,
      state:
        lineCheckRemaining === 0
          ? "green"
          : lineCheckRemaining < tpISOs.length
            ? "amber"
            : "red",
      clickable: true,
      getUrl: () =>
        `/testpack/pressure-test/line-check/${lineCheckRemaining > 0 ? "preparation" : "progress"}?testpack=${testpackId}`,
    },
    {
      index: 5,
      name: "Open X punch items",
      metric: openXItems,
      state: openXItems === 0 ? "green" : "red",
      clickable: true,
      getUrl: () =>
        `/testpack/pressure-test/item-clearance/${openXItems > 0 ? "preparation" : "progress"}?testpack=${testpackId}`,
    },
    {
      index: 6,
      name: "QC released for test",
      metric: qcReleased,
      state: qcReleased ? "green" : "slate",
      clickable: false,
    },
    {
      index: 7,
      name: "Ready For Test",
      metric: readyForTest,
      state: readyForTest ? "green" : "slate",
      clickable: false,
    },
    {
      index: 8,
      name: "Blinded",
      metric: blinded,
      state: blinded
        ? "green"
        : storeTP.blindingStatus === "Assigned" ||
            storeTP.blindingStatus === "Eligible"
          ? "amber"
          : "slate",
      clickable: true,
      getUrl: () => {
        if (blinded)
          return `/testpack/pressure-test/blinding/progress?testpack=${testpackId}`;
        if (storeTP.blindingStatus === "Assigned")
          return `/testpack/pressure-test/blinding/progress?testpack=${testpackId}`;
        return `/testpack/pressure-test/blinding/preparation?testpack=${testpackId}`;
      },
    },
    {
      index: 9,
      name: "Hydrotest passed",
      metric: hydrotestPassed,
      state: hydrotestPassed ? "green" : "slate",
      clickable: true,
      getUrl: () =>
        `/testpack/pressure-test/testing-precomm/progress?testpack=${testpackId}`,
    },
    {
      index: 10,
      name: "Pre-commissioned",
      metric: preComm,
      state: preComm ? "green" : "slate",
      clickable: true,
      getUrl: () =>
        `/testpack/pressure-test/testing-precomm/progress?testpack=${testpackId}`,
    },
    {
      index: 11,
      name: "Reinstatement complete",
      metric: reinstatementRemaining,
      state: reinstatementRemaining === 0 ? "green" : "red",
      clickable: true,
      getUrl: () =>
        `/testpack/pressure-test/reinstatement/${reinstatementRemaining > 0 ? "preparation" : "progress"}?testpack=${testpackId}`,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Composite header badge */}
      <div className="flex justify-center">
        <span
          className={cn(
            "inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold border",
            badgeCls,
          )}
        >
          {badgeText}
        </span>
      </div>

      {/* Gate list */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {gates.map((gate) => {
              const metricLabel =
                typeof gate.metric === "boolean"
                  ? gate.metric
                    ? "Yes"
                    : "No"
                  : String(gate.metric);
              return (
                <div
                  key={gate.index}
                  onClick={() => {
                    if (gate.clickable && gate.getUrl) {
                      router.push(gate.getUrl());
                    }
                  }}
                  className={cn(
                    "flex items-center gap-3 px-5 py-3.5 transition-colors",
                    gate.clickable
                      ? "cursor-pointer hover:bg-slate-50"
                      : "opacity-60 cursor-default",
                  )}
                >
                  <GateIcon state={gate.state} />
                  <span className="flex-1 text-sm text-slate-900">
                    {gate.name}
                  </span>
                  <span className="text-sm font-medium text-slate-600">
                    {metricLabel}
                  </span>
                  {gate.clickable && (
                    <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReleaseTracking({
  testpack,
  onOpenWorkList,
}: {
  testpack: Testpack;
  onOpenWorkList: (title: string, items: ReleaseWorkItem[]) => void;
}) {
  const router = useRouter();
  const store = useTestpackStore();
  const storeTP = store.testPacks.find((tp) => tp.id === testpack.id);

  if (storeTP) {
    return <LiveReleaseTracking testpackId={testpack.id} />;
  }

  const rt = testpack.releaseTracking;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {RELEASE_TRACKING_KEYS.map((item) => {
          const count = rt[item.key];
          const Icon = item.icon;
          const isRed = item.key === "jointsToBeWelded" && count > 0;
          const isAmber =
            (item.key === "jointsAwaitingNde" ||
              item.key === "flangesToBeBolted") &&
            count > 0;
          const isGreen = item.key === "isosReadyForTest";
          const iconColor = isRed
            ? "text-red-600"
            : isAmber
              ? "text-amber-600"
              : isGreen
                ? "text-emerald-600"
                : "text-slate-500";

          return (
            <Card
              key={item.key}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() =>
                onOpenWorkList(
                  item.label,
                  generateReleaseWorkList(testpack, item.key, count),
                )
              }
            >
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <Icon className={cn("h-5 w-5", iconColor)} />
                  <span className="text-[11px] text-sky-600 hover:underline">
                    View list →
                  </span>
                </div>
                <p
                  className={cn(
                    "text-2xl font-semibold tracking-tight",
                    isRed
                      ? "text-red-700"
                      : isAmber
                        ? "text-amber-700"
                        : isGreen
                          ? "text-emerald-700"
                          : "text-slate-900",
                  )}
                >
                  {count}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.label}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Quick links</CardTitle>
          <CardDescription>
            Navigate to related preparation screens
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 pt-0">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => {
              router.push("/testpack/pressure-test");
              toast.info("Opening Line Check — Preparation");
            }}
          >
            Line Check — Preparation
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => {
              router.push("/testpack/pressure-test");
              toast.info("Opening Line Check — Progress");
            }}
          >
            Line Check — Progress
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => {
              router.push("/testpack/pressure-test");
              toast.info("Opening Item Clearance — Preparation");
            }}
          >
            Item Clearance — Preparation
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Test pack readiness
              </p>
              <p className="text-xs text-muted-foreground">
                Overall completion before test can proceed
              </p>
            </div>
            <span
              className={cn(
                "text-2xl font-bold",
                readinessColor(testpack.readiness),
              )}
            >
              {testpack.readiness}%
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn(
                "h-full rounded-full",
                readinessBg(testpack.readiness),
              )}
              style={{ width: `${testpack.readiness}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function OperationsTab({ testpack }: { testpack: Testpack }) {
  const { milestones, itemsYCleared, itemsZCleared } = testpack.operations;

  return (
    <Card className="gap-4 py-5">
      <CardHeader className="px-5 pb-0">
        <CardTitle className="text-sm font-medium">
          Testing milestones
        </CardTitle>
        <CardDescription>Timeline of testing phase checkpoints</CardDescription>
      </CardHeader>
      <CardContent className="px-5">
        <div className="space-y-0">
          {milestones.map((m, index) => {
            const isLast = index === milestones.length - 1;
            const isDone = m.status === "Done";
            const isInProgress = m.status === "In Progress";

            return (
              <div key={m.label} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border",
                      isDone
                        ? "border-emerald-300 bg-emerald-100"
                        : isInProgress
                          ? "border-sky-300 bg-sky-100"
                          : "border-slate-200 bg-slate-50",
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : isInProgress ? (
                      <Clock className="h-4 w-4 text-sky-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                  {!isLast && <div className="mt-2 h-full w-px bg-slate-200" />}
                </div>
                <div className={cn("flex-1 pb-5", isLast && "pb-0")}>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-slate-900">
                      {m.label}
                    </p>
                    <span
                      className={cn(
                        "inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium",
                        isDone
                          ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                          : isInProgress
                            ? "border-sky-300 bg-sky-100 text-sky-800"
                            : "border-slate-300 bg-slate-100 text-slate-600",
                      )}
                    >
                      {m.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {m.date ? format(new Date(m.date), "dd MMM yyyy") : "—"}
                    {m.detail ? ` · ${m.detail}` : ""}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Extra checklist items */}
          <div className="flex gap-3 pt-2">
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-300 bg-amber-100">
                <CheckCircle2 className="h-4 w-4 text-amber-600" />
              </div>
              <div className="mt-2 h-full w-px bg-slate-200" />
            </div>
            <div className="flex-1 pb-5">
              <p className="text-sm font-medium text-slate-900">
                Items Y cleared
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {itemsYCleared.done}/{itemsYCleared.total} (
                {Math.round((itemsYCleared.done / itemsYCleared.total) * 100)}%)
              </p>
              <div className="mt-1.5 h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-amber-500"
                  style={{
                    width: `${(itemsYCleared.done / itemsYCleared.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-red-300 bg-red-100">
                <AlertCircle className="h-4 w-4 text-red-600" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">
                Items Z cleared
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {itemsZCleared.done}/{itemsZCleared.total} (
                {itemsZCleared.total > 0
                  ? Math.round((itemsZCleared.done / itemsZCleared.total) * 100)
                  : 0}
                %)
              </p>
              <div className="mt-1.5 h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-red-500"
                  style={{
                    width: `${itemsZCleared.total > 0 ? (itemsZCleared.done / itemsZCleared.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressStatusTab({ testpack }: { testpack: Testpack }) {
  const items = [
    { label: "Construction", value: testpack.progressStatus.construction },
    { label: "Line Checking", value: testpack.progressStatus.lineChecking },
    { label: "Testing", value: testpack.progressStatus.testing },
    { label: "Reinstatement", value: testpack.progressStatus.reinstatement },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {items.map((item) => {
        const data = [
          {
            name: item.label,
            value: item.value,
            fill: progressColor(item.value),
          },
        ];
        return (
          <Card key={item.label} className="overflow-hidden">
            <CardContent className="p-5">
              <div className="relative h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="60%"
                    outerRadius="90%"
                    barSize={18}
                    data={data}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <RadialBar background dataKey="value" cornerRadius={8} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className={cn(
                      "text-3xl font-bold",
                      item.value >= 80
                        ? "text-emerald-600"
                        : item.value >= 40
                          ? "text-amber-600"
                          : "text-red-600",
                    )}
                  >
                    {item.value}%
                  </span>
                </div>
              </div>
              <p className="mt-2 text-center text-sm font-medium text-slate-900">
                {item.label}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function IsoSpoolTable({ iso }: { iso: Iso }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              {iso.isoNo}
            </CardTitle>
            <CardDescription>Rev {iso.rev}</CardDescription>
          </div>
          <Badge variant="outline">{iso.spools.length} spools</Badge>
        </div>
      </CardHeader>
      <div className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-6 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Spool No
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Status
              </TableHead>
              <TableHead className="px-6 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Indicator
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {iso.spools.map((spool) => {
              const color =
                spool.status === "Ready For Test"
                  ? "bg-emerald-500"
                  : spool.status === "In Progress"
                    ? "bg-amber-500"
                    : "bg-red-500";
              return (
                <TableRow key={spool.spoolNo}>
                  <TableCell className="px-6 font-mono text-xs font-medium text-sky-700">
                    {spool.spoolNo}
                  </TableCell>
                  <TableCell className="text-sm text-slate-900">
                    {spool.status}
                  </TableCell>
                  <TableCell className="px-6">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2.5 w-2.5 rounded-full", color)} />
                      <span className="text-xs text-muted-foreground">
                        Code {spool.statusCode}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function TestpackExplorer() {
  const [level, setLevel] = useState<1 | 2 | 3 | 4>(1);
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);
  const [selectedSubsystemId, setSelectedSubsystemId] = useState<string | null>(
    null,
  );
  const [selectedTestpackId, setSelectedTestpackId] = useState<string | null>(
    null,
  );
  const [selectedIsoId, setSelectedIsoId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [systemFilter, setSystemFilter] = useState("All Systems");
  const [locationFilter, setLocationFilter] = useState("All Locations");
  const [areaFilter, setAreaFilter] = useState("All Areas");
  const [subcontractorFilter, setSubcontractorFilter] =
    useState("All Subcontractors");
  const [priorityFilter, setPriorityFilter] = useState<
    "All" | "High" | "Medium" | "Low"
  >("All");
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [releaseDialogTitle, setReleaseDialogTitle] = useState("");
  const [releaseDialogItems, setReleaseDialogItems] = useState<
    ReleaseWorkItem[]
  >([]);

  const openReleaseWorkList = (title: string, items: ReleaseWorkItem[]) => {
    setReleaseDialogTitle(title);
    setReleaseDialogItems(items);
    setReleaseDialogOpen(true);
  };

  /* ---------------------------------------------------------------- */
  /*  Breadcrumb                                                        */
  /* ---------------------------------------------------------------- */
  const breadcrumbPath = useMemo(() => {
    const path: { label: string; level: number }[] = [
      { label: "All Systems", level: 0 },
    ];
    if (selectedSystemId) {
      const sys = systems.find((s) => s.id === selectedSystemId);
      if (sys) path.push({ label: sys.id, level: 1 });
    }
    if (selectedSubsystemId) {
      path.push({ label: selectedSubsystemId, level: 2 });
    }
    if (selectedTestpackId) {
      path.push({ label: selectedTestpackId, level: 3 });
    }
    if (selectedIsoId) {
      path.push({ label: selectedIsoId, level: 4 });
    }
    return path;
  }, [
    selectedSystemId,
    selectedSubsystemId,
    selectedTestpackId,
    selectedIsoId,
  ]);

  const handleBreadcrumbNavigate = (targetLevel: number) => {
    if (targetLevel <= 0) {
      setSelectedSystemId(null);
      setSelectedSubsystemId(null);
      setSelectedTestpackId(null);
      setSelectedIsoId(null);
      setLevel(1);
      return;
    }
    if (targetLevel === 1) {
      setSelectedSubsystemId(null);
      setSelectedTestpackId(null);
      setSelectedIsoId(null);
      setLevel(2);
      return;
    }
    if (targetLevel === 2) {
      setSelectedTestpackId(null);
      setSelectedIsoId(null);
      setLevel(3);
      return;
    }
    if (targetLevel === 3) {
      setSelectedIsoId(null);
      setLevel(selectedTestpackId ? 3 : 3);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Drill-down handlers                                               */
  /* ---------------------------------------------------------------- */
  const handleSystemClick = (system: PipingSystem) => {
    setSelectedSystemId(system.id);
    setLevel(2);
  };

  const handleSubsystemClick = (subsystem: Subsystem) => {
    setSelectedSubsystemId(subsystem.id);
    setLevel(3);
  };

  const handleTestpackClick = (testpack: Testpack) => {
    setSelectedTestpackId(testpack.id);
    setLevel(3);
  };

  const handleIsoClick = (iso: Iso) => {
    setSelectedIsoId(iso.isoNo);
    setLevel(4);
  };

  /* ---------------------------------------------------------------- */
  /*  Filtered data                                                     */
  /* ---------------------------------------------------------------- */
  const filteredSystems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return systems.filter((s) => {
      if (systemFilter !== "All Systems" && s.id !== systemFilter) return false;
      if (query) {
        return (
          s.id.toLowerCase().includes(query) ||
          s.name.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [search, systemFilter]);

  const filteredSubsystems = useMemo(() => {
    if (!selectedSystemId) return [];
    const query = search.trim().toLowerCase();
    return subsystems
      .filter((s) => s.systemId === selectedSystemId)
      .filter((s) => {
        if (query) {
          return (
            s.id.toLowerCase().includes(query) ||
            s.name.toLowerCase().includes(query)
          );
        }
        return true;
      });
  }, [selectedSystemId, search]);

  const storeTestPacks = useTestpackStore((s) => s.testPacks);
  const storeISOs = useTestpackStore((s) => s.isos);

  const liveIds = useMemo(
    () => new Set(storeTestPacks.map((tp) => tp.id)),
    [storeTestPacks],
  );

  const filteredTestpacks = useMemo(() => {
    if (!selectedSubsystemId) return [];
    const query = search.trim().toLowerCase();
    const staticList = testpacks
      .filter((tp) => tp.subsystemId === selectedSubsystemId)
      .filter((tp) => {
        if (
          locationFilter !== "All Locations" &&
          tp.location !== locationFilter
        )
          return false;
        if (areaFilter !== "All Areas" && tp.areaClassification !== areaFilter)
          return false;
        if (
          subcontractorFilter !== "All Subcontractors" &&
          tp.subcontractor !== subcontractorFilter
        )
          return false;
        if (priorityFilter !== "All" && tp.priority !== priorityFilter)
          return false;
        if (query) {
          return (
            tp.id.toLowerCase().includes(query) ||
            tp.name.toLowerCase().includes(query) ||
            tp.isos.some(
              (iso) =>
                iso.isoNo.toLowerCase().includes(query) ||
                iso.spools.some((sp) =>
                  sp.spoolNo.toLowerCase().includes(query),
                ),
            )
          );
        }
        return true;
      });

    // Append synthetic rows for store testpacks not already in static list
    const synthetic = storeTestPacks
      .filter((tp) => tp.subsystem === selectedSubsystemId)
      .filter((tp) => !testpacks.some((st) => st.id === tp.id))
      .map((tp) => makeSyntheticTestpack(tp, storeISOs));

    const combined = [...synthetic, ...staticList];
    return combined;
  }, [
    selectedSubsystemId,
    search,
    locationFilter,
    areaFilter,
    subcontractorFilter,
    priorityFilter,
    storeTestPacks,
    storeISOs,
  ]);

  const selectedTestpack = useMemo(() => {
    const staticTp = testpacks.find((tp) => tp.id === selectedTestpackId);
    if (staticTp) return staticTp;
    const storeTp = storeTestPacks.find((tp) => tp.id === selectedTestpackId);
    if (storeTp) return makeSyntheticTestpack(storeTp, storeISOs);
    return null;
  }, [selectedTestpackId, storeTestPacks, storeISOs]);

  const selectedIso = useMemo(
    () =>
      selectedTestpack?.isos.find((iso) => iso.isoNo === selectedIsoId) ?? null,
    [selectedTestpack, selectedIsoId],
  );

  const selectedIsoIndex = useMemo(() => {
    if (!selectedTestpack || !selectedIsoId) return -1;
    return selectedTestpack.isos.findIndex(
      (iso) => iso.isoNo === selectedIsoId,
    );
  }, [selectedTestpack, selectedIsoId]);

  const testpackNav = useMemo(() => {
    if (!selectedSubsystemId || !selectedTestpackId)
      return { index: -1, list: [] as Testpack[] };
    const staticList = testpacks.filter(
      (tp) => tp.subsystemId === selectedSubsystemId,
    );
    const synthetic = storeTestPacks
      .filter((tp) => tp.subsystem === selectedSubsystemId)
      .filter((tp) => !testpacks.some((st) => st.id === tp.id))
      .map((tp) => makeSyntheticTestpack(tp, storeISOs));
    const list = [...synthetic, ...staticList];
    return {
      index: list.findIndex((tp) => tp.id === selectedTestpackId),
      list,
    };
  }, [selectedSubsystemId, selectedTestpackId, storeTestPacks, storeISOs]);

  /* ---------------------------------------------------------------- */
  /*  Render helpers                                                    */
  /* ---------------------------------------------------------------- */

  const filterBar = (
    <div className="sticky top-0 z-20 border-b bg-white/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-[260px] flex-1 xl:max-w-[320px]">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search testpack, ISO, or spool..."
              className="pl-9"
            />
          </div>

          <Select value={systemFilter} onValueChange={setSystemFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="System No" />
            </SelectTrigger>
            <SelectContent>
              {filterOptions.systems.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              {filterOptions.locations.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={areaFilter} onValueChange={setAreaFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Area Classification" />
            </SelectTrigger>
            <SelectContent>
              {filterOptions.areaClassifications.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={subcontractorFilter}
            onValueChange={setSubcontractorFilter}
          >
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Subcontractor" />
            </SelectTrigger>
            <SelectContent>
              {filterOptions.subcontractors.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={priorityFilter}
            onValueChange={(v) => setPriorityFilter(v as typeof priorityFilter)}
          >
            <SelectTrigger className="w-[110px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              {filterOptions.priorities.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          Filter
        </Button>
      </div>
    </div>
  );

  /* ---------------------------------------------------------------- */
  /*  Level 1: System cards                                             */
  /* ---------------------------------------------------------------- */
  if (level === 1) {
    return (
      <div className="space-y-6">
        <BreadcrumbTrail
          path={breadcrumbPath}
          onNavigate={handleBreadcrumbNavigate}
          level={level}
        />
        {filterBar}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSystems.map((system) => (
            <SystemCard
              key={system.id}
              system={system}
              onClick={() => handleSystemClick(system)}
            />
          ))}
        </div>
        {filteredSystems.length === 0 && (
          <div className="px-6 py-10 text-center">
            <p className="text-sm font-medium text-slate-900">
              No systems match the current filters
            </p>
          </div>
        )}
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Level 2: Subsystem table                                          */
  /* ---------------------------------------------------------------- */
  if (level === 2) {
    return (
      <div className="space-y-6">
        <BreadcrumbTrail
          path={breadcrumbPath}
          onNavigate={handleBreadcrumbNavigate}
          level={level}
        />
        {filterBar}
        <SubsystemTable
          rows={filteredSubsystems}
          onRowClick={handleSubsystemClick}
        />
        {filteredSubsystems.length === 0 && (
          <div className="px-6 py-10 text-center">
            <p className="text-sm font-medium text-slate-900">
              No subsystems match the current filters
            </p>
          </div>
        )}
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Level 3: Testpack level                                           */
  /* ---------------------------------------------------------------- */
  if (level === 3 && selectedTestpack) {
    return (
      <div className="space-y-6">
        <BreadcrumbTrail
          path={breadcrumbPath}
          onNavigate={handleBreadcrumbNavigate}
          level={level}
        />
        {filterBar}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-mono text-2xl font-bold tracking-tight text-slate-900">
              {selectedTestpack.id}
            </h2>
            <span
              className={cn(
                "inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium",
                statusBadgeClasses(selectedTestpack.status),
              )}
            >
              {selectedTestpack.status}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium",
                priorityBadgeClasses(selectedTestpack.priority),
              )}
            >
              {selectedTestpack.priority}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={testpackNav.index <= 0}
              onClick={() => {
                const prev = testpackNav.list[testpackNav.index - 1];
                if (prev) setSelectedTestpackId(prev.id);
              }}
              aria-label="Previous test pack"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={
                testpackNav.index < 0 ||
                testpackNav.index >= testpackNav.list.length - 1
              }
              onClick={() => {
                const next = testpackNav.list[testpackNav.index + 1];
                if (next) setSelectedTestpackId(next.id);
              }}
              aria-label="Next test pack"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info("Opening test pack dossier...")}
            >
              <Eye className="mr-1 h-4 w-4" />
              View Dossier
            </Button>
          </div>
        </div>

        <Tabs defaultValue="general" className="gap-4">
          <TabsList className="h-9">
            <TabsTrigger value="general" className="text-xs">
              General
            </TabsTrigger>
            <TabsTrigger value="release" className="text-xs">
              Release Tracking
            </TabsTrigger>
            <TabsTrigger value="operations" className="text-xs">
              Operations
            </TabsTrigger>
            <TabsTrigger value="progress" className="text-xs">
              Progress Status
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <TestpackGeneral testpack={selectedTestpack} />
            <Card className="overflow-hidden">
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-sm font-medium">
                  ISOs in test pack
                </CardTitle>
                <CardDescription>
                  Click an ISO to view spool-level status
                </CardDescription>
              </CardHeader>
              <div className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-6 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        ISO No
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Rev
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Spools
                      </TableHead>
                      <TableHead className="px-6 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedTestpack.isos.map((iso) => (
                      <TableRow
                        key={iso.isoNo}
                        onClick={() => handleIsoClick(iso)}
                        className="cursor-pointer hover:bg-slate-50"
                      >
                        <TableCell className="px-6 font-mono text-xs font-medium text-sky-700">
                          {iso.isoNo}
                        </TableCell>
                        <TableCell className="text-sm text-slate-900">
                          {iso.rev}
                        </TableCell>
                        <TableCell className="text-sm text-slate-900">
                          {iso.spools.length}
                        </TableCell>
                        <TableCell className="px-6">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 hover:underline">
                            View spools
                            <ArrowRight className="h-3 w-3" />
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="release" className="space-y-4">
            <ReleaseTracking
              testpack={selectedTestpack}
              onOpenWorkList={openReleaseWorkList}
            />
          </TabsContent>

          <TabsContent value="operations" className="space-y-4">
            <OperationsTab testpack={selectedTestpack} />
          </TabsContent>

          <TabsContent value="progress" className="space-y-4">
            <ProgressStatusTab testpack={selectedTestpack} />
          </TabsContent>
        </Tabs>
        <ReleaseWorkDialog
          open={releaseDialogOpen}
          onOpenChange={setReleaseDialogOpen}
          title={releaseDialogTitle}
          items={releaseDialogItems}
        />
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Level 3 fallback: testpack list for subsystem                    */
  /* ---------------------------------------------------------------- */
  if (level === 3) {
    return (
      <div className="space-y-6">
        <BreadcrumbTrail
          path={breadcrumbPath}
          onNavigate={handleBreadcrumbNavigate}
          level={level}
        />
        {filterBar}
        <Card className="overflow-hidden">
          <div className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-6 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Test Pack No
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Location
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Medium
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Pressure
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    ISOs
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Readiness
                  </TableHead>
                  <TableHead className="px-6 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTestpacks.map((tp) => (
                  <TableRow
                    key={tp.id}
                    onClick={() => handleTestpackClick(tp)}
                    className="cursor-pointer hover:bg-slate-50"
                  >
                    <TableCell className="px-6">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-sky-700">
                          {tp.id}
                        </span>
                        {liveIds.has(tp.id) && (
                          <span className="inline-flex items-center rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-300">
                            LIVE
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-900">
                      {tp.location}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          tp.testMedium === "Hydro" &&
                            "border-sky-300 bg-sky-100 text-sky-800",
                          tp.testMedium === "Pneumatic" &&
                            "border-violet-300 bg-violet-100 text-violet-800",
                          tp.testMedium === "Vacuum" &&
                            "border-cyan-300 bg-cyan-100 text-cyan-800",
                        )}
                      >
                        {tp.testMedium}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-900">
                      {tp.testPressure}
                    </TableCell>
                    <TableCell className="text-sm text-slate-900">
                      {tp.totalIsos}
                    </TableCell>
                    <TableCell>
                      <div className="min-w-[100px] space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium">{tp.readiness}%</span>
                        </div>
                        <Progress value={tp.readiness} className="h-1.5" />
                      </div>
                    </TableCell>
                    <TableCell className="px-6">
                      <span
                        className={cn(
                          "inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium",
                          statusBadgeClasses(tp.status),
                        )}
                      >
                        {tp.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
        {filteredTestpacks.length === 0 && (
          <div className="px-6 py-10 text-center">
            <p className="text-sm font-medium text-slate-900">
              No test packs match the current filters
            </p>
          </div>
        )}
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Level 4: ISO level (Spool Status + Isometric Status)              */
  /* ---------------------------------------------------------------- */
  if (level === 4 && selectedTestpack && selectedIso && selectedIsoIndex >= 0) {
    return (
      <div className="space-y-6">
        <BreadcrumbTrail
          path={breadcrumbPath}
          onNavigate={handleBreadcrumbNavigate}
          level={level}
        />
        {filterBar}
        <IsoLevelView
          testpack={selectedTestpack}
          iso={selectedIso}
          isoIndex={selectedIsoIndex}
          hasPrev={selectedIsoIndex > 0}
          hasNext={selectedIsoIndex < selectedTestpack.isos.length - 1}
          onPrevIso={() => {
            const prev = selectedTestpack.isos[selectedIsoIndex - 1];
            if (prev) setSelectedIsoId(prev.isoNo);
          }}
          onNextIso={() => {
            const next = selectedTestpack.isos[selectedIsoIndex + 1];
            if (next) setSelectedIsoId(next.isoNo);
          }}
        />
        <ReleaseWorkDialog
          open={releaseDialogOpen}
          onOpenChange={setReleaseDialogOpen}
          title={releaseDialogTitle}
          items={releaseDialogItems}
        />
      </div>
    );
  }

  return null;
}
